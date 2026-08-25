#!/usr/bin/env bash
# Local devnet control for TacitPay (PRD §12.5).
#
# Wraps midnightntwrk/midnight-local-dev's standalone.yml, which runs three
# containers on fixed ports: node 9944, indexer 8088, proof-server 6300.
# Those ports are what Lace's "Undeployed" network expects, so they are not
# configurable — and they are what config/networks.json's `undeployed` entry
# already points at.
set -euo pipefail

# The devnet lives outside this repo (it is a separate tool, not a dependency).
# Override with MIDNIGHT_LOCAL_DEV if you cloned it somewhere else.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEVNET_DIR="${MIDNIGHT_LOCAL_DEV:-$(dirname "$REPO_ROOT")/midnight-local-dev}"
COMPOSE_FILE="$DEVNET_DIR/standalone.yml"
CONTAINERS=(midnight-node midnight-indexer midnight-proof-server)

die() { echo "error: $*" >&2; exit 1; }

require_devnet() {
  [ -f "$COMPOSE_FILE" ] || die "midnight-local-dev not found at $DEVNET_DIR
  Clone it first (PRD §12.5):
    git clone https://github.com/midnightntwrk/midnight-local-dev.git $DEVNET_DIR
  Or point MIDNIGHT_LOCAL_DEV at an existing checkout."
  docker info >/dev/null 2>&1 || die "Docker is not running. Start Docker Desktop and retry."
}

# compose refuses to start when a container of the same name exists but was
# created outside this project — common here because the proof server is also
# useful on its own and people start it by hand for Preview work.
check_name_conflicts() {
  local stray=()
  for name in "${CONTAINERS[@]}"; do
    docker container inspect "$name" >/dev/null 2>&1 || continue
    local owner
    owner="$(docker container inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$name" 2>/dev/null || true)"
    [ -n "$owner" ] || stray+=("$name")
  done
  [ ${#stray[@]} -eq 0 ] && return 0
  echo "warning: these containers exist but were not started by the devnet compose project:"
  printf '  - %s\n' "${stray[@]}"
  echo "compose cannot reuse them. Remove them (they are disposable dev containers) with:"
  echo "  docker rm -f ${stray[*]}"
  echo "then re-run this command."
  exit 1
}

case "${1:-}" in
  up)
    require_devnet
    check_name_conflicts
    echo "starting local devnet from $COMPOSE_FILE"
    # --wait blocks on the healthchecks defined in standalone.yml, so the
    # command only returns once node/indexer/proof-server are actually usable.
    docker compose -f "$COMPOSE_FILE" up -d --wait
    "$0" status
    echo
    echo "Fund test wallets with the devnet's own CLI (it registers DUST too):"
    echo "  cd $DEVNET_DIR && npm install && npm start"
    ;;
  down)
    require_devnet
    docker compose -f "$COMPOSE_FILE" down --remove-orphans
    ;;
  status)
    docker ps --filter "name=midnight-" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
    echo
    # Endpoint probes, because "container running" and "endpoint answering"
    # are different things — the indexer in particular starts slowly.
    for probe in "node|http://localhost:9944/health" \
                 "proof-server|http://localhost:6300/"; do
      name="${probe%%|*}"; url="${probe#*|}"
      if curl -sf -m 5 -o /dev/null "$url"; then echo "  ok          $name"; else echo "  UNREACHABLE $name ($url)"; fi
    done

    # The indexer only answers GraphQL over POST (a GET returns 405), so probe
    # it with a real query — that proves the API works, not just the process.
    if curl -sf -m 5 -o /dev/null -X POST http://localhost:8088/api/v4/graphql \
        -H 'Content-Type: application/json' -d '{"query":"{__typename}"}'; then
      echo "  ok          indexer"
    else
      echo "  UNREACHABLE indexer (http://localhost:8088/api/v4/graphql)"
    fi
    ;;
  *)
    echo "usage: $0 {up|down|status}"
    exit 2
    ;;
esac
