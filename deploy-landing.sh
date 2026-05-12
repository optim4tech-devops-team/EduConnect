#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Deploy landing page to notioedu.com
# Run this from the repo root:
#   export KUBECONFIG="C:/kubeconfig-192.168.1.120.yaml"
#   chmod +x deploy-landing.sh && ./deploy-landing.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

KUBECONFIG="${KUBECONFIG:-C:/kubeconfig-192.168.1.120.yaml}"
NS="notio"
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "▶  Updating nginx configmap (charset utf-8 fix)..."
kubectl --kubeconfig="$KUBECONFIG" create configmap notio-landing-nginx-conf \
  --from-file=default.conf="$ROOT/landing/nginx.conf" \
  -n "$NS" \
  --dry-run=client -o yaml | kubectl --kubeconfig="$KUBECONFIG" apply -f -

echo "▶  Updating landing files configmap (index.html + styles.css)..."
kubectl --kubeconfig="$KUBECONFIG" create configmap notio-landing-files \
  --from-file=index.html="$ROOT/landing/index.html" \
  --from-file=styles.css="$ROOT/landing/styles.css" \
  -n "$NS" \
  --dry-run=client -o yaml | kubectl --kubeconfig="$KUBECONFIG" apply -f -

echo "▶  Uploading assets PNG to secret..."
kubectl --kubeconfig="$KUBECONFIG" create secret generic notio-landing-assets \
  --from-file=notio-bird-mark.png="$ROOT/landing/assets/notio-bird-mark.png" \
  -n "$NS" \
  --dry-run=client -o yaml | kubectl --kubeconfig="$KUBECONFIG" apply -f -

echo "▶  Restarting landing deployment..."
kubectl --kubeconfig="$KUBECONFIG" rollout restart deployment/notio-landing -n "$NS"

echo "▶  Waiting for rollout..."
kubectl --kubeconfig="$KUBECONFIG" rollout status deployment/notio-landing -n "$NS" --timeout=90s

echo ""
echo "✓  Landing page deployed!"
echo "   http://notioedu.com"
echo "   https://notioedu.com  (sertifika hazırsa)"
