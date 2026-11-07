# Online Judge Platform: System Design & Defensibility Manual

This document provides a comprehensive, interview-defensible architectural breakdown of the Online Judge platform. It details design rationale, security threat models, isolation boundaries, and scaling strategies for evaluating untrusted user-submitted code in production.

---

## 1. High-Level Architecture

The platform decouples synchronous HTTP ingestion from asynchronous sandboxed execution using an event-driven queue pipeline:

```
[ Web Browser ]
      |
      |  (HTTP REST / Polling)
      v
+-------------------------------------------------------------+
| Express API Gateway (Node.js + TypeScript)                  |
|  - Rate Limiting (express-rate-limit: 5 sub / 30s)          |
|  - Payload Size Guards (Zod: 64KB max source code)          |
|  - JWT Authentication & RBAC (Admin vs. Contestant)         |
|  - Filter hidden test cases at DB layer                     |
+-------------------------------------------------------------+
      |                                              |
      | 1. Writes PENDING Submission                 | 2. Enqueues Job
      v                                              v
+-------------------------+             +-------------------------+
| PostgreSQL 16 (Prisma)  |             | Redis 7 + BullMQ Queue  |
| - Users & Submissions   |             | - Stream: submission-q  |
| - Problems & Test Cases |             | - AOF durability        |
+-------------------------+             +-------------------------+
      ^                                              |
      | 5. Persists Verdict & Metrics               | 3. Dequeues Job (Concurrency: 2)
      |                                              v
+-------------------------------------------------------------+
| Background Worker Engine (Node.js Service)                  |
|  - Marks status to PROCESSING                               |
|  - Mounts ephemeral source directory (.temp/sandboxes)      |
|  - Spawns isolated Docker container (gcc:latest)            |
|  - Dual-layer Timeout: GNU timeout + Node.js watchdog       |
|  - Zombie Container Sweeper & Resource Reaping              |
+-------------------------------------------------------------+
```

---

## 2. Architectural Trade-Off Analysis

| Architecture | Isolation Strength | Cold-Start Latency | Operational Overhead | Resource Footprint | Interview Defense Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ephemeral Docker Sandbox + BullMQ** *(Our Choice)* | **High (Container namespaces + cgroups)** | **~350ms - 800ms** (using pre-pulled base images) | **Minimal** (Single host Docker daemon, no orchestration needed) | **Low** (Containers share host kernel, zero idle memory) | **Optimal balance of production security, cost efficiency, and interview comprehensibility.** |
| **MicroVMs (AWS Firecracker / Kata)** | **Extreme** (Hardware virtualization per submission) | **~5ms - 50ms** microVM boot | **Very High** (Requires bare-metal Linux with KVM virtualization; cannot run inside standard VMs or cloud Docker hosts without nested virt) | **Moderate** (Dedicated kernel per microVM) | Industry gold standard (AWS Lambda / Judge0 Enterprise), but overkill and impossible on standard containerized cloud instances without KVM access. |
| **Kubernetes Jobs (`batch/v1`)** | **High** (Container namespaces) | **~2s - 5s** (Pod scheduling, kubelet mount, network attachment overhead) | **Extremely High** (Control plane, etcd, CNI, CSI, API server load during high submission bursts) | **Heavy** (Kubelet daemon, sidecars, apiserver serialization) | Excessive latency for 1-second competitive programming feedback loops. Pod scheduling churn degrades API server under 1,000 req/min bursts. |
| **Raw Host `child_process` + `chroot`** | **Critical Security Flaw** | **< 10ms** | **Low** | **Extremely Low** | **Unacceptable for untrusted code.** Vulnerable to kernel privilege escalation, filesystem traversal (`chroot` escape via open file descriptors), network scanning, and cgroup bypasses. |

### Why Docker + BullMQ is the Defensible Choice
1. **Predictable Cold Start**: Base compiler image `gcc:latest` is pre-cached on the host. Spawning an ephemeral container takes <400ms, meeting competitive programming expectations.
2. **True Kernel-Enforced Boundaries**: Linux namespaces (`pid`, `net`, `ipc`, `mnt`, `uts`) combined with cgroups v2 resource limits enforce physical caps directly at the OS kernel level.
3. **Controllable Concurrency**: BullMQ provides deterministic backpressure. The worker node strictly processes $N$ containers at a time, completely shielding the host system from CPU starvation.

---

## 3. Attack Threat Model & Defense-in-Depth Matrix

Untrusted C++ execution presents multiple attack vectors. The sandbox enforces strict multi-layered defenses:

