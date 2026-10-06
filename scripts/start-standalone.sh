#!/bin/sh
# Runs the production build the way the Docker image does: standalone server + static assets.
set -e
cd "$(dirname "$0")/.."
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public || true
cd .next/standalone
# Keep HOSTNAME=0.0.0.0: with 127.0.0.1 the server treats next-intl rewrites (built on
# "localhost") as external, proxies them back through proxy.ts and localized RO paths loop on 307.
PORT="${PORT:-3000}" HOSTNAME="${HOSTNAME:-0.0.0.0}" exec node server.js
