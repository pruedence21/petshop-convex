# 🚀 Docker & CI/CD Deployment Guide

This guide covers Docker containerization and automated deployment setup for the Pet Shop Management System using Docker Compose and GitHub Actions.

## 📋 Table of Contents

1. [Docker Setup](#docker-setup)
2. [Local Development with Docker](#local-development-with-docker)
3. [Production Deployment with Docker](#production-deployment-with-docker)
4. [GitHub Actions CI/CD](#github-actions-cicd)
5. [Environment Configuration](#environment-configuration)
6. [Troubleshooting](#troubleshooting)

---

## 🐳 Docker Setup

### Prerequisites

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Node.js 18+** (for local Convex development)

### Architecture Overview

**Important:** This system uses a **hybrid architecture**:
- ✅ **Frontend (Next.js)**: Runs in Docker container
- ❌ **Backend (Convex)**: Cloud-hosted service (cannot be containerized)

The Convex backend is a fully managed cloud service. Docker only handles the Next.js frontend application.

### Files Structure

```
petshop-convex/
├── Dockerfile                    # Multi-stage build for Next.js
├── .dockerignore                 # Files excluded from Docker build
├── docker-compose.yml            # Development configuration
├── docker-compose.prod.yml       # Production override
└── .github/
    └── workflows/
        ├── ci.yml               # Continuous Integration
        └── deploy.yml           # Production Deployment
```

---

## 💻 Local Development with Docker

### Quick Start

1. **Ensure Convex is running** (backend must be active):
   ```bash
   # Terminal 1: Start Convex backend
   npx convex dev
   ```

2. **Start Docker containers** (frontend):
   ```bash
   # Terminal 2: Start frontend in Docker
   npm run docker:dev
   
   # Or with rebuild
   npm run docker:dev:build
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Convex Dashboard: Check Convex CLI output for URL

### Available Docker Commands

```bash
# Development
npm run docker:dev              # Start dev containers
npm run docker:dev:build        # Build and start dev containers
npm run docker:dev:down         # Stop dev containers
npm run docker:logs             # View frontend logs

# Production (local testing)
npm run docker:prod             # Start production containers
npm run docker:prod:build       # Build and start production containers
npm run docker:prod:down        # Stop production containers

# Manual Docker commands
npm run docker:build            # Build Docker image only
```

### Hot Reload in Development

The development Docker setup includes volume mounts for hot-reload:

```yaml
volumes:
  - ./app:/app/app              # Next.js pages
  - ./components:/app/components # React components
  - ./lib:/app/lib              # Utilities
  - ./convex:/app/convex        # Convex functions
```

Changes to these directories will automatically reload the application.

### Environment Variables

Create `.env.local` file in the project root:

```env
# Convex Configuration
CONVEX_DEPLOYMENT=dev:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Authentication
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...your private key...
-----END PRIVATE KEY-----"

# Setup flag
SETUP_SCRIPT_RAN=1
```

**Note:** `.env.local` is automatically loaded by Docker Compose.

---

## 🌐 Production Deployment with Docker

### Building Production Image

```bash
# Build production-ready image
docker build -t petshop-frontend:latest --target runner .

# Or using Docker Compose
npm run docker:prod:build
```

### Production Environment Variables

Set these in your production environment (server, CI/CD, etc.):

```env
NODE_ENV=production
NEXT_PUBLIC_CONVEX_URL=https://your-prod-deployment.convex.cloud
CONVEX_DEPLOYMENT=prod:your-deployment-name
JWT_PRIVATE_KEY=<your-production-jwt-key>
```

### Deploying to Production Server (VPS)

1. **Copy files to server**:
   ```bash
   scp docker-compose.yml docker-compose.prod.yml user@server:/opt/petshop-app/
   scp .env.production user@server:/opt/petshop-app/.env.local
   ```

2. **SSH into server**:
   ```bash
   ssh user@server
   cd /opt/petshop-app
   ```

3. **Start production containers**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

4. **Verify deployment**:
   ```bash
   docker-compose logs -f frontend
   curl http://localhost:3000
   ```

### Production Monitoring

```bash
# View logs
docker-compose logs -f frontend

# Check container status
docker-compose ps

# Restart containers
docker-compose restart frontend

# Update to latest image
docker-compose pull
docker-compose up -d
```

---

## 🔄 GitHub Actions CI/CD

### Overview

Two automated workflows are configured:

1. **CI Workflow** (`.github/workflows/ci.yml`):
   - Runs on pull requests
   - Linting, type checking, build tests
   - Docker build verification
   - Security audit

2. **Deploy Workflow** (`.github/workflows/deploy.yml`):
   - Runs on push to `main` branch
   - Deploys Convex backend
   - Builds and pushes Docker image
   - Deploys to production
   - Health checks and rollback

### Required GitHub Secrets

Configure these in **GitHub Repository Settings → Secrets and Variables → Actions**:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `CONVEX_DEPLOY_KEY` | Convex deployment credentials (JSON) | `{"accessToken":"..."}` |
| `CONVEX_DEPLOYMENT` | Convex deployment identifier | `prod:your-deployment` |
| `NEXT_PUBLIC_CONVEX_URL` | Public Convex API URL | `https://prod.convex.cloud` |
| `JWT_PRIVATE_KEY` | RSA private key for authentication | `-----BEGIN PRIVATE KEY-----...` |

#### Optional Secrets (for VPS deployment):

| Secret Name | Description |
|------------|-------------|
| `PRODUCTION_HOST` | Production server IP/hostname |
| `PRODUCTION_USER` | SSH username |
| `PRODUCTION_SSH_KEY` | SSH private key for authentication |

#### Optional Secrets (for Vercel deployment):

| Secret Name | Description |
|------------|-------------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

### Getting Convex Deploy Key

1. **Login to Convex CLI**:
   ```bash
   npx convex login
   ```

2. **Generate deploy key**:
   ```bash
   npx convex deployment:key create prod
   ```

3. **Copy the output JSON** to `CONVEX_DEPLOY_KEY` secret.

### CI Workflow Details

**Trigger**: Pull requests to `main` or `develop`

**Jobs**:
1. **Lint and Type Check**: ESLint + TypeScript validation
2. **Build**: Test Next.js production build
3. **Docker Build**: Verify Docker image builds successfully
4. **Security Audit**: npm audit for vulnerabilities
5. **CI Summary**: Aggregate results

### Deploy Workflow Details

**Trigger**: Push to `main` branch or manual dispatch

**Jobs**:
1. **Deploy Convex**: Push backend functions to Convex cloud
2. **Build and Push**: Create Docker image, push to GitHub Container Registry
3. **Deploy Production**: Deploy to production server (VPS/Vercel)
4. **Health Check**: Verify application is running
5. **Rollback**: Automatic rollback on failure

### Manual Deployment Trigger

```bash
# Go to GitHub Actions tab
# Select "Deploy - Production Deployment" workflow
# Click "Run workflow"
# Choose environment (production/staging)
```

### Viewing GitHub Actions Logs

1. Go to **GitHub Repository → Actions**
2. Click on the workflow run
3. Click on individual jobs to see logs
4. Download logs for debugging

---

## ⚙️ Environment Configuration

### Development (.env.local)

```env
# Convex Development
CONVEX_DEPLOYMENT=dev:flexible-boar-785
NEXT_PUBLIC_CONVEX_URL=https://flexible-boar-785.convex.cloud

# Authentication
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDV8LL4zlLQCUqc
...
-----END PRIVATE KEY-----"

# Setup
SETUP_SCRIPT_RAN=1
```

### Production (.env.production)

```env
# Convex Production
NODE_ENV=production
CONVEX_DEPLOYMENT=prod:your-production-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-production.convex.cloud

# Authentication (use different key for production!)
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...your production key...
-----END PRIVATE KEY-----"
```

### Staging (.env.staging)

```env
# Convex Staging
NODE_ENV=production
CONVEX_DEPLOYMENT=staging:your-staging-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-staging.convex.cloud

# Authentication
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...your staging key...
-----END PRIVATE KEY-----"
```

### Environment Variable Security

**⚠️ NEVER commit these files to Git:**
- `.env.local`
- `.env.production`
- `.env.staging`

**✅ Safe to commit:**
- `.env.example` (template without real values)

**🔒 Security Best Practices:**
1. Use different JWT keys for dev/staging/production
2. Rotate keys periodically
3. Store production secrets in GitHub Secrets or vault
4. Use read-only deploy keys where possible

---

## 🔧 Troubleshooting

### Docker Issues

#### Container won't start

```bash
# Check logs
docker-compose logs frontend

# Common issues:
# 1. Port 3000 already in use
docker-compose down
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# 2. Environment variables missing
# Verify .env.local exists and is loaded
docker-compose config
```

#### Build fails

```bash
# Clear Docker cache
docker builder prune -a

# Rebuild from scratch
docker-compose build --no-cache

# Check Dockerfile syntax
docker build -t test .
```

#### Hot reload not working

```bash
# Ensure volumes are mounted correctly
docker-compose config | grep volumes

# On Windows, may need to enable file sharing in Docker Desktop
# Settings → Resources → File Sharing → Add project folder
```

### Convex Connection Issues

```bash
# Verify Convex is running
npx convex status

# Check deployment URL
echo $NEXT_PUBLIC_CONVEX_URL

# Re-authenticate
npx convex logout
npx convex login
```

### GitHub Actions Issues

#### Workflow not triggering

- Check branch protection rules
- Verify workflow file syntax (YAML)
- Check GitHub Actions permissions in repository settings

#### Secrets not available

```bash
# In workflow, debug secrets
- name: Debug
  run: |
    echo "URL: ${{ secrets.NEXT_PUBLIC_CONVEX_URL }}"
    # Note: Never echo actual secrets in production!
```

#### Convex deployment fails

- Verify `CONVEX_DEPLOY_KEY` is valid JSON
- Regenerate deploy key if expired
- Check Convex dashboard for errors

#### Docker build fails in CI

- Verify `NEXT_PUBLIC_CONVEX_URL` secret exists
- Check build logs for missing dependencies
- Ensure Dockerfile uses correct Node version

### Production Deployment Issues

#### Application not accessible

```bash
# Check container is running
docker ps

# Check logs
docker logs petshop-frontend-prod

# Check port binding
netstat -tuln | grep 3000

# Check firewall rules
sudo ufw status
sudo ufw allow 3000/tcp
```

#### Database connection fails

- Verify `NEXT_PUBLIC_CONVEX_URL` is correct
- Check Convex deployment status in dashboard
- Ensure Convex backend is deployed (`npx convex deploy`)

#### Out of memory

```bash
# Increase memory limit in docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 2G  # Increase from 1G
```

### Health Check Failures

```bash
# Test health endpoint manually
curl http://localhost:3000/api/health

# If endpoint doesn't exist, create one:
# Create app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok' });
}
```

---

## 📚 Additional Resources

### Docker Documentation
- [Docker Compose File Reference](https://docs.docker.com/compose/compose-file/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

### GitHub Actions
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

### Convex Deployment
- [Convex Deployment Guide](https://docs.convex.dev/production/hosting)
- [Convex CLI Reference](https://docs.convex.dev/cli)
- [Convex Deploy Keys](https://docs.convex.dev/production/deploy-key)

### Next.js Deployment
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)
- [Next.js Docker Example](https://github.com/vercel/next.js/tree/canary/examples/with-docker)
- [Next.js Production Checklist](https://nextjs.org/docs/app/building-your-application/deploying/production-checklist)

---

## 🎯 Quick Reference

### Essential Commands

```bash
# Local Development
npm run dev                     # Run locally (no Docker)
npm run docker:dev              # Run in Docker
npx convex dev                  # Start Convex backend

# Production Deployment
npm run docker:prod             # Production Docker locally
docker-compose logs -f          # View logs
docker-compose restart          # Restart containers

# Convex Management
npx convex deploy               # Deploy backend to production
npx convex dashboard            # Open Convex dashboard
npx convex deployment:key create # Create deploy key

# GitHub Actions
git push origin main            # Trigger deployment workflow
# Manual trigger via GitHub UI
```

### Port Mapping

| Service | Port | URL |
|---------|------|-----|
| Next.js Frontend | 3000 | http://localhost:3000 |
| Convex Backend | N/A | Cloud-hosted (see CONVEX_URL) |

### Support

For issues and questions:
1. Check this documentation
2. Review [main documentation](../doc/)
3. Check Convex documentation
4. Open GitHub issue

---

**Last Updated**: 2025-11-13  
**Version**: 1.0.0
