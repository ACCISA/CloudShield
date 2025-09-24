# CloudShield – SOEN 490 Capstone Project

## Continuous Integration (CI)
_To be added…_

---

## Release Demos & Milestones

Planned milestones tied to architecture and deployment deliverables:

| Deliverable   | Due Date           | Link to Demo Video |
|---------------|-------------------|--------------------|
| Release 1     | November 10th, 2025 | [...]              |
| Release 2     | January 26th, 2026 | [...]              |
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

# Python backend
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt

# Web UI
cd webui && npm ci && cd ..

# Desktop UI
cd desktop && npm ci && cd ..
```

---

### Configure Cloud Credentials

```bash
aws configure sso --profile cloudshield-dev
aws sso login --profile cloudshield-dev

export AWS_PROFILE=cloudshield-dev
export AWS_DEFAULT_REGION=us-east-1
```

Backend services use Python SDKs to provision EC2/S3/VPC including AMI builds. Credentials must be configured.  

MongoDB should be run locally or via a managed cluster.  

---

### Running Services Locally

**Backend**  
```bash
pytest
python -m backend.app
```

**Web UI**  
```bash
cd webui
npm run dev
```

**Desktop UI**  
```bash
cd desktop
npm run start
```

---

### OpenVPN to VPC (Dev/Test)

```bash
wget https://git.io/vpn -O openvpn-install.sh
sudo chmod +x openvpn-install.sh
sudo bash openvpn-install.sh
```

Add VPC routes in `/etc/openvpn/server/server.conf` and enable IP forwarding:  
```bash
# push "route 172.31.0.0 255.255.240.0"
# push "route 172.31.32.0 255.255.240.0"
sudo sysctl -w net.ipv4.ip_forward=1
```

Employees can then RDP to workstations via private IPs.  

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
