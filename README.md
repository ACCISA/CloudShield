# CloudShield – SOEN 490 Capstone Project

## Product Demo
[Product Demo CloudShield](https://www.youtube.com/watch?v=qUKorVDk9l8)

## Deployed Product
real.encs.concordia.ca

## Continuous Integration (CI)
This project uses **GitHub Actions** for automated CI on all pull requests and pushes to `main`. The pipeline builds both the **React frontend** and **Python backend** using **Docker Compose** to ensure consistent local environments, runs **Jest** and **Pytest** test suites, and performs **SonarCloud** analysis for code quality and coverage. While deployment to AWS is planned for future stages, the current CI ensures stable builds, reproducible tests, and continuous feedback on every code change.

---

## Release Presentations & Milestones

Planned milestones tied to architecture and deployment deliverables:

| Deliverable   | Due Date           | Link to Demo Video |
|---------------|-------------------|--------------------|
| Release 1     | November 10th, 2025 | [Release 1 Presentation](https://drive.google.com/file/d/1rAsPDtUeL0hQ-TLDfsKU7SzleGgU_tOf/view?usp=sharing)     |
| Release 2     | January 26th, 2026 | [Release 2 Presentation](https://drive.google.com/file/d/1vD48VnW8qFSvEJJUhmCrJunkLWd8Zhc6/view?usp=sharing)      |
| Final Release | April 13th, 2026   | [...]              |

---

## Project Summary

**CloudShield** is a Security-as-a-Service (SECaaS) platform that delivers secure, cloud-connected workstations for SMBs, simplifying complex IT management and removing the need for a dedicated IT team. It provides virtual desktops (or physical machines provisioned with an agent), connects workstations to a private intranet, enforces endpoint security (antivirus, disk encryption, RBAC), sends real-time incident alerts and monthly audits, integrates AI-driven anomaly detection, and offers a simple web UI for devices, services, policies, employees, and authentication—while abstracting operations on AWS/Azure through provider SDKs.

---

## Developer Getting Started Guide

### Project Scope & Vision
CloudShield has four main components:  

1. **Web UI (ITAM, provisioning, policy management)**  
   - Admins sign up an org, add employees, provision virtual workstations, assign access, and view security data.  

2. **Desktop UI (Electron + React)**  
   - Employees log in, the app opens an OpenVPN tunnel, then connects to the workstation over RDP.  
   - Electron is used so the app can perform OS-level actions like launching RDP.  

3. **Backend Cloud Services**  
   - Python services use provider SDKs (AWS/Azure) to create EC2 VMs, configure VPC networking, and wire S3 storage.  
   - Samba Active Directory with roaming profiles for consistent user experience across workstations.

4. **IAM, Security & Threat Detection**  
   - RBAC/SSO for tenants.  
   - Lightweight agent forwards logs/metrics for anomaly detection and alerts.  

---

### Prerequisites
- **Backend/Cloud:** Python + AWS SDKs (AMI/VPC/EC2/S3 lifecycle).  
- **Web UI:** React (+ Python backend).  
- **Desktop UI:** React + Electron + RDP.  
- **Identity/Data:** MongoDB (for IAM/Web UI).  
- **Cloud Access:** AWS account with permissions for EC2, S3, VPC.  

---

### Clone & Set Up Environments

```bash
# Clone repository
git clone <https://github.com/ACCISA/CloudShield>
cd <repo>

# Python backend (Unix/Linux)
python -m venv .venv && source .venv/bin/activate
cd cloudshield/Agent
pip install -r requirements.txt
python main.py

# Python backend (Windows)
python -m venv
.venv/Scripts/activate
cd cloudshield/Agent
pip install -r requirements.txt
python main.py

# Web UI
cd webui && npm ci && cd ..

# Desktop UI
cd desktop && npm ci && cd ..
```

---

### Configure Cloud Credentials && Mongo URL

```bash
aws configure sso --profile cloudshield-dev
aws sso login --profile cloudshield-dev

export AWS_PROFILE=cloudshield-dev
export AWS_DEFAULT_REGION=us-east-1
export MONGO_URL=<>
export MONGO_DB=<>
```

Optionally, you can plase these env variables in .env at the root directory.
Note: 
Backend services use Python SDKs to provision EC2/S3/VPC including AMI builds. Credentials must be configured.  
MongoDB should be run locally or via a managed cluster.  

---

### Running Services Locally with Docker Compose
The best way to run all services without managing dependencies manually is by using Docker Compose. It also allows you to run individual services independently while developing.

1. Install docker compose (Linux)
```bash
sudo apt-get update
mkdir -p ~/.docker/cli-plugins;
curl -SL https://github.com/docker/compose/releases/download/v2.36.2/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose

docker compose version
```

2. Build containers
```bash
docker compose build
or
docker compose build <service>
```

3. Run containers
```bash
docker compose run
docker compose run <service>
```

4. Enter containers for debug
```
docker ps # get the container id
docker exec -it <container_id> bash
```

Cloudshield will hold all necessary files and states in /var/lib/cloudshield/

### Local API Developement

To optimize resource utilization and developer feedback loops, all development and testing of domain-controller-interacting APIs is performed locally using containerized environments (Docker). For provisioning, we now utilize a custom script via the provision endpoint, effectively replacing the cloud-based Terraform provisioner. This mechanism facilitates the rapid deployment of necessary containers, decoupling the development process from cloud infrastructure provisioning latency, thereby ensuring a quicker, more cost-effective development workflow.

```
docker network create --driver bridge --subnet 172.23.0.0/24 vpc_net
docker compose build api-test
docker compose run api-test
```
You can test the API by connecting to the apit-test container's IP address. Full details regarding the provisioned containers and their configuration are available in the docker-compose.yml file.

---

### First End-to-End Smoke Test

1. From Web UI (as admin): create org and add employee.  
2. Provision workstation → backend creates VM with hardened AMI.  
3. Map org storage (S3 storage).  
4. Employee logs in from Desktop UI → OpenVPN tunnel → RDP to workstation.  

---

### Notes on Images & Storage
- **Images:** Workstations launch from hardened AMIs with CloudShield Agent.  
- **Storage:** Organization data stored in S3, exposed as mapped drives.  

---

## Testing, CI, and Internal Dashboards

- Tests must run locally and in CI (GitHub Actions).  
- Automated test coverage tracked as work items.  
- Platform metrics/logs wired to Grafana/Prometheus dashboards.  
- Monthly security audit reports included as deliverables.  

---

## Project Board

[GitHub Project Board](https://github.com/users/ACCISA/projects/2)

---

## Wiki table of contents

### Governance & Policy
- [Meeting Minutes](https://github.com/ACCISA/CloudShield/wiki/Meeting-Minutes)
- [Risks](https://github.com/ACCISA/CloudShield/wiki/Risks)
- [User consent and end-user license agreement](https://github.com/ACCISA/CloudShield/wiki/User-consent-and-end%E2%80%90user-license-agreement)
- [Legal and Ethical issues](https://github.com/ACCISA/CloudShield/wiki/Legal-and-Ethical-issues)

### Business & People
- [Economic](https://github.com/ACCISA/CloudShield/wiki/Economic)
- [Budget](https://github.com/ACCISA/CloudShield/wiki/Budget)
- [Personas](https://github.com/ACCISA/CloudShield/wiki/Personas)
- [Diversity statement](https://github.com/ACCISA/CloudShield/wiki/Diversity-Statement)

### Architecture & Engineering
- [Overall Architecture and Class Diagrams](https://github.com/ACCISA/CloudShield/wiki/Overall-Architecture-and-Class-Diagrams)
- [Infrastructure and tools](https://github.com/ACCISA/CloudShield/wiki/Infrastructure-and-tools)
- [Name Conventions](https://github.com/ACCISA/CloudShield/wiki/Name-Conventions)

### Quality, Security & Operations
- [Testing Plan and Continuous Integration](https://github.com/ACCISA/CloudShield/wiki/Testing-Plan-and-Continuous-Integration)
- [Security](https://github.com/ACCISA/CloudShield/wiki/Security)
- [Performance](https://github.com/ACCISA/CloudShield/wiki/Performance)

### Delivery
- [Deployment Plan and Infrastructure](https://github.com/ACCISA/CloudShield/wiki/Deployment-Plan-and-Infrastructure)
- [Missing knowledge and Independent Learning](https://github.com/ACCISA/CloudShield/wiki/Missing-knowledge-and-Independent-Learning)
