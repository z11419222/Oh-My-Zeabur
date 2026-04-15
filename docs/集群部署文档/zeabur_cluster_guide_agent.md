# New API Zeabur Cluster Deployment and Configuration Guide

## 1. Architectural Overview

This guide details the implementation of a Multi-Region High Availability (HA) cluster for New API natively on the Zeabur platform, utilizing a Reverse Proxy (Nginx) for centralized load balancing.

The architecture consists of three logical tiers:
1.  **State Persistence Tier:** Centralized PostgreSQL and Redis instances hosted in the primary region.
2.  **Application Tier:** Multiple New API instances distributed across regions (Master and Slave nodes).
3.  **Routing Tier:** An Nginx instance functioning as an L7 Application Load Balancer (ALB).

### Core Principles for Node Coordination

Horizontal scaling of New API across disparate infrastructure regions relies on remote state sharing. To ensure node parity and prevent divergent states, all instances within the cluster must bind to identical environmental configurations:

*   `SQL_DSN`: Central PostgreSQL URI.
*   `REDIS_CONN_STRING`: Central Redis URI.
*   `SESSION_SECRET`: Uniform cryptographic salt for JWT/Cookie validation natively.
*   `CRYPTO_SECRET`: Uniform symmetric encryption key for secure payload handling.
*   `NODE_TYPE`: The authoritative identifier (`master` vs `slave`) dictating background task execution rights.

### Preventing Distributed Brain-Split Errors
New API executes asynchronous chron-jobs (e.g., quota verification, batch channel testing, redemption logging). Concurrent execution of these jobs across multiple disparate nodes will induce database deadlocks and race conditions.
**Constraint:** All secondary external nodes must be parameterized with the execution flag `NODE_TYPE=slave`. This strictly limits the node to stateless request forwarding and JWT validation, deferring all stateful asynchronous modifications to the single `master` node.

---

## 2. Deployment Implementation Steps

### Phase 1: Deploy Primary Infrastructure (Master Zone)
Deploy the stateful dependencies and the central routing mechanism within the primary Zeabur region.

1.  Execute deployment utilizing the `zeabur-cluster-master.yaml` template. This provisions PostgreSQL, Redis, New API (Master), and the Nginx LB service.
2.  Navigate to the Zeabur Networking Interface for both the PostgreSQL and Redis services.
3.  Activate the **Expose Port** configuration for both components.
4.  Capture the generated public egress URIs. Formulate the connection strings:
    *   **PostgreSQL DSN Formulation:** `postgresql://postgres:<PASSWORD>@<PUBLIC_IP>:<PUBLIC_PORT>/new-api`
    *   **Redis URI Formulation:** `redis://default:<PASSWORD>@<PUBLIC_IP>:<PUBLIC_PORT>`
5.  Extract and record the values generated for `SESSION_SECRET` and `CRYPTO_SECRET` from the Master API environment variables.

### Phase 2: Deploy Edge Infrastructure (Slave Zone)
Deploy the stateless proxy node in the secondary geographic region.

1.  Initialize a separate Zeabur project within the desired target region (e.g., US-West).
2.  Execute deployment utilizing the `zeabur-cluster-slave.yaml` template.
3.  Populate the configuration prompt with the aggregated parameters from Phase 1 (Database DSN, Redis URI, Configured Secrets).
4.  Ensure `NODE_TYPE` remains hardcoded or set to `slave`.
5.  Allocate a public-facing domain to this edge service via the Zeabur Networking Interface (e.g., `us-edge-node.zeabur.app`).
6.  *Verification:* Access the provisioned edge domain to confirm parity with the master datastore.

### Phase 3: Instantiate Nginx Upstream Configuration
Finalize the traffic routing matrix at the primary ingress layer.

1.  Return to the Zeabur project hosting the Master Zone.
2.  Locate the provisioned Nginx LB service.
3.  Modify the service environment variables: locate the parameter designated as `SLAVE_NODE_URL`.
4.  Inject the FQDN generated during Phase 2 (e.g., `us-edge-node.zeabur.app:443`).
5.  Restart the Nginx service to execute a configuration reload.

## 3. Nginx Upstream Routing Logic

The Nginx configuration template programmatically establishes an `upstream` pool. 
By utilizing the Weighted Round Robin algorithm, incoming requests intercepted at the global ingress domain are load-balanced across the defined cluster targets.

**Technical Configuration Matrix:**
```nginx
upstream new_api_cluster {
    # Internal inter-container routing via internal Zeabur network logic (Zero public latency)
    server new-api.zeabur.internal:3000 weight=3;

    # Public-routing egress to the configured Slave FQDN Fowarding Target
    server <SLAVE_NODE_URL> weight=5;
}
```
**Failover Strategy:** If the edge FQDN target results in a timeout or socket exception, Nginx is inherently configured to retry the request against the remaining healthy targets within the upstream matrix before throwing a `502 Bad Gateway` standard exception to the initial client.
