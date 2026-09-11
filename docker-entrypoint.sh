#!/bin/sh
set -e

echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "Ensuring admin user exists..."
node_modules/.bin/tsx prisma/ensure-admin.ts

exec "$@"
