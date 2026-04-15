# Nginx 独立部署网关与前端加速缓存指南

在基于分布式的 New API 架构中，将 Nginx 从主节点的项目中抽离出来，**独立部署在一台服务器或集群项目上**，是大型系统最经典的做法。

这种做法有两种截然不同的战术目的：
1. 作为全解耦的「全能路由中心」（反向代理集群负载）
2. 作为跨国加速的「前置边缘缓存节点」（国内动静分离加速）

本文档将详细说明这两种用法的核心原理和配置实现。

---

## 方案一：独立部署为「全能路由中心」

如果你有运维洁癖，或者需要一个统一管理旗下所有 API 的总入口，你可以将 Nginx 彻底从 Zeabur 主项目中拆出。

### 核心区别
* 如果 Nginx 与主节点部署在**同一个 Zeabur 项目**中，它可以利用 `xxxx.zeabur.internal:3000` 进行光速无损耗的**内网互联**。
* 如果 Nginx 被**孤立部署**在另一台机器或另一个项目中，它将**失去内网特权**。它必须访问主节点在互联网上公开的域名（例如 `main.zeabur.app:443`），这会增加极小一部分的网络握手延迟。

### 架构优势
* **极度解耦**：Nginx 项目独立存活。即使主节点的项目被误删、或者你想全盘将主节点迁移到阿里云，这个 Nginx 网关都不受影响，你只需改一行配置的指向，外部用户的请求甚至不会中断。
* **统一调度**：这台 Nginx 可以不仅负责 New API，顺便还能通过分区域路由负责你的个人博客或网站。

### Nginx 配置文件

建立好独立的 Nginx 服务器后，将你的**总域名**解析到这台机器，并在其 `conf.d/default.conf` 写入：

```nginx
upstream new_api_cluster {
    # 失去内网优势后，主节点也必须通过外网公网域名联通
    server main.zeabur.app:443 weight=3;   
    server us-edge.zeabur.app:443 weight=5; 
}

server {
    listen 80;
    server_name www.你的总域名.com;

    location / {
        proxy_pass https://new_api_cluster; # 转发到上方定义好的集群池
        proxy_set_header Host $proxy_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 禁用缓冲以适配大模型 SSE 流式输出
        proxy_buffering off;
        proxy_cache off;
    }
}
```

---

## 方案二：独立部署为「跨国前置边缘缓存加速节点」

因为 New API 面临着业务的强合规与特殊属性，主服务器往往部署在**海外**以确保大模型的连通性；但你的目标受众可能在**国内**，忍受着高延迟的跨海网络。

利用这一方案，你可以在国内部署一台极小带宽的廉价服务器运行 Nginx，只缓存大体积的前端静态文件（HTML/JS/CSS/图表），从而实现**首屏秒开**。

### 架构优势
经过部署后：
1. 国内用户访问网站时，所有可视化的界面（高达几十MB的代码与素材），全部由**国内本地机房秒速吐给浏览器**。
2. 只有当用户发出实际对话时，那条几KB的文字 JSON 数据才会被放行，瞬间跨洋传给海外主机。海外主机处理后，也仅回传轻量的字符流即可。

### Nginx 配置文件 (动静分离加速)

国内服务器环境在配置前需要划拨一块硬盘区域，并加入区分静态资产（缓存）与动态接口（实穿透）的强切割规则。

