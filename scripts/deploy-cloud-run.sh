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

if [[ -f "$ROOT/DOC_RELEASE.json" ]]; then
  if command -v node >/dev/null 2>&1; then
    node -e "
      const fs = require('fs');
      const p = process.argv[1];
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      j.deployedAt = new Date().toISOString();
      j.stageService = process.env.CLOUD_RUN_SERVICE || j.stageService || 'thine-docs-stage';
      fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
    " "$ROOT/DOC_RELEASE.json"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c "
import json, os, sys
from datetime import datetime, timezone
p = sys.argv[1]
with open(p) as f:
    j = json.load(f)
j['deployedAt'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
j['stageService'] = os.environ.get('CLOUD_RUN_SERVICE') or j.get('stageService') or 'thine-docs-stage'
with open(p, 'w') as f:
    json.dump(j, f, indent=2)
    f.write('\n')
" "$ROOT/DOC_RELEASE.json"
  fi
  info "Stamped DOC_RELEASE.json deployedAt"
fi

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
  --set-env-vars="NODE_ENV=production" \
  --quiet

info "Deployed. URL:"
gcloud run services describe "$SERVICE" \
  --project="$PROJECT" \
  --region="$REGION" \
  --format='value(status.url)'
