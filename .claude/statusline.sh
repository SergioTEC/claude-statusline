#!/usr/bin/env bash
# Claude Code status line
# Displays token usage, model, cost, and plan limits in the terminal status bar.

input=$(cat)

# ─── Fetch plan usage (session and weekly) ────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
usage_data=$(bash "${SCRIPT_DIR}/fetch-usage.sh" 2>/dev/null)

# Returns a human-readable countdown string for a UTC ISO 8601 timestamp
time_until_reset() {
  local resets_at="$1"
  local reset_ts
  reset_ts=$(date -j -u -f "%Y-%m-%dT%H:%M:%S" "${resets_at%%.*}" +%s 2>/dev/null || \
             date -d "$resets_at" +%s 2>/dev/null)
  local now_ts diff_mins
  now_ts=$(date +%s)
  diff_mins=$(( (reset_ts - now_ts) / 60 ))
  if [ "$diff_mins" -le 0 ]; then
    echo "now"
  elif [ "$diff_mins" -ge 1440 ]; then
    local d=$(( diff_mins / 1440 )) h=$(( (diff_mins % 1440) / 60 ))
    echo "${d}d${h}h"
  elif [ "$diff_mins" -ge 60 ]; then
    local h=$(( diff_mins / 60 )) m=$(( diff_mins % 60 ))
    echo "${h}h${m}m"
  else
    echo "${diff_mins}min"
  fi
}

# Current session usage (five_hour)
session_pct=$(echo "$usage_data" | jq -r '.five_hour.utilization // empty' 2>/dev/null)
session_str=""
if [ -n "$session_pct" ]; then
  session_int=$(printf "%.0f" "$session_pct")
  session_resets_at=$(echo "$usage_data" | jq -r '.five_hour.resets_at // empty' 2>/dev/null)
  session_time=$([ -n "$session_resets_at" ] && time_until_reset "$session_resets_at" || echo "")
  session_str="Session: ${session_int}%$([ -n "$session_time" ] && echo " · ${session_time}")"
fi

# Weekly limits (seven_day)
weekly_pct=$(echo "$usage_data" | jq -r '.seven_day.utilization // empty' 2>/dev/null)
weekly_str=""
if [ -n "$weekly_pct" ]; then
  weekly_int=$(printf "%.0f" "$weekly_pct")
  weekly_resets_at=$(echo "$usage_data" | jq -r '.seven_day.resets_at // empty' 2>/dev/null)
  weekly_time=$([ -n "$weekly_resets_at" ] && time_until_reset "$weekly_resets_at" || echo "")
  weekly_str="Weekly: ${weekly_int}%$([ -n "$weekly_time" ] && echo " · ${weekly_time}")"
fi

# ─── Parse context window data from Claude Code stdin ─────────────────────────
model=$(echo "$input" | jq -r '.model.display_name // "Unknown model"')
total_in=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_out=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
total_tokens=$((total_in + total_out))
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // 0')
ctx_tokens=$total_in
cost=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')

# Format numbers with k/M suffixes
fmt() {
  awk "BEGIN {
    n = $1
    if (n >= 1000000) printf \"%.1fM\", n/1000000
    else if (n >= 1000) printf \"%.1fk\", n/1000
    else printf \"%d\", n
  }"
}

ctx_int=$(printf "%.0f" "$used_pct")
cost_fmt=$(printf "%.2f" "$cost")

# ─── Colored output ───────────────────────────────────────────────────────────
model_colored=$(printf "\033[0;33m%s\033[0m" "$model")
input_colored=$(printf "\033[0;31mInput: %s\033[0m" "$(fmt $total_in)")
output_colored=$(printf "\033[0;32mOutput: %s\033[0m" "$(fmt $total_out)")
total_colored=$(printf "\033[0;34mTotal: %s\033[0m" "$(fmt $total_tokens)")
ctx_colored=$(printf "\033[38;5;208mCTX: %s (%s%%)\033[0m" "$(fmt $ctx_tokens)" "$ctx_int")
cost_colored=$(printf "\033[0;37mCost: \$%s\033[0m" "$cost_fmt")
line="${model_colored} | ${input_colored} | ${output_colored} | ${total_colored} | ${ctx_colored} | ${cost_colored}"

if [ -n "$session_str" ]; then
  line="${line} | $(printf "\033[0;36m%s\033[0m" "$session_str")"
fi
if [ -n "$weekly_str" ]; then
  line="${line} | $(printf "\033[0;35m%s\033[0m" "$weekly_str")"
fi

printf "%s" "$line"
