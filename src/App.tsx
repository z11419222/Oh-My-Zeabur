import { Layout, Nav, Button, Dropdown, Avatar, Tag, Space, Typography, Select } from '@douyinfe/semi-ui';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { IconUpload, IconHistory, IconList, IconSetting, IconBell, IconHelpCircle } from '@douyinfe/semi-icons';
import { DeployPage } from './pages/DeployPage';
import { HistoryPage } from './pages/HistoryPage';
import { TemplatePage } from './pages/TemplatePage';
import { SettingsPage } from './pages/SettingsPage';
import { useEffect } from 'react';
import { useI18n } from './hooks/useI18n';
import { useDeploymentStore } from './store/deploymentStore';
import './App.css';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useI18n();
  const initializeZeaburKeys = useDeploymentStore((state) => state.initializeZeaburKeys)

  useEffect(() => {
    document.body.setAttribute('theme-mode', 'dark');
    void initializeZeaburKeys()
  }, [initializeZeaburKeys]);

  const handleNavClick = (data: { itemKey?: string | number }) => {
    if (typeof data.itemKey === 'string') {
      navigate(data.itemKey);
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/deploy': return t('pageDeployments');
      case '/history': return t('pageHistory');
      case '/template': return t('pageTemplates');
      case '/settings': return t('pageSettings');
      default: return 'MirrorZeabur';
    }
  };

  return (
    <Layout className="layout-container">
      <Sider className="layout-sider">
        <Nav
          defaultSelectedKeys={[location.pathname === '/' ? '/deploy' : location.pathname]}
          style={{ height: '100%' }}
          onClick={handleNavClick}
          header={{
            logo: <div style={{ width: 24, height: 24, background: 'var(--semi-color-primary)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', fontSize: 14 }}>M</div>,
            text: 'MirrorZeabur'
          }}
          items={[
            { itemKey: '/deploy', text: t('navDeploy'), icon: <IconUpload /> },
            { itemKey: '/history', text: t('navHistory'), icon: <IconHistory /> },
            { itemKey: '/template', text: t('navTemplate'), icon: <IconList /> },
            { itemKey: '/settings', text: t('navSettings'), icon: <IconSetting /> },
          ]}
          footer={{
            collapseButton: true,
          }}
        />
      </Sider>
      <Layout>
        <Header className="layout-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Text strong style={{ fontSize: 14, color: 'var(--semi-color-text-0)' }}>{t('project')}</Text>
            <Text type="tertiary">/</Text>
            <Text strong style={{ fontSize: 14, color: 'var(--semi-color-text-0)' }}>{getPageTitle()}</Text>
            <Tag color="green" style={{ marginLeft: 8, borderRadius: 4 }}>{t('production')}</Tag>
          </div>
          <Space spacing={16}>
            <Select value={language} onChange={(value) => setLanguage(value as 'zh-CN' | 'en-US')} style={{ width: 120 }} size="small">
              <Select.Option value="zh-CN">中文</Select.Option>
              <Select.Option value="en-US">English</Select.Option>
            </Select>
            <Button theme="borderless" type="tertiary" icon={<IconHelpCircle />} />
            <Button theme="borderless" type="tertiary" icon={<IconBell />} />
            <Dropdown
              render={
                <Dropdown.Menu>
                  <Dropdown.Item>{t('profile')}</Dropdown.Item>
                  <Dropdown.Item>{t('billing')}</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item>{t('logout')}</Dropdown.Item>
                </Dropdown.Menu>
              }
            >
              <Avatar size="small" color="blue" style={{ margin: 4, cursor: 'pointer' }}>AD</Avatar>
            </Dropdown>
          </Space>
        </Header>
        <Content className="layout-content">
          <div className="page-container">
            <Routes>
              <Route path="/" element={<DeployPage />} />
              <Route path="/deploy" element={<DeployPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/template" element={<TemplatePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
