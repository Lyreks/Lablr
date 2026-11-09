#!/usr/bin/env bash
# Builds the root Dockerfile with Cloud Build and deploys it to Cloud Run. One-time setup is in the README.
set -euo pipefail

# One instance, since sign-in sessions live in memory
gcloud run deploy "${SERVICE:-lablr}" \
  --source . \
  --region "${REGION:-us-central1}" \
  --allow-unauthenticated \
  --max-instances 1 \
  --set-secrets GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest
