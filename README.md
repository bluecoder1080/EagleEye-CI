# Autonomous CI/CD Healing Agent — RIFT 2026

## Project Overview

A production-ready, multi-agent Node.js backend that **autonomously detects, diagnoses, and fixes CI/CD pipeline failures**. It clones a repo, runs tests in a Docker sandbox, classifies failures via regex, generates fixes via NVIDIA Qwen LLM, patches files, commits, pushes to a safe branch, and monitors GitHub Actions — all in a retry loop with zero human intervention.

---

## Tech Stack

| Layer            | Technology                                   |
| ---------------- | -------------------------------------------- |
| Runtime          | **Node.js 20**                               |
| Language         | **TypeScript 5.9** (strict mode)             |
| Web Framework    | **Express 5**                                |
| Git Operations   | **simple-git**                               |
| GitHub API       | **@octokit/rest**                            |
| HTTP Client      | **axios**                                    |
| Shell Execution  | **child_process** (Node built-in)            |
| LLM API          | **NVIDIA Qwen** (qwen2.5-coder-32b-instruct) |
| Config           | **dotenv**                                   |
| Containerization | **Docker** (multi-stage Alpine build)        |
| Deployment       | **Railway** compatible                       |

---

## Architecture (21 source files)

```
src/
├── agents/                          # Multi-agent layer
│   ├── healing.agent.ts             #   Agent 0: Legacy workflow healing
│   ├── repo-analyzer.agent.ts       #   Agent 1: Clone repo, detect language/test commands
│   ├── failure-classifier.agent.ts  #   Agent 2: Regex-based failure classification
│   ├── fix-generator.agent.ts       #   Agent 3: NVIDIA Qwen LLM fix generation
│   └── index.ts
├── services/                        # Infrastructure services
│   ├── github.service.ts            #   GitHub API (workflows, issues, PRs)
│   ├── git.service.ts               #   Git operations (clone, branch, commit, push)
│   ├── docker.service.ts            #   Sandboxed Docker test execution
│   ├── shell.service.ts             #   Shell command runner
│   ├── http.client.ts               #   Axios wrapper with interceptors
│   └── index.ts
├── routes/                          # Express routes
│   ├── health.route.ts              #   GET  /health
│   ├── agent.route.ts               #   POST /api/run-agent
│   ├── analyze.route.ts             #   POST /api/analyze
│   └── index.ts
├── utils/                           # Shared utilities
│   ├── config.ts                    #   Type-safe env config
│   ├── logger.ts                    #   Colored structured logger
│   ├── retry.ts                     #   Exponential backoff retry
│   └── index.ts
├── orchestrator.ts                  # Main pipeline orchestrator
└── index.ts                         # Express server entry point
```

---

## Multi-Agent Pipeline

| #   | Agent                      | Role                                                                                                                                             |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **RepoAnalyzerAgent**      | Clones repo to `/tmp`, detects language (Node/Python), auto-detects install & test commands                                                      |
| 2   | **FailureClassifierAgent** | Parses raw test output with 14 regex patterns → classifies into 6 bug types: `LINTING`, `SYNTAX`, `LOGIC`, `TYPE_ERROR`, `IMPORT`, `INDENTATION` |
| 3   | **FixGeneratorAgent**      | Sends failing file + error to NVIDIA Qwen API (temp=0) → returns corrected file content only                                                     |
| 4   | **HealingAgent**           | Workflow-level healing: re-runs CI, creates issues for failures that need manual review                                                          |

---

## Orchestrator Flow

```
Clone repo → Create branch → [Retry Loop]:
  Run tests (Docker sandbox) → Pass? → DONE
  ↓ Fail
  Classify failures → Generate fixes (LLM) → Apply patches
  → Commit "[AI-AGENT] Fix: ..." → Push branch → Monitor CI
  → Still failing? → Next iteration (up to RETRY_LIMIT)
```

---

## API Endpoints

| Method | Path             | Description                                           |
| ------ | ---------------- | ----------------------------------------------------- |
| `GET`  | `/health`        | Health check (uptime, timestamp, version)             |
| `POST` | `/api/run-agent` | Full healing pipeline. Body: `{ repoUrl, dryRun? }`   |
| `POST` | `/api/analyze`   | Analyze-only endpoint. Body: `{ repoUrl, runTests? }` |

---

## Docker Sandbox Security

