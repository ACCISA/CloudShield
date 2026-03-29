# Container Hardening Guide

## Overview

This document provides best practices and a checklist for hardening Docker containers in CloudShield. It's designed to support both development and production deployments, with specific emphasis on production security.

---

## Container Security Principles

### 1. **Minimal Base Images**
- Use `-slim` or `-alpine` variants instead of full OS images
- Reduces attack surface and image size
- Example: `python:3.10-slim` instead of `python:3.10`

### 2. **Pinned Dependency Versions**
- Always pin package versions in Dockerfiles for reproducibility
- Prevents unexpected security vulnerabilities from updates
- Example: `python -m pip install pip==24.0` (not just `pip`)

### 3. **Non-Root User Execution**
- Never run processes as root
- Create dedicated application user with minimal privileges
- Example:
  ```dockerfile
  RUN groupadd -r app && useradd -r -g app -u 1000 app
  USER app
  ```

### 4. **Multi-Stage Builds**
- Separate build dependencies from runtime environment
- Eliminates build tools from final image
- Reduces image size and attack surface
- Example:
  ```dockerfile
  FROM python:3.11-slim AS builder
  # ... build steps ...
  FROM python:3.11-slim
  COPY --from=builder /opt/venv /opt/venv
  ```

### 5. **Explicit Permission Management**
- Use `chown` and `chmod` to enforce proper permissions
- Ensure application directories are readable/writable only by app user
- Example:
  ```dockerfile
  RUN chown -R app:app /app && chmod 755 /app
  ```

### 6. **Health Checks**
- Always include `HEALTHCHECK` directive
- Enables orchestrators to detect and restart unhealthy containers
- Example:
  ```dockerfile
  HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
  ```

### 7. **No Secrets in Images**
- Never commit API keys, passwords, or secrets
- Use build arguments (`ARG`) with defaults, or environment variables at runtime
- Validate `.dockerignore` to exclude sensitive files

### 8. **Minimal System Packages**
- Install only runtime dependencies (not build tools)
- Use `--no-install-recommends` for `apt-get`
- Clean package manager caches after installation
- Example:
  ```dockerfile
  RUN apt-get update && \
      apt-get install -y --no-install-recommends curl && \
      apt-get clean && rm -rf /var/lib/apt/lists/*
  ```

---

## Development vs. Production

### Development (`Dockerfile` / default compose)
- Allows source code mounting via volumes
- Includes development tools (pip, npm, debuggers)
- Runs on localhost with relaxed network policies
- May include hot-reload and live-debugging capabilities

### Production (`Dockerfile.prod` / `docker-compose.prod.yml`)
- Immutable build with all code pre-included
- Minimal runtime-only dependencies
- Read-only application code
- Security hardening applied (non-root, health checks, etc.)
- Resource limits configured
- Network policies enforced

---

## CloudShield Container Hardening Checklist

### ✅ Build-Time Checks

- [ ] **Base Image Version Pinned**
  - Use specific Python version: `python:3.11-slim` not `python:latest`
  - Rationale: Prevents unexpected breaking changes and vulnerabilities

- [ ] **Multi-Stage Build Implemented**
  - Build dependencies in separate stage (builder as)
  - Runtime stage copies only compiled artifacts/venv
  - Rationale: Reduces final image size and removes build tools

- [ ] **Dependencies Pinned**
  - `pip install pip==24.0 setuptools==69.2.0` (exact versions)
  - Run `pip freeze > requirements.txt` and commit it
  - Rationale: Ensures reproducible builds and prevents supply-chain attacks

- [ ] **Build Cache Optimized**
  - COPY requirements first, before source code
  - Rationale: Allows Docker layer cache to skip reinstalling deps if code changes

- [ ] **System Packages Minimized**
  - Only install packages needed at runtime (no build tools)
  - Use `--no-install-recommends` with apt-get
  - Example: Don't include `gcc`, `make` in runtime stage
  - Rationale: Reduces attack surface and image size

- [ ] **Package Manager Cache Cleaned**
  - After `apt-get install`, run `apt-get clean && rm -rf /var/lib/apt/lists/*`
  - Rationale: Prevents cached data leaks and reduces image size

- [ ] **.dockerignore Updated**
  - Excludes `.git`, `node_modules`, `*.iso`, `*.log`, etc.
  - Rationale: Reduces build context and prevents accidental inclusion of sensitive data

### ✅ Runtime Security

- [ ] **Non-Root User Created**
  - Create user: `RUN groupadd -r app && useradd -r -g app -u 1000 app`
  - Switch to user: `USER app` (last in Dockerfile)
  - Rationale: Limits blast radius if container is compromised

- [ ] **File Ownership Correct**
  - Use `--chown=app:app` with COPY commands
  - Rationale: Ensures app user owns application files, not root

- [ ] **Directory Permissions Restricted**
  - Application directories: `chmod 755` (rwxr-xr-x)
  - Sensitive data: `chmod 750` (rwxr-x---)
  - Rationale: Prevents unauthorized access

