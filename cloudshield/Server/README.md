# Server

**Server** is the core **API backend** of the platform responsible for managing infrastructure-related operations such as provisioning, configuration, and teardown of cloud environments.  
It exposes RESTful endpoints used by the **WebUI** to enqueue tasks, which are then processed asynchronously by worker services through a **Redis-based task queue**.

---

## Overview

The **Server** component acts as the orchestration layer between the WebUI and the infrastructure workers.  
It receives API requests from the administrator interface, pushes corresponding jobs into a Redis queue, and delegates execution to background workers that handle the actual provisioning, networking, and system configuration tasks.

This design decouples the user-facing API from the long-running infrastructure processes, ensuring scalability and reliability.

---

## Features

- **Task Queue Architecture:** Uses Redis to enqueue tasks for background workers.  
- **Worker Integration:** The `worker.py` service continuously reads tasks from the Redis queue and executes infrastructure commands.  
- **Cloud & Network Automation:** Manages cloud instances, VPCs, and other network resources.  
- **SSH Tunnel Creation:** Automatically creates secure SSH tunnels for configuring VPNs, domain controllers, and related services.  
- **API-Driven Operations:** Designed to serve requests from the WebUI or other trusted components.  
- **Scalable and Fault-Tolerant:** Tasks are retried and logged to ensure reliable execution across distributed systems.  

---

## API Endpoints

### `POST /task/provision`
Creates and enqueues a provisioning task for a given organization.

**Request Body:**
```json
{
  "org_id": "string"
}
```
**Description:**
Provisions the required cloud infrastructure (e.g., VPC, workstations, or VPN gateway) for the specified organization.


### `POST /task/destroy`

Destroys and decommissions the cloud resources associated with an organization.

**Request Body:**
```json
{
  "org_id": "string"
}
```

**Description:**
Deletes all infrastructure resources tied to the organization’s environment.

### `POST /task/dc/add_user`

Adds a new user to the organization’s domain controller.

**Request Body:**
```json
{
  "org_id": "string",
  "username": "string",
  "password": "string"
}
```

**Description:**
Creates a domain user on the organization’s Active Directory or equivalent domain controller system.


## Running with Docker Compose

To build and run the API service with Docker Compose:
```
docker compose build api
docker compose run api
```
This will:
- Build the Docker image for the API service
- Start the API container connected to the shared Redis service defined in your docker-compose.yml
