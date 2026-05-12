#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Notio — Build & Push tüm image'lar → registry.notioedu.com
#
# Kullanım:
#   chmod +x build-and-push.sh
#   ./build-and-push.sh            # tüm image'lar
#   ./build-and-push.sh landing    # sadece landing page
#   ./build-and-push.sh api        # sadece backend API
#
# Gereksinim: Docker login yapılmış olmalı
#   docker login registry.notioedu.com -u admin
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REGISTRY="registry.notioedu.com"
TAG="${TAG:-1.0.0}"

# Repo kökü (script nerede olursa olsun)
ROOT="$(cd "$(dirname "$0")" && pwd)"

build_push() {
  local name=$1
  local ctx=$2
  local file="${3:-$ctx/Dockerfile}"
  local image="$REGISTRY/notio/$name:$TAG"

  echo ""
  echo "▶  Building  $image"
  docker build -t "$image" -f "$file" "$ctx"

  echo "▶  Pushing   $image"
  docker push "$image"

  echo "✓  Done      $image"
}

TARGET="${1:-all}"

case "$TARGET" in
  landing)
    build_push "notio-landing" "$ROOT/landing"
    ;;
  api)
    build_push "edulink-api" "$ROOT/backend/EduLink.Api"
    ;;
  ai)
    build_push "edulink-ai" "$ROOT/ai-service"
    ;;
  gateway)
    build_push "edulink-gateway" "$ROOT/api-gateway"
    ;;
  web|admin)
    build_push "notio-web" "$ROOT/admin-panel"
    ;;
  all)
    build_push "notio-landing"    "$ROOT/landing"
    build_push "notio-web"        "$ROOT/admin-panel"
    build_push "edulink-api"      "$ROOT/backend/EduLink.Api"
    build_push "edulink-ai"       "$ROOT/ai-service"
    build_push "edulink-gateway"  "$ROOT/api-gateway"
    ;;
  *)
    echo "Bilinmeyen hedef: $TARGET"
    echo "Geçerli hedefler: landing | api | ai | gateway | web | admin | all"
    exit 1
    ;;
esac

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Tüm image'lar registry.notioedu.com'a gönderildi"
echo "  Tag: $TAG"
echo "═══════════════════════════════════════════════════"
