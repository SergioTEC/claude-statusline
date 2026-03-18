#!/usr/bin/env bash
# Fetches Claude.ai plan usage with 60-second cache.
# Reads OAuth credentials automatically from:
#   macOS  → Keychain ("Claude Code-credentials")
#   Linux  → ~/.claude/.credentials.json

CACHE=/tmp/claude-usage-cache.json
CACHE_MAX_AGE=60

# Return cached data if still fresh
if [ -f "$CACHE" ]; then
  cache_age=$(( $(date +%s) - $(stat -f %m "$CACHE" 2>/dev/null || stat -c %Y "$CACHE" 2>/dev/null) ))
  if [ "$cache_age" -lt "$CACHE_MAX_AGE" ]; then
    cat "$CACHE"
    exit 0
  fi
fi

# Read credentials: macOS Keychain first, then file fallback (Linux)
creds=""
if command -v security &>/dev/null; then
  creds=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null)
fi
if [ -z "$creds" ] && [ -f "$HOME/.claude/.credentials.json" ]; then
  creds=$(cat "$HOME/.claude/.credentials.json" 2>/dev/null)
fi

if [ -z "$creds" ]; then
  if [ -f "$CACHE" ]; then cat "$CACHE"; else echo '{"five_hour":null,"seven_day":null}'; fi
  exit 0
fi

access_token=$(echo "$creds" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('claudeAiOauth', {}).get('accessToken', ''))
" 2>/dev/null)

if [ -z "$access_token" ]; then
  if [ -f "$CACHE" ]; then cat "$CACHE"; else echo '{"five_hour":null,"seven_day":null}'; fi
  exit 0
fi

# Fetch fresh data from Anthropic OAuth usage API
result=$(curl -s --max-time 5 \
  "https://api.anthropic.com/api/oauth/usage" \
  -H "Authorization: Bearer ${access_token}" \
  -H "Content-Type: application/json" \
  -H "anthropic-beta: oauth-2025-04-20" 2>/dev/null)

if echo "$result" | jq -e '.five_hour' > /dev/null 2>&1; then
  echo "$result" | jq '{five_hour: .five_hour, seven_day: .seven_day}' > "$CACHE"
  cat "$CACHE"
else
  if [ -f "$CACHE" ]; then cat "$CACHE"; else echo '{"five_hour":null,"seven_day":null}'; fi
fi