- `--network none` — no network access
- `--memory 512m` / `--cpus 1` / `--pids-limit 256`
- `--read-only` root filesystem
- Source mounted as **read-only** (`-v path:/app:ro`)
- Tmpfs mounts for writable areas (`node_modules`, `/tmp`, cache)
- Command allowlist (only npm/yarn/pip/pytest permitted)

---

## Output: `results.json`

```json
{
  "repository": "https://github.com/...",
  "teamName": "TEAM_NAME",
  "leaderName": "LEADER_NAME",
  "branch": "TEAM_NAME_LEADER_NAME_AI_Fix",
  "totalFailures": 3,
  "totalFixes": 3,
  "iterations": 2,
  "status": "PASSED | FAILED",
  "timeTaken": 45200,
  "fixes": [
    {
      "file": "...",
      "line": 0,
      "bugType": "...",
      "error": "...",
      "fixApplied": true
    }
  ],
  "timeline": [{ "timestamp": "...", "event": "...", "detail": "..." }]
}
```

---

## Environment Variables

| Variable           | Required | Default                                                | Description                   |
| ------------------ | -------- | ------------------------------------------------------ | ----------------------------- |
| `PORT`             | No       | `3000`                                                 | Server port                   |
| `NODE_ENV`         | No       | `development`                                          | Environment                   |
| `GITHUB_TOKEN`     | **Yes**  | —                                                      | GitHub personal access token  |
| `GITHUB_OWNER`     | **Yes**  | —                                                      | GitHub repository owner       |
| `GITHUB_REPO`      | **Yes**  | —                                                      | GitHub repository name        |
| `NVIDIA_API_URL`   | No       | `https://integrate.api.nvidia.com/v1/chat/completions` | NVIDIA Qwen API endpoint      |
| `NVIDIA_API_KEY`   | No       | —                                                      | NVIDIA API key                |
| `TEAM_NAME`        | No       | `TEAM`                                                 | Team name for branch naming   |
| `LEADER_NAME`      | No       | `LEADER`                                               | Leader name for branch naming |
| `RETRY_LIMIT`      | No       | `5`                                                    | Max healing iterations        |
| `AGENT_TIMEOUT_MS` | No       | `30000`                                                | Agent timeout                 |
| `WEBHOOK_URL`      | No       | —                                                      | External webhook URL          |

---

## Required Credentials

### 1. GitHub Personal Access Token (`GITHUB_TOKEN`)

Required for cloning private repos, pushing fix branches, monitoring CI workflow runs, and creating issues/PR comments.

**How to create:**

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Click **Generate new token**
3. Select repository access (specific repos or all)
4. Grant permissions: **Contents** (read/write), **Actions** (read), **Issues** (read/write), **Pull Requests** (read/write)
5. Copy the token and set it as `GITHUB_TOKEN` in your `.env`

### 2. NVIDIA API Key (`NVIDIA_API_KEY`)

Required for AI-powered fix generation via NVIDIA's hosted Qwen 2.5 Coder 32B model.

**How to create:**

1. Go to [build.nvidia.com](https://build.nvidia.com)
2. Sign up / sign in with an NVIDIA account
3. Navigate to the **Qwen 2.5 Coder 32B Instruct** model page
4. Click **Get API Key** and generate a new key
5. Copy the key and set it as `NVIDIA_API_KEY` in your `.env`

> **Note:** Without `NVIDIA_API_KEY`, the agent can still clone, test, and classify failures but cannot generate fixes automatically.

### 3. Docker (Local)

Docker must be installed and running for sandboxed test execution. The agent falls back to direct shell execution if Docker is unavailable.

- Install from [docker.com](https://www.docker.com/get-started)
- Ensure the Docker daemon is running (`docker info` should succeed)

---

## Key Safety Guardrails

- **Never pushes to main/master** — hard guard in code
- **Branch naming**: `TEAM_NAME_LEADER_NAME_AI_Fix` (uppercase, underscores, no special chars)
- **Commit prefix**: `[AI-AGENT] Fix: <description>`
- **Deterministic LLM output**: temperature=0, top_p=1, markdown stripping
- **Retry with exponential backoff** (default limit: 5)
- **Graceful shutdown** on SIGTERM/SIGINT

---

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
npm start

# Docker
docker build -t cicd-agent .
docker run -p 3000:3000 --env-file .env cicd-agent
```

---

## Deployment (Railway)

1. Push to GitHub
2. Connect repo on [Railway](https://railway.app)
3. Set environment variables in Railway dashboard
4. Railway auto-detects the `Dockerfile` and deploys
