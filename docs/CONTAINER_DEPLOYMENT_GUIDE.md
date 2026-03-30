# Container Strategy & Deployment Guide

## Overview

CloudShield uses a **split strategy** for container definitions to optimize for both developer experience and production security. This document explains the approach, benefits, and how to use each deployment model.

---

## Architecture: Dev vs. Prod Split

### Directory Structure
```
docker/
├── Dockerfile.api              # Development build (default)
├── Dockerfile.api.prod         # Production hardened build
├── Dockerfile.server           # Development build (default)
├── Dockerfile.server.prod      # Production hardened build
├── Dockerfile.agent            # Development build (default)
├── Dockerfile.agent.prod       # Production hardened build
├── Dockerfile.ui               # Development build (default)
├── Dockerfile.ui.prod          # Production hardened build
├── supervisord.conf            # Supervisor config
└── ...

docker-compose.yml             # Development stack (default)
docker-compose.prod.yml        # Production stack (hardened)
```

---

## Development Workflow

### Use Case
- Local development with hot-reload
- Rapid testing and debugging
- Minimal security constraints
- Developer-friendly experience

### Build Command
```bash
docker compose build
```

### Run Command
```bash
docker compose up
# Or specific services:
docker compose up api ui redis
```

### Characteristics
- **Base images**: Standard Python/Node versions (flexible)
- **Volumes**: Source code mounted for live editing
- **Users**: Can run as root (convenience)
- **Dependencies**: All development tools included
- **Logging**: Verbose output to console
- **Resource limits**: None (consume what you need)
- **Network**: All services accessible for debugging

### Example: Editing API code
```bash
# Terminal 1: Start containers with volumes
docker compose up api redis

# Terminal 2: Edit code
vim cloudshield/Server/routes/auth.py

# Container auto-reloads (if Flask debug mode is configured)
# Test changes immediately
```

---

## Production Deployment

### Use Case
- Hardened images for security compliance
- Resource-constrained environments
- Orchestrated deployment (Kubernetes, Docker Swarm)
- CI/CD pipeline integration

### Build Command
```bash
docker compose -f docker-compose.prod.yml build

# Or build individual images for push to registry
docker build -t cloudshield/api:1.0.0 -f docker/Dockerfile.api.prod .
docker build -t cloudshield/ui:1.0.0 -f docker/Dockerfile.ui.prod .
```

### Run Command
```bash
# Set required environment variables
export MONGO_URL="mongodb://prod-cluster:27017"
export JWT_SECRET="$(openssl rand -base64 32)"
export REDIS_PASSWORD="$(openssl rand -base64 32)"

# Deploy production stack
docker compose -f docker-compose.prod.yml up -d

# Monitor service health
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f api
```

### Deploy with Profiles
```bash
# Deploy core services (api, ui, threat-detection)
docker compose -f docker-compose.prod.yml --profile default up -d

# Also deploy infrastructure (Elasticsearch, etc.)
docker compose -f docker-compose.prod.yml --profile infra up -d
```

### Characteristics
- **Base images**: Pinned to specific version (`python:3.11-slim`, not `latest`)
- **Multi-stage builds**: Build dependencies excluded from final image
- **Non-root users**: Applications run as dedicated `app` user (UID 1000+)
- **Health checks**: Every service has `HEALTHCHECK` directive
- **Resource limits**: CPU/memory caps configured per service
- **Read-only filesystems**: Application code marked read-only where possible
- **Logging**: JSON-file driver with rotation (max-size, max-file)
- **Security**: `no-new-privileges=true`, proper file permissions
- **Network**: Localhost bindings where possible, isolated networks

---

## Production Security Features

### Multi-Stage Builds
**Before**: Final image included all build tools (gcc, make, npm dev deps)
**After**: Build happens in separate stage; runtime image has only final app

**Size reduction**: ~50-70% smaller images

### Non-Root User
**Before**: Applications ran as `root` (if container compromised, attacker has full access)
**After**: All apps run as dedicated user (`app`, `agent`, `web` with UID 1000+)

**Security benefit**: Limits blast radius of container escape

### Pinned Dependencies
**Before**: Requirements installed with flexible versions (Python 3.11, pip latest)
**After**: Every dependency pinned exactly (pip==24.0, setuptools==69.2.0)

**Reproducibility**: Same code always builds same image, prevents CVE surprises

### Health Checks
**Before**: Container restart required manual intervention
**After**: Orchestrators (Docker, K8s) auto-restart failed containers

**Reliability**: Self-healing deployments

### Resource Limits
**Before**: One runaway service could consume all resources, DoSing others
**After**: Each service has CPU/memory limits

