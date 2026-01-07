#!/bin/bash

# Load Secrets if present
if [ -f scripts/.deploy_secrets ]; then
  source scripts/.deploy_secrets
  echo "🔑 Loaded credentials from scripts/.deploy_secrets"
else
  # Fallback to .env (only if not set)
  if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
  fi
fi

echo "🚀 Starting Production Database Deployment"
echo "----------------------------------------"

# Check for required variables
if [ -z "$TURSO_DATABASE_URL" ] || [ -z "$TURSO_AUTH_TOKEN" ]; then
  echo "❌ Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required."
  exit 1
fi

echo "1️⃣  Initializing Database Schema..."
node scripts/init-db.js
if [ $? -ne 0 ]; then echo "❌ Init failed"; exit 1; fi

echo -e "\n2️⃣  Importing Recipes..."
node scripts/import-recipes.js
if [ $? -ne 0 ]; then echo "❌ Import failed"; exit 1; fi

if [ ! -z "$CLOUDINARY_CLOUD_NAME" ]; then
  echo -e "\n3️⃣  Syncing Local Images (Background)..."
#   node scripts/sync-images.js
fi

echo -e "\n✅ Deployment Complete! Your Vercel app is ready."