```nginx
# 预先在机器硬盘上划出一块 1GB 的空间当做前端加速硬盘缓存
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=newapi_cache:10m max_size=1g inactive=24h use_temp_path=off;

server {
    listen 80;
    server_name www.你的国内域名.com;

    # ==========================================
    # 策略 1：拦截所有的静态资源（前端界面）并硬盘缓存
    # ==========================================
    # 拦截后缀为各种图片、脚本的文件
    location ~* \.(jpg|jpeg|gif|png|css|js|ico|woff|woff2|ttf|svg|html)$ {
        # 如果缓存里没有，就去海外原站拿
        proxy_pass https://海外原始newapi集群的域名.com;
        proxy_set_header Host $proxy_host;
        
        # 激活缓存开关并强制存入硬盘库 'newapi_cache'
        proxy_cache newapi_cache;
        
        # 容灾：如果国外服务器炸了或网络被切断断开连接，Nginx 会自动读取硬盘里的旧页面发送给用户
        proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
        
        # 强制将这些巨型文件缓存 1 天
        proxy_cache_valid 200 304 24h;
        proxy_ignore_headers Cache-Control Expires Set-Cookie;
        
        # 在 HTTP Response Header 里做上记号，方便 F12 调试是否命中 (看到 HIT 表示是从国内拉的)
        add_header X-Cache-Status $upstream_cache_status; 
    }

    # ==========================================
    # 策略 2：动态请求、纯后端接口，坚决不准缓冲，直接穿透出海
    # ==========================================
    # 包含 api 与核心对话模型的 v1 路由
    location ~ ^/(api|v1)/ {
        proxy_pass https://海外原始newapi集群的域名.com;
        proxy_set_header Host $proxy_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 【极其重要】关闭缓存和缓冲卡主，保证 AI 对话长流打字机平滑无抖动
        proxy_cache off;
        proxy_buffering off;
        
        # 因为跨洋推理可能会较慢，重设超时阈值为10分钟，避免 Nginx 把大模型挂断
        proxy_read_timeout 600s;     
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
    }

    # ==========================================
    # 策略 3：首页或者其他杂项请求（底线兜底）
    # ==========================================
    location / {
        proxy_pass https://海外原始newapi集群的域名.com;
        proxy_set_header Host $proxy_host;
        proxy_cache off;
        proxy_buffering off;
    }
}
```

通过这一策略，单台国内廉价服务器也能硬抗巨量 C 端并发访问！

---

## 方案三：双剑合璧（前端加速缓存 + 跨国集群分发池）

如果你的业务非常庞大，在海外甚至部署了多台 New API（例如一个**主节点** `main.zeabur.app`，和一个**美国子节点** `us-edge.zeabur.app`），你完全可以在国内这台 Nginx 上，同时融合**缓存加速**与**负载均衡分发**！

这是一种“既要、又要”的终极架构。

### 终极 Nginx 配置文件

在这个配置中，我们保留了动静分离法则，但在所有需要访问海外服务器的地方，不再硬编码单一域名，而是扔给一个 `upstream` 负载池。

```nginx
# 1. 在国内定义前端加速硬盘缓存空间
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=newapi_cache:10m max_size=1g inactive=24h use_temp_path=off;

# 2. 【重点！】在这里把你的海外主节点和子节点都挂上来！
upstream overseas_cluster {
    server main.zeabur.app:443 weight=3;   # 海外第一台（如亚洲区）
    server us-edge.zeabur.app:443 weight=5; # 海外第二台（如美国区）
}

server {
    listen 80;
    server_name www.你的国内域名.com;

    # =============== 策略 1：拦截前端拿去缓存 ===============
    location ~* \.(jpg|png|css|js|html)$ {
        # 【重点！】如果发现硬盘里没有缓存，Nginx 去海外谁拿？
        # 它会按照 3:5 的概率，随机去下面两个节点里抽一个节点拉取静态文件
        proxy_pass https://overseas_cluster; 
        
        proxy_set_header Host $proxy_host;
        proxy_cache newapi_cache;
        proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
        proxy_cache_valid 200 304 24h;
        proxy_ignore_headers Cache-Control Expires Set-Cookie;
        add_header X-Cache-Status $upstream_cache_status; 
    }

    # =============== 策略 2：API 动态对话穿透 ===============
    location ~ ^/(api|v1)/ {
        # 【重点！】国内用户发了一条聊天消息，Nginx 怎么走？
        # 它依然会严格按照 3:5 的权重进行发牌分发，确保任何一台海外机器都不会被单独压垮。
        proxy_pass https://overseas_cluster;
        
        proxy_set_header Host $proxy_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_cache off;
        proxy_buffering off;
        proxy_read_timeout 600s;     
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
    }

    # =============== 策略 3：杂项兜底 ===============
    location / {
        proxy_pass https://overseas_cluster;
        
        proxy_set_header Host $proxy_host;
        proxy_cache off;
        proxy_buffering off;
    }
}
```

### 终极架构优势：
这台位于国内机房的 Nginx，同时兼任了**静态资源的吸尘器**（把一切拖慢速度的大资源全存在国内服务器硬盘里秒发给用户），并在幕后充当了前往海外拉取数据的**总调度中心**，决定把少数出海的 API 请求按权重公平地塞给你的主节点或各个子节点！