**Example**:
```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
    reservations:
      cpus: '0.5'
      memory: 256M
```

---

## Migration Path: Dev to Prod

### Step 1: Build Prod Images
```bash
docker compose -f docker-compose.prod.yml build
```

### Step 2: Tag for Registry
```bash
docker tag cloudshield/api:latest your-registry/cloudshield/api:1.0.0
docker tag cloudshield/ui:latest your-registry/cloudshield/ui:1.0.0
docker tag cloudshield/threat-detection:latest your-registry/cloudshield/threat-detection:1.0.0
```

### Step 3: Scan for Vulnerabilities
```bash
trivy image your-registry/cloudshield/api:1.0.0
trivy image your-registry/cloudshield/ui:1.0.0
```

### Step 4: Push to Registry
```bash
docker push your-registry/cloudshield/api:1.0.0
docker push your-registry/cloudshield/ui:1.0.0
docker push your-registry/cloudshield/threat-detection:1.0.0
```

### Step 5: Deploy
```bash
docker pull your-registry/cloudshield/api:1.0.0
docker compose -f docker-compose.prod.yml up -d
```

---

## Environment Variables

### Production Required
```bash
# Database
export MONGO_URL="mongodb://user:pass@host:27017"
export MONGO_DB="cloudshield"

# Security
export JWT_SECRET="$(openssl rand -base64 32)"
export JWT_ISS="https://cloudshield.io"
export JWT_AUD="cloudshield-api"
export JWT_EXPIRE_SECONDS="3600"

# Redis (production should require password)
export REDIS_PASSWORD="$(openssl rand -base64 32)"

# Email
export EMAIL_ENABLED="true"
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="your-email@gmail.com"
export SMTP_PASSWORD="your-app-password"
export SMTP_FROM="noreply@cloudshield.io"
export SMTP_USE_TLS="true"

# APIs
export GEMINI_API_KEY="your-api-key"
export CLOUDSHIELD_SERVER_URL="https://api.cloudshield.io"

# Deployment
export VERSION="1.0.0"
export TZ="UTC"
```

### Secrets Management Best Practices
- **Never** commit secrets to `.git`
- Use environment variables or secret management systems (Vault, AWS Secrets Manager)
- Rotate API keys regularly
- Use `.env` files locally (add `.env` to `.gitignore`)
- In production, use orchestrator secret mounting (Kubernetes Secrets, Docker Secrets)

---

## Troubleshooting

### Container Won't Start in Prod
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs api

# Common issues:
# - Missing environment variables (JWT_SECRET, MONGO_URL)
# - Non-root user permission issues (check file ownership)
# - Health check failing (verify service is actually running)
```

### Permission Denied Errors
```bash
# Root cause: Non-root user doesn't have permission to directory
# Solution: Ensure file ownership correct in Dockerfile
# Example:
# RUN chown -R app:app /app && chmod 755 /app
```

### Image Size Too Large
```bash
# Root cause: Build dependencies in final layer
# Solution: Use multi-stage build (already in .prod Dockerfiles)
# Verify:
docker images cloudshield/api
# prod image should be ~30-50% smaller than dev image
```

### Network Connectivity Issues
```bash
# Prod uses isolated networks (vpc_net, cloudshield_net)
# Services can only reach other services in same network
# Verify connectivity:
docker exec cs-api-prod ping redis
# Should work (both in vpc_net)
docker exec cs-ui-prod ping elasticsearch
# May fail (different networks) - use correct network config
```

---

## Monitoring & Logging

### Check Service Health
```bash
docker compose -f docker-compose.prod.yml ps

# Example output:
# NAME         STATE     PORTS
# cs-api-prod  running   5050/tcp
# cs-ui-prod   running   5173/tcp
```

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs

# Specific service with tail
docker compose -f docker-compose.prod.yml logs -f --tail 100 api

# Timestamps and colors
docker compose -f docker-compose.prod.yml logs -f --timestamps api
```

### Container Resource Usage
```bash
docker stats cs-api-prod

# Shows: CPU%, Memory, Memory Limit, etc.
```

---

## Next Steps: Orchestrated Deployment

For production deployments beyond Docker Compose:

1. **Kubernetes**: Use `docker-compose.prod.yml` as reference; generate K8s manifests
2. **Docker Swarm**: Deploy stack with `docker stack deploy -c docker-compose.prod.yml`
3. **AWS ECS**: Register task definitions based on `.prod` Dockerfiles
4. **CI/CD**: Integrate image builds into GitHub Actions/GitLab CI

Refer to respective orchestrator docs for details.

---

## References

- [Container Hardening Checklist](./CONTAINER_HARDENING.md)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose File Reference](https://docs.docker.com/compose/compose-file/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
