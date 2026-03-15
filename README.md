# TaskNest

A personal task manager built with Next.js 15, organized by categories and areas of life.

## Setup with Docker

### 1. Clone the repo

```bash
git clone <repo-url>
cd task-manager
```

### 2. Build the image

```bash
docker build -t task-manager .
```

### 3. Run the container

```bash
docker run -d \
  --name task-manager-container \
  -p 9002:9002 \
  -v ~/personal_task_manager:/data \
  task-manager
```

The app will be available at **http://localhost:9002**.

Data is persisted in `~/personal_task_manager/` on the host — tasks and categories survive container restarts.

### 4. Stop / remove

```bash
docker stop task-manager-container
docker rm task-manager-container
```
