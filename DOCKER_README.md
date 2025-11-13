# 🐳 Docker & GitHub Actions Setup

Quick reference guide for Docker and CI/CD setup. For comprehensive documentation, see [`doc/17-docker-cicd-deployment.md`](./doc/17-docker-cicd-deployment.md).

## 📦 What's Included

- ✅ **Multi-stage Dockerfile** - Optimized for development and production
- ✅ **Docker Compose** - Local development environment
- ✅ **GitHub Actions CI** - Automated testing on pull requests
- ✅ **GitHub Actions CD** - Automated deployment on push to main
- ✅ **Health Check Endpoint** - Container health monitoring
- ✅ **Environment Templates** - Configuration examples

## 🚀 Quick Start

### Local Development with Docker

```bash
# 1. Start Convex backend (required - runs outside Docker)
npx convex dev

# 2. Start frontend in Docker (in another terminal)
npm run docker:dev

# Access: http://localhost:3000
```

### Docker Commands

```bash
# Development
npm run docker:dev              # Start containers
npm run docker:dev:build        # Build and start
npm run docker:dev:down         # Stop containers
npm run docker:logs             # View logs

# Production (local testing)
npm run docker:prod             # Start production mode
npm run docker:prod:build       # Build production
npm run docker:prod:down        # Stop production

# Manual build
npm run docker:build            # Build image only
```

## 📁 Files Structure

```
petshop-convex/
├── Dockerfile                           # Multi-stage build configuration
├── .dockerignore                        # Files excluded from Docker build
├── docker-compose.yml                   # Development setup
├── docker-compose.prod.yml             # Production overrides
├── .env.example                         # Environment template
├── .github/
│   └── workflows/
│       ├── ci.yml                       # CI pipeline
│       └── deploy.yml                   # Deployment pipeline
├── app/
│   └── api/
│       └── health/
│           └── route.ts                 # Health check endpoint
└── doc/
    └── 17-docker-cicd-deployment.md    # Full documentation
```

## ⚙️ Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your Convex credentials:**
   ```env
   CONVEX_DEPLOYMENT=dev:your-deployment-name
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
   JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
   ```

3. **Get Convex URL:**
   ```bash
   npx convex dev
   # Copy the URL from the output
   ```

## 🔄 GitHub Actions Setup

### Required Secrets

Add these in **GitHub Settings → Secrets and Variables → Actions**:

| Secret | Description | How to Get |
|--------|-------------|------------|
| `CONVEX_DEPLOY_KEY` | Convex deployment key (JSON) | `npx convex deployment:key create prod` |
| `CONVEX_DEPLOYMENT` | Production deployment ID | From Convex dashboard |
| `NEXT_PUBLIC_CONVEX_URL` | Production Convex URL | From Convex dashboard |
| `JWT_PRIVATE_KEY` | Production JWT key | Generate with `npx @convex-dev/auth` |

### Workflows

**CI Workflow** (`.github/workflows/ci.yml`):
- Triggers: Pull requests to `main` or `develop`
- Jobs: Lint, type-check, build, Docker build test, security audit

**Deploy Workflow** (`.github/workflows/deploy.yml`):
- Triggers: Push to `main` branch
- Jobs: Deploy Convex, build Docker image, deploy to production, health check

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                 GitHub Actions                      │
│  ┌──────────────┐         ┌──────────────┐        │
│  │  CI Pipeline │         │Deploy Pipeline│        │
│  │  (on PR)     │         │  (on push)    │        │
│  └──────────────┘         └──────────────┘        │
└─────────────────────────────────────────────────────┘
                    │                    │
                    ▼                    ▼
┌──────────────────────┐    ┌──────────────────────┐
│   Convex Backend     │    │  Docker Container    │
│   (Cloud-hosted)     │◄───│  (Next.js Frontend)  │
│   - Database         │    │  - Port 3000         │
│   - Server Functions │    │  - Health checks     │
└──────────────────────┘    └──────────────────────┘
```

**Important:** Convex backend is cloud-hosted and cannot run in Docker. Only the Next.js frontend is containerized.

## 🔍 Health Check

The application includes a health check endpoint at `/api/health`:

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Response:
{
  "status": "ok",
  "timestamp": "2025-11-13T...",
  "uptime": 123.456,
  "environment": "development"
}
```

Used by:
- Docker health checks (every 30s)
- Load balancers
- Monitoring systems
- GitHub Actions deployment verification

## 🐛 Troubleshooting

### Container won't start
```bash
docker-compose logs frontend
# Check for port conflicts or missing env vars
```

### Convex connection issues
```bash
npx convex status
# Verify NEXT_PUBLIC_CONVEX_URL is correct
```

### Build fails
```bash
docker builder prune -a
npm run docker:dev:build
```

### GitHub Actions fails
- Check repository secrets are set correctly
- Verify Convex deploy key is valid JSON
- Review workflow logs in Actions tab

## 📚 Documentation

For detailed information, see:
- **Full Guide**: [`doc/17-docker-cicd-deployment.md`](./doc/17-docker-cicd-deployment.md)
- **Installation**: [`doc/02-installation-guide.md`](./doc/02-installation-guide.md)
- **Project Overview**: [`doc/01-project-overview.md`](./doc/01-project-overview.md)

## 🔐 Security Notes

**⚠️ NEVER commit these files:**
- `.env.local`
- `.env.production`
- Any file containing actual secrets

**✅ Safe to commit:**
- `.env.example` (template only)
- Docker configuration files
- GitHub Actions workflows

**🔒 Best Practices:**
- Use different JWT keys for dev/staging/production
- Rotate credentials periodically
- Use GitHub Secrets for CI/CD variables
- Enable branch protection rules

## 📞 Support

For issues:
1. Check [`doc/17-docker-cicd-deployment.md`](./doc/17-docker-cicd-deployment.md)
2. Review [`doc/15-faq-troubleshooting.md`](./doc/15-faq-troubleshooting.md)
3. Check Docker logs: `npm run docker:logs`
4. Open GitHub issue

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-13
