# Docker Basics for Interviews

## What is Docker?

**Simple Definition:** Docker is a platform that packages your application with all its dependencies into a **container** that can run anywhere.

**Real-World Analogy:** Think of a shipping container - you can put anything inside it, and it will fit on any ship, truck, or train. Similarly, Docker containers can run on any system that has Docker installed.

**Why Docker?**
- **"Works on my machine" problem solved** - If it works in a container, it works everywhere
- **Isolation** - Each container runs independently
- **Lightweight** - Shares OS kernel, unlike VMs
- **Fast** - Starts in seconds vs minutes for VMs
- **Consistent** - Same environment in dev, staging, and production

---

## Core Concepts

### 1. Image vs Container

**Image:**
- **What:** Blueprint/template (like a class)
- **Contains:** Application code + dependencies + OS libraries
- **Immutable:** Once created, doesn't change
- **Example:** `node:18-alpine` - Node.js 18 on Alpine Linux

**Container:**
- **What:** Running instance of an image (like an object)
- **Contains:** Running application with isolated filesystem, network, processes
- **Mutable:** Can be stopped, started, deleted
- **Example:** Your Node.js app running in a container

**Analogy:** Image = Recipe, Container = Cooked dish

### 2. Dockerfile

**What:** Text file with instructions to build a Docker image

**Structure:**
```dockerfile
# Base image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Command to run when container starts
CMD ["node", "server.js"]
```

**Key Instructions:**
- `FROM` - Base image to start with
- `WORKDIR` - Set working directory
- `COPY` - Copy files from host to container
- `RUN` - Execute commands during build
- `EXPOSE` - Document which port app uses
- `CMD` - Default command when container starts
- `ENV` - Set environment variables

### 3. Docker Architecture

```
┌──────────────────────────────────────────┐
│           Docker Client (CLI)            │
│    (You type: docker run, docker build)  │
└───────────────┬──────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────┐
│          Docker Daemon (Server)          │
│   - Builds images                        │
│   - Runs containers                      │
│   - Manages volumes, networks            │
└───────────────┬──────────────────────────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│   Images    │   │ Containers  │
└─────────────┘   └─────────────┘
```

### 4. Container vs VM

**Virtual Machine:**
```
┌─────────────────────────────────┐
│          Application            │
├─────────────────────────────────┤
│         Guest OS (GB)           │
├─────────────────────────────────┤
│         Hypervisor              │
├─────────────────────────────────┤
│         Host OS                 │
├─────────────────────────────────┤
│         Hardware                │
└─────────────────────────────────┘
Size: GBs, Boot: Minutes
```

**Docker Container:**
```
┌─────────────────────────────────┐
│          Application            │
├─────────────────────────────────┤
│      Container Runtime          │
├─────────────────────────────────┤
│         Host OS                 │
├─────────────────────────────────┤
│         Hardware                │
└─────────────────────────────────┘
Size: MBs, Boot: Seconds
```

**Key Difference:** Containers share the host OS kernel, VMs have their own OS.

---

## Essential Docker Commands

### Image Commands

```bash
# Pull image from Docker Hub
docker pull node:18-alpine

# List images
docker images

# Build image from Dockerfile
docker build -t myapp:v1 .

# Remove image
docker rmi myapp:v1

# Tag image
docker tag myapp:v1 username/myapp:v1

# Push to Docker Hub
docker push username/myapp:v1
```

### Container Commands

```bash
# Run container
docker run -d -p 3000:3000 --name myapp myapp:v1
# -d: detached (background)
# -p: port mapping (host:container)
# --name: container name

# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Stop container
docker stop myapp

# Start stopped container
docker start myapp

# Remove container
docker rm myapp

# View logs
docker logs myapp
docker logs -f myapp  # Follow logs

# Execute command in running container
docker exec -it myapp sh
# -it: interactive terminal
# sh: shell command

# View container details
docker inspect myapp

# View container resource usage
docker stats myapp
```

### Cleanup Commands

```bash
# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove everything (containers, images, networks, volumes)
docker system prune -a
```

---

## Docker Compose

**What:** Tool to define and run multi-container applications using a YAML file.

**Why:** Instead of running multiple `docker run` commands, define everything in one file.

**Example: Node.js + MongoDB + Redis**

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  # Node.js application
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mongodb
      - REDIS_HOST=redis
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./logs:/app/logs

  # MongoDB database
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=secret

  # Redis cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mongo-data:
```

**Docker Compose Commands:**
```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs
docker-compose logs app  # Specific service

# Rebuild images
docker-compose build

# Scale service
docker-compose up -d --scale app=3
```

**Benefits:**
- Single command to start entire stack
- Services can communicate using service names
- Automatic network creation
- Easy to version control

---

## Docker Volumes (Data Persistence)

**Problem:** When container stops, all data inside is lost.

**Solution:** Volumes - persistent storage outside container.

**Types:**

**1. Named Volumes (Recommended)**
```bash
# Create volume
docker volume create mydata

# Use in container
docker run -v mydata:/app/data myapp

# List volumes
docker volume ls

# Inspect volume
docker volume inspect mydata
```

**2. Bind Mounts (Development)**
```bash
# Mount host directory to container
docker run -v $(pwd):/app myapp

# Changes in host directory reflect in container immediately
# Useful for development (hot reload)
```

**3. Anonymous Volumes**
```bash
# Docker creates random volume name
docker run -v /app/data myapp
```

**When to Use:**
- **Named volumes:** Production databases, logs
- **Bind mounts:** Development, sharing config files
- **Anonymous volumes:** Temporary data

---

## Docker Networking

**Default Networks:**
```bash
# Bridge network (default for containers)
# Containers can communicate using container names

# Host network
# Container uses host's network directly

# None network
# No network access
```

**Create Custom Network:**
```bash
# Create network
docker network create mynetwork

# Run containers on same network
docker run --network mynetwork --name app1 myapp
docker run --network mynetwork --name app2 myapp

# app1 can reach app2 using hostname "app2"
```

**Why Custom Networks?**
- Containers can communicate using service names (DNS)
- Isolation from other containers
- Better security

---

## Dockerfile Best Practices

### 1. Use Specific Image Tags
```dockerfile
# ❌ Bad - version can change
FROM node

# ✅ Good - locked version
FROM node:18-alpine
```

### 2. Multi-Stage Builds (Smaller Images)
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/server.js"]

# Result: Only production files in final image
```

### 3. Layer Caching (Faster Builds)
```dockerfile
# ❌ Bad - copies code first, then installs
COPY . .
RUN npm install

# ✅ Good - installs first, caches if package.json unchanged
COPY package*.json ./
RUN npm install
COPY . .
```

### 4. Use .dockerignore
```
# .dockerignore file
node_modules
npm-debug.log
.git
.env
Dockerfile
README.md
```

### 5. Run as Non-Root User
```dockerfile
# Create user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Switch to user
USER appuser

# Now container runs with limited privileges
```

### 6. Minimize Layers
```dockerfile
# ❌ Bad - multiple RUN commands
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y vim

# ✅ Good - combine in single RUN
RUN apt-get update && \
    apt-get install -y curl vim && \
    rm -rf /var/lib/apt/lists/*
```

---

## Common Interview Questions

### Q1: Docker vs VM - Explain the difference

**Answer:**
"Docker containers are lightweight because they share the host OS kernel, while VMs have their own OS. This makes containers:
- **Faster to start:** Seconds vs minutes
- **Smaller:** MBs vs GBs
- **More efficient:** Can run more containers than VMs on same hardware

However, VMs provide **stronger isolation** since they have separate OS. For most web applications, Docker's isolation is sufficient and much more efficient."

### Q2: What happens when you run `docker run`?

**Answer:**
"When you run `docker run`:
1. Docker checks if image exists locally
2. If not, pulls from Docker Hub
3. Creates a new container from the image
4. Allocates a filesystem and network interface
5. Starts the container and runs the CMD specified in Dockerfile

Example: `docker run -p 3000:3000 node-app` maps host port 3000 to container port 3000 and starts the application."

### Q3: How to debug a container that's crashing?

**Answer:**
"Several approaches:
1. **View logs:** `docker logs container-name`
2. **Check exit code:** `docker ps -a` shows exit code
3. **Override CMD:** `docker run -it image-name sh` to get shell
4. **Inspect:** `docker inspect container-name` shows configuration
5. **Events:** `docker events` shows real-time Docker events

Most common issues are missing environment variables, wrong file paths, or port conflicts."

### Q4: How to persist data in Docker?

**Answer:**
"Use **volumes** for data persistence:
- **Named volumes:** `docker run -v mydata:/app/data` - managed by Docker
- **Bind mounts:** `docker run -v $(pwd):/app` - maps host directory

Volumes survive container deletion. Best practice: use named volumes for databases and important data, bind mounts for development."

### Q5: What is Docker Compose and when to use it?

**Answer:**
"Docker Compose is a tool to define multi-container applications in a YAML file. Instead of running multiple docker commands, you define all services, networks, and volumes in `docker-compose.yml` and run with `docker-compose up`.

**Use when:**
- Application needs multiple services (app + database + cache)
- Want to version control entire environment
- Need to easily share setup with team
- Running in development or staging (production uses Kubernetes)"

### Q6: How to reduce Docker image size?

**Answer:**
"Key strategies:
1. **Use Alpine base images:** `node:18-alpine` instead of `node:18`
2. **Multi-stage builds:** Build in one stage, copy artifacts to smaller final image
3. **.dockerignore:** Exclude unnecessary files
4. **Minimize layers:** Combine RUN commands
5. **Remove cache:** `RUN npm install --production` and clean apt cache

Example: A Node.js image can go from 1GB to 100MB using these techniques."

### Q7: Docker in production - what changes?

**Answer:**
"Key differences:
1. **Orchestration:** Use Kubernetes or Docker Swarm instead of docker-compose
2. **Image registry:** Private registry instead of local images
3. **Logging:** Centralized logging (ELK stack, CloudWatch)
4. **Monitoring:** Prometheus + Grafana for metrics
5. **Secrets:** Docker secrets or Kubernetes secrets, not environment variables
6. **Auto-scaling:** Based on CPU/memory usage
7. **Health checks:** Liveness and readiness probes
8. **CI/CD:** Automated builds and deployments"

---

## Real-World Example: Containerizing Node.js App

**Project Structure:**
```
myapp/
├── src/
│   └── server.js
├── package.json
├── Dockerfile
├── .dockerignore
└── docker-compose.yml
```

**Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
EXPOSE 3000
USER node
CMD ["node", "src/server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=mongodb
    depends_on:
      - mongodb
  
  mongodb:
    image: mongo:6
    volumes:
      - db-data:/data/db

volumes:
  db-data:
```

**Commands:**
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## Key Takeaways

✅ **Docker solves "works on my machine"** - Consistent environment everywhere
✅ **Containers are lightweight** - Share OS kernel, start in seconds
✅ **Dockerfile defines image** - Step-by-step instructions
✅ **Volumes persist data** - Survive container deletion
✅ **Docker Compose for multi-container** - Define entire stack in YAML
✅ **Alpine images are smaller** - Prefer for production
✅ **Multi-stage builds reduce size** - Build artifacts separately

**Interview Tip:** Focus on understanding **why** Docker exists and **when** to use it, not just commands. Be ready to explain benefits and trade-offs.
