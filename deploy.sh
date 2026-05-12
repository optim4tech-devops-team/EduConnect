#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Notio — Full Deploy Script
#
# Kullanım:
#   export KUBECONFIG="C:/kubeconfig-192.168.1.120.yaml"
#   ./deploy.sh landing     # sadece landing page (configmap + restart)
#   ./deploy.sh web         # sadece admin panel (kubectl apply)
#   ./deploy.sh all         # her şey
#
# Docker build için build-and-push.sh kullanın:
#   ./build-and-push.sh landing
#   ./build-and-push.sh web
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

KUBECONFIG="${KUBECONFIG:-C:/kubeconfig-192.168.1.120.yaml}"
K="kubectl --kubeconfig=$KUBECONFIG"
NS="notio"
ROOT="$(cd "$(dirname "$0")" && pwd)"

deploy_landing() {
  echo ""
  echo "════ LANDING PAGE ═════════════════════════════════"

  echo "▶  Nginx config (charset utf-8)..."
  $K create configmap notio-landing-nginx-conf \
    --from-file=default.conf="$ROOT/landing/nginx.conf" \
    -n "$NS" --dry-run=client -o yaml | $K apply -f -

  echo "▶  HTML + CSS configmap..."
  $K create configmap notio-landing-files \
    --from-file=index.html="$ROOT/landing/index.html" \
    --from-file=styles.css="$ROOT/landing/styles.css" \
    -n "$NS" --dry-run=client -o yaml | $K apply -f -

  echo "▶  Assets (logo PNG)..."
  $K create secret generic notio-landing-assets \
    --from-file=notio-bird-mark.png="$ROOT/landing/assets/notio-bird-mark.png" \
    -n "$NS" --dry-run=client -o yaml | $K apply -f -

  echo "▶  Applying landing deploy.yaml..."
  $K apply -f "$ROOT/k8s/landing-deploy.yaml"

  echo "▶  Rollout restart..."
  $K rollout restart deployment/notio-landing -n "$NS"
  $K rollout status deployment/notio-landing -n "$NS" --timeout=90s

  echo "✓  Landing deployed → https://notioedu.com"
}

deploy_web() {
  echo ""
  echo "════ ADMIN WEB PANEL ══════════════════════════════"
  echo "▶  Applying notio-web.yaml..."
  $K apply -f "$ROOT/k8s/notio-web.yaml"

  echo "▶  Rollout restart..."
  $K rollout restart deployment/notio-web -n "$NS"
  $K rollout status deployment/notio-web -n "$NS" --timeout=90s

  echo "✓  Web admin deployed → https://platform.notioedu.com"
}

deploy_backend() {
  echo ""
  echo "════ BACKEND ══════════════════════════════════════"
  $K apply -f "$ROOT/k8s/namespace-vault-edulink.yaml"
  echo "✓  Backend applied"
}

TARGET="${1:-all}"

case "$TARGET" in
  landing)
    deploy_landing
    ;;
  web|admin)
    deploy_web
    ;;
  backend)
    deploy_backend
    ;;
  all)
    deploy_landing
    deploy_web
    deploy_backend
    ;;
  *)
    echo "Kullanım: $0 [landing|web|backend|all]"
    exit 1
    ;;
esac

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Deploy tamamlandı!"
echo "  Landing:     https://notioedu.com"
echo "  Web Admin:   https://platform.notioedu.com"
echo "═══════════════════════════════════════════════════"