| Threat Vector | Attack Scenario | Sandbox Countermeasure & Implementation | Enforced Verdict |
| :--- | :--- | :--- | :--- |
| **Network Exfiltration / SSRF** | Submission attempts to connect to `169.254.169.254` (cloud metadata), internal Redis (`6379`), or Postgres (`5432`) to exfiltrate keys. | `--network none`<br>Container has no network interfaces attached other than loopback `lo`. Socket calls fail with `ENETUNREACH`. | `RUNTIME_ERROR` or `ACCEPTED` |
| **Filesystem Tampering / Disk Flooding** | Solution writes gigabytes of junk files or attempts to modify `/etc/shadow` or host binary paths. | `--read-only`<br>Root container filesystem is strictly read-only.<br>`-v <sandboxDir>:/sandbox:ro`<br>Mounted source directory is read-only.<br>`--tmpfs /tmp:rw,noexec,nosuid,size=16m`<br>Volatile in-memory scratch space capped at 16MB. | `RUNTIME_ERROR` |
| **Memory Allocation Bomb** | User executes `new char[10ULL * 1024 * 1024 * 1024]` or iterates large arrays to starve host RAM. | `--memory 256m --memory-swap 256m`<br>Hard cgroup memory ceiling. Swap is disabled (set equal to memory limit). OS kernel OOM-killer immediately terminates the process with signal `SIGKILL` (exit code 137). | `MEMORY_LIMIT_EXCEEDED` |
| **Fork Bomb / Process Starvation** | Code executes `while(true) fork();` to exhaust host PID tables and freeze the operating system. | `--pids-limit 64`<br>Linux cgroups reject process creation when count reaches 64. Fork calls return `EAGAIN`. Host remains completely responsive. | `TIME_LIMIT_EXCEEDED` or `RUNTIME_ERROR` |
| **Infinite Loop / CPU Hang** | Code executes `while(true);` or algorithmic lockups. | **Dual-Layer Timeout**:<br>1. Inner: GNU `/usr/bin/timeout -k 0.2s ${timeLimit}s ./solution`<br>2. Outer: Host Node.js watchdog timer calling `docker kill <containerName>` after $T + 2500\text{ms}$. | `TIME_LIMIT_EXCEEDED` |
| **Compiler Bomb / Memory Hog** | Deep macro recursion (`#define A A A`), huge template metaprogramming expansions, or massive files. | 1. Ingestion: Zod rejects source code $> 64\text{KB}$ with HTTP 413.<br>2. Compiler sandbox: Execution capped at 10s and 512MB RAM with `-O2 -std=c++17`. | `COMPILATION_ERROR` |
| **Zombie Container Leaks** | Worker crashes while a container is executing, or child process throws abruptly. | 1. Idempotent container names: `oj-run-<submissionId>-<tcIndex>`.<br>2. Guaranteed `finally` cleanup: `docker rm -f <name>`.<br>3. Background Sweeper: Startup + periodic sweeper reaps any lingering `oj-` containers. | N/A (Guaranteed Host Recovery) |

---

## 4. Queue Backpressure & High-Traffic Scaling Strategies

### A. Non-Blocking Fast Ingestion
When a contestant submits code:
1. `express-rate-limit` validates that the user has submitted $\le 5$ times in the current 30-second window.
2. Zod validates payload boundaries (valid UUID, non-empty code $\le 64\text{KB}$, recognized language).
3. The API writes a row to PostgreSQL with status `PENDING` and pushes `{ submissionId }` to BullMQ in **$< 100\text{ms}$**.
4. The client receives HTTP `201 Created` with the submission ID and begins lightweight status polling.

### B. Worker Concurrency Bounding
- If 1,000 contestants submit simultaneously (e.g., at the start of a contest), the Express API accepts all 1,000 jobs into Redis memory without CPU degradation.
- Workers pull jobs according to a strictly configured concurrency limit:
  $$\text{Concurrency} = \min(\text{Host CPU Cores} - 1, \; 4)$$
- This prevents CPU context-switching thrashing and ensures running containers have access to their guaranteed 1.0 CPU quota.

### C. Horizontal Scaling Strategy
```
                     +---------------------------------------+
                     |         Redis 7 Cluster (BullMQ)       |
                     +---------------------------------------+
                                  /            \
           Job Dispatch (FIFO)   /              \   Job Dispatch (FIFO)
                                v                v
                +-------------------+        +-------------------+
                |  Worker Node 1    |        |  Worker Node 2    |
                |  (Concurrency: 4) |        |  (Concurrency: 4) |
                +-------------------+        +-------------------+
```
1. **Stateless Workers**: Worker instances do not store persistent state. Adding additional worker nodes to the Redis stream scales throughput linearly.
2. **Autoscaling Metric**: Dynamic auto-scaling can trigger based on BullMQ's queue depth:
   $$\text{Scale Target} = \left\lceil \frac{\text{waitingJobs}}{\text{TargetQueueLatency} \times \text{AvgJobDuration}} \right\rceil$$
3. **Queue Durability**: Redis is configured with `--appendonly yes` and `--maxmemory-policy noeviction`, ensuring submission records in transit survive broker restarts.

---

## 5. Ephemeral Resource Lifecycle & Clean Teardown

Every submission follows a deterministic lifecycle with strict cleanup guarantees:

```
[ Job Dequeued ]
       |
       v
Create Directory: .temp/sandboxes/oj-run-<submissionId>-<timestamp>
       |
       +---> Compile Stage: `docker run --name oj-run-<subId>-compile gcc:latest ...`
       |     `finally`: `docker rm -f oj-run-<subId>-compile`
       |
       +---> Execution Stage: Sequential evaluation against hidden test cases
       |     `docker run --name oj-run-<subId>-tc<index> gcc:latest ...`
       |     `finally`: `docker rm -f oj-run-<subId>-tc<index>`
       |
       v
`finally` of `runSubmission`:
Recursive directory deletion (`fs.rm` with 3 retries for Windows file handle locks)
       |
       v
Update DB Verdict & Performance Metrics -> Release BullMQ Job
```

### Zombie Container & Temp Sweeper
- **Startup Sweeper**: Whenever the worker service launches, it inspects `docker ps -a --filter name=oj-` and forcefully removes any lingering containers from previous process crashes.
- **Periodic Sweeper**: A background timer runs every 30 seconds to clean up containers and purge temporary directories older than 5 minutes.
- **Graceful Shutdown**: On `SIGINT` or `SIGTERM`, workers stop accepting new jobs, wait for in-flight container runs to finish, disconnect Prisma and Redis, and release all host resources cleanly.

