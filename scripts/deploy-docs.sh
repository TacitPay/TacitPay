#!/usr/bin/env bash
# Deploys the Starlight docs site (packages/docs) to the tacitpay-docs Vercel
# project, which serves docs.tacitpay.xyz.
#
# Why a script: tacitpay-docs is NOT git-connected, so a push never updates
# it. And a plain `vercel --prod` from inside the repo inherits the app's
# root vercel.json (yarn install, yarn build) and fails on a static folder.
# The Build Output API path below uploads the built files and runs no install
# and no build at all, which is exactly what a static site wants.
#
# Usage:  yarn docs:deploy             build, then deploy to production
#         yarn docs:deploy --dry-run   build and stage only; print the dir
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCOPE="${VERCEL_SCOPE:-marcus-tans-projects-0956f18f}"
PROJECT="${VERCEL_DOCS_PROJECT:-tacitpay-docs}"

echo "- building packages/docs"
yarn workspace @tacitpay/docs run build >/dev/null

STAGE="$(mktemp -d -t tacitpay-docs-deploy)"
mkdir -p "$STAGE/.vercel/output/static"
cp -R "$ROOT/packages/docs/dist/." "$STAGE/.vercel/output/static/"
printf '{"version":3}\n' > "$STAGE/.vercel/output/config.json"
echo "- staged $(find "$STAGE/.vercel/output/static" -type f | wc -l | tr -d ' ') files in $STAGE"

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "- dry run: not deploying"
  exit 0
fi

echo "- linking $PROJECT ($SCOPE)"
vercel link --yes --project "$PROJECT" --scope "$SCOPE" --cwd "$STAGE" >/dev/null
echo "- deploying prebuilt output to production"
vercel deploy --prebuilt --prod --yes --scope "$SCOPE" --cwd "$STAGE"
rm -rf "$STAGE"
