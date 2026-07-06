#!/usr/bin/env bash
# Deploy thine-docs to Google Cloud Run (stage).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT="${GCP_PROJECT:-thinecode-500008}"
REGION="${GCP_REGION:-us-central1}"
SERVICE="${CLOUD_RUN_SERVICE:-thine-docs-stage}"

info() { printf '==> %s\n' "$*"; }

info "Project: $PROJECT  Region: $REGION  Service: $SERVICE"

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  --project="$PROJECT" --quiet

gcloud run deploy "$SERVICE" \
  --source . \
  --project="$PROJECT" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --set-env-vars="NODE_ENV=production"

info "Deployed. URL:"
gcloud run services describe "$SERVICE" \
  --project="$PROJECT" \
  --region="$REGION" \
  --format='value(status.url)'
