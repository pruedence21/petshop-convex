# Welcome to your Convex + Next.js + Convex Auth app

[![CI](https://github.com/yukiastria/petshop-convex/actions/workflows/ci.yml/badge.svg)](https://github.com/yukiastria/petshop-convex/actions/workflows/ci.yml)
[![Deploy](https://github.com/yukiastria/petshop-convex/actions/workflows/deploy.yml/badge.svg)](https://github.com/yukiastria/petshop-convex/actions/workflows/deploy.yml)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](./DOCKER_README.md)

This is a [Convex](https://convex.dev/) project created with [`npm create convex`](https://www.npmjs.com/package/create-convex).

After the initial setup (<2 minutes) you'll have a working full-stack app using:

- Convex as your backend (database, server logic)
- [React](https://react.dev/) as your frontend (web page interactivity)
- [Next.js](https://nextjs.org/) for optimized web hosting and page routing
- [Tailwind](https://tailwindcss.com/) for building great looking accessible UI
- [Convex Auth](https://labs.convex.dev/auth) for authentication

## Get started

If you just cloned this codebase and didn't use `npm create convex`, run:

```
npm install
npm run dev
```

If you're reading this README on GitHub and want to use this template, run:

```
npm create convex@latest -- -t nextjs-convexauth
```

## 🐳 Docker & CI/CD

This project includes complete Docker and GitHub Actions setup:

- **Docker Compose** for local development and production
- **Multi-stage Dockerfile** with optimized builds
- **GitHub Actions CI** for automated testing
- **GitHub Actions CD** for automated deployment
- **Health checks** and monitoring

**Quick start with Docker:**
```bash
# Start Convex backend (Terminal 1)
npx convex dev

# Start frontend in Docker (Terminal 2)
npm run docker:dev
```

📖 **See [DOCKER_README.md](./DOCKER_README.md)** for quick reference  
📖 **See [doc/17-docker-cicd-deployment.md](./doc/17-docker-cicd-deployment.md)** for full documentation

## Learn more

To learn more about developing your project with Convex, check out:

- The [Tour of Convex](https://docs.convex.dev/get-started) for a thorough introduction to Convex principles.
- The rest of [Convex docs](https://docs.convex.dev/) to learn about all Convex features.
- [Stack](https://stack.convex.dev/) for in-depth articles on advanced topics.
- [Convex Auth docs](https://labs.convex.dev/auth) for documentation on the Convex Auth library.

## Configuring other authentication methods

To configure different authentication methods, see [Configuration](https://labs.convex.dev/auth/config) in the Convex Auth docs.

## Join the community

Join thousands of developers building full-stack apps with Convex:

- Join the [Convex Discord community](https://convex.dev/community) to get help in real-time.
- Follow [Convex on GitHub](https://github.com/get-convex/), star and contribute to the open-source implementation of Convex.