- [ ] **Read-Only Filesystem**
  - Application code should be read-only
  - Only `/tmp`, `/var/log` writable (if needed)
  - Rationale: Prevents tampering and unexpected modifications

- [ ] **Environment Variables Validated**
  - No hardcoded secrets (passwords, keys, tokens)
  - Use ENV for configuration, not sensitive data
  - Rationale: Prevents accidental exposure in image layers

- [ ] **Health Check Configured**
  - Every image has `HEALTHCHECK` directive
  - Check appropriate for service (HTTP /health endpoint, gRPC probe, etc.)
  - Rationale: Enables orchestrators to monitor and auto-restart containers

- [ ] **Resource Limits Set** (in compose/orchestrator)
  - Memory limits: `512M` for services, `256M` for minimal services
  - CPU limits: `0.5` to `2.0` cores depending on workload
  - File descriptor limits configured
  - Rationale: Prevents resource exhaustion attacks and runaway processes

### ✅ Networking & Exposure

- [ ] **Port Exposure Intentional**
  - Only `EXPOSE` required ports
  - Do not expose debug/management ports (e.g., 9200 for Elasticsearch)
  - Rationale: Reduces attack surface via port scanning

- [ ] **Network Isolation** (in compose)
  - Use custom bridge networks (not `host` network)
  - Restrict inter-service communication with network policies
  - Example:
    ```yaml
    networks:
      vpc_net:
        ipv4_address: 172.23.0.2
    ```
  - Rationale: Prevents lateral movement if one service is compromised

- [ ] **TLS/mTLS Where Applicable**
  - Inter-service communication encrypted (gRPC with TLS)
  - External APIs use HTTPS
  - Rationale: Prevents eavesdropping and man-in-the-middle attacks

### ✅ Logging & Monitoring

- [ ] **Logs Directed to stdout/stderr**
  - Applications log to stdout (not files)
  - Container orchestrator captures and persists logs
  - No sensitive data in logs (passwords, tokens)
  - Rationale: Enables centralized log aggregation and analysis

- [ ] **Container Image Scanned**
  - Use Trivy or similar tool to scan for known CVEs
  - Fix vulnerabilities before deployment
  - Example: `trivy image cloudshield/app:latest`
  - Rationale: Identifies and prevents deployment of vulnerable images

### ✅ Deployment

- [ ] **Immutable Deployment**
  - Production containers built once, deployed as-is
  - No runtime code updates or package installations
  - Rationale: Ensures consistency and auditability

- [ ] **Image Registry Authenticated**
  - Private registry behind authentication
  - Only authorized users can push/pull images
  - Rationale: Prevents tampering and unauthorized access

- [ ] **Image Signing & Verification**
  - Consider Docker Content Trust or similar
  - Verify image signatures before deployment
  - Rationale: Prevents supply-chain attacks via image tampering

- [ ] **CI/CD Integration**
  - Container build automated in CI pipeline
  - Security scans run as part of CI before merge
  - Images tagged with commit SHA
  - Rationale: Ensures auditability and prevents manual errors

---

## Quick Reference: Dev vs. Prod Build Commands

### Development
```bash
# Build dev image (with volumes for live editing)
docker build -t cloudshield/api-dev:latest -f docker/Dockerfile.api .

# Run with volumes for live code reloading
docker compose up api
```

### Production
```bash
# Build prod image (hardened, multi-stage)
docker build -t cloudshield/api:1.0.0 -f docker/Dockerfile.api.prod .

# Tag and push to registry
docker tag cloudshield/api:1.0.0 your-registry/cloudshield/api:1.0.0
docker push your-registry/cloudshield/api:1.0.0

# Scan for vulnerabilities
trivy image cloudshield/api:1.0.0

# Deploy using prod compose
docker compose -f docker-compose.prod.yml up
```

---

## Common Hardening Issues & Solutions

### Issue: Image too large
**Solution:** Use multi-stage build to exclude build dependencies

### Issue: Permission denied errors at runtime
**Solution:** Ensure `chown` is applied correctly and app user has read/execute on necessary directories

### Issue: Secrets leaked in image layers
**Solution:** Use `--secret` flag in buildkit or ensure secrets are mounted at runtime, not copied

### Issue: No health status feedback
**Solution:** Add `HEALTHCHECK` directive with appropriate test command

### Issue: Containers run as root
**Solution:** Create non-root user and switch with `USER` directive

---

## References & Further Reading

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [NIST Container Security Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-190.pdf)
- [Trivy Vulnerability Scanner](https://github.com/aquasecurity/trivy)

---

## PR Review Checklist

When reviewing PRs that touch Dockerfiles, verify:

- [ ] Base image is specific version (not `latest`)
- [ ] Multi-stage build used for Python/Node apps
- [ ] Non-root user configured
- [ ] Health check present
- [ ] No secrets in Dockerfile or `.dockerignore` updated
- [ ] Dependencies pinned (if applicable)
- [ ] Build layer cache optimized (requirements copied first)
