# Local build environment for the Aphelion wiki site.
# Cloudflare Pages does not use this Dockerfile — its build environment
# is configured in the Pages dashboard (Framework preset: Astro, Node 22 (Astro 6 要件)).
# This container exists only to make local builds reproducible regardless
# of the host Node.js version.

FROM node:22-alpine AS deps
WORKDIR /app/site
COPY site/package.json site/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/site/node_modules ./site/node_modules
COPY site ./site
COPY docs/wiki ./docs/wiki
COPY scripts ./scripts
WORKDIR /app/site
RUN npm run build

FROM scratch AS export
COPY --from=build /app/site/dist /dist
