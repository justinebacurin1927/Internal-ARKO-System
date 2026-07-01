#!/usr/bin/env bash
set -euo pipefail

echo "🧹 Cleaning up leftover ARKO dev servers..."

# Kill any process holding port 3000 (Next.js default)
if fuser 3000/tcp &>/dev/null; then
  echo "   → Killing process on port 3000..."
  fuser -k 3000/tcp
fi

# Kill any other Next.js dev server ports that may have been used
for port in 3001 3002 3003 3004 3005; do
  if fuser "$port/tcp" &>/dev/null; then
    echo "   → Killing process on port $port..."
    fuser -k "$port/tcp"
  fi
done

# Kill any lingering node/next processes started from this project
pids=$(pgrep -f "next dev" 2>/dev/null || true)
if [ -n "$pids" ]; then
  echo "   → Killing stale next dev processes (PIDs: $(echo "$pids" | tr '\n' ' '))..."
  kill -9 $pids 2>/dev/null || true
fi

echo "✅ Done"
