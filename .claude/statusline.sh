#!/usr/bin/env bash
# Claude Code status line
# Displays token usage, model, cost, and plan limits in the terminal status bar.

export LC_NUMERIC=C

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
ctx_tokens=$(echo "$input" | jq -r '
  (.context_window.current_usage.input_tokens // 0) +
  (.context_window.current_usage.output_tokens // 0) +
  (.context_window.current_usage.cache_creation_input_tokens // 0) +
  (.context_window.current_usage.cache_read_input_tokens // 0)
' 2>/dev/null)
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

# ─── Load user config ─────────────────────────────────────────────────────────
CONFIG="${HOME}/.claude/statusline-config.json"
FIELD_ORDER="model input output total ctx cost session weekly"
c_model="yellow"; c_input="red"; c_output="green"; c_total="blue"
c_ctx="orange"; c_cost="white"; c_session="cyan"; c_weekly="magenta"

if [ -f "$CONFIG" ]; then
  _fo=$(jq -r '(.fields // []) | join(" ")' "$CONFIG" 2>/dev/null)
  [ -n "$_fo" ] && FIELD_ORDER="$_fo"

  _colors=$(jq -r '[
    (.colors.model   // "yellow"),
    (.colors.input   // "red"),
    (.colors.output  // "green"),
    (.colors.total   // "blue"),
    (.colors.ctx     // "orange"),
    (.colors.cost    // "white"),
    (.colors.session // "cyan"),
    (.colors.weekly  // "magenta")
  ] | join("|")' "$CONFIG" 2>/dev/null)

  if [ -n "$_colors" ]; then
    IFS='|' read -r c_model c_input c_output c_total c_ctx c_cost c_session c_weekly <<< "$_colors"
  fi
fi

# Map color name to ANSI escape sequence
color_ansi() {
  case "$1" in
    red)            printf "\033[0;31m" ;;
    green)          printf "\033[0;32m" ;;
    yellow)         printf "\033[0;33m" ;;
    blue)           printf "\033[0;34m" ;;
    magenta)        printf "\033[0;35m" ;;
    cyan)           printf "\033[0;36m" ;;
    white)          printf "\033[0;37m" ;;
    bright_red)     printf "\033[0;91m" ;;
    bright_green)   printf "\033[0;92m" ;;
    bright_yellow)  printf "\033[0;93m" ;;
    bright_blue)    printf "\033[0;94m" ;;
    bright_magenta) printf "\033[0;95m" ;;
    bright_cyan)    printf "\033[0;96m" ;;
    bright_white)   printf "\033[0;97m" ;;
    orange)         printf "\033[38;5;208m" ;;
    pink)           printf "\033[38;5;213m" ;;
    purple)         printf "\033[38;5;129m" ;;
    gray)           printf "\033[0;90m" ;;
    *)              printf "\033[0m" ;;
  esac
}

# ─── Build segments (colored + plain text for measuring) ─────────────────────
seg_count=0
add_seg() {
  seg_colored[$seg_count]="$1"
  seg_plain[$seg_count]="$2"
  seg_count=$((seg_count + 1))
}

for _field in $FIELD_ORDER; do
  case "$_field" in
    model)
      _a=$(color_ansi "$c_model")
      add_seg "$(printf "%s%s\033[0m" "$_a" "$model")" "$model"
      ;;
    input)
      _a=$(color_ansi "$c_input")
      add_seg "$(printf "%sInput: %s\033[0m" "$_a" "$(fmt $total_in)")" "Input: $(fmt $total_in)"
      ;;
    output)
      _a=$(color_ansi "$c_output")
      add_seg "$(printf "%sOutput: %s\033[0m" "$_a" "$(fmt $total_out)")" "Output: $(fmt $total_out)"
      ;;
    total)
      _a=$(color_ansi "$c_total")
      add_seg "$(printf "%sTotal: %s\033[0m" "$_a" "$(fmt $total_tokens)")" "Total: $(fmt $total_tokens)"
      ;;
    ctx)
      _a=$(color_ansi "$c_ctx")
      add_seg "$(printf "%sCTX: %s (%s%%)\033[0m" "$_a" "$(fmt $ctx_tokens)" "$ctx_int")" "CTX: $(fmt $ctx_tokens) (${ctx_int}%)"
      ;;
    cost)
      _a=$(color_ansi "$c_cost")
      add_seg "$(printf "%sCost: \$%s\033[0m" "$_a" "$cost_fmt")" "Cost: \$${cost_fmt}"
      ;;
    session)
      if [ -n "$session_str" ]; then
        _a=$(color_ansi "$c_session")
        add_seg "$(printf "%s%s\033[0m" "$_a" "$session_str")" "$session_str"
      fi
      ;;
    weekly)
      if [ -n "$weekly_str" ]; then
        _a=$(color_ansi "$c_weekly")
        add_seg "$(printf "%s%s\033[0m" "$_a" "$weekly_str")" "$weekly_str"
      fi
      ;;
  esac
done

# ─── Detect terminal width ───────────────────────────────────────────────────
term_width=${COLUMNS:-0}
[ "$term_width" -eq 0 ] 2>/dev/null && term_width=$(stty size </dev/tty 2>/dev/null | awk '{print $2}')
[ -z "$term_width" ] || [ "$term_width" -eq 0 ] 2>/dev/null && term_width=$(tput cols </dev/tty 2>/dev/null)
[ -z "$term_width" ] || [ "$term_width" -eq 0 ] 2>/dev/null && term_width=200
# Claude Code UI has padding — subtract margin so we wrap before it truncates
term_width=$((term_width - 6))

# ─── Greedy line wrapping: fit as many segments as possible per line ──────────
sep=" | "
sep_len=3
output=""
line=""
line_len=0
first_on_line=true

for i in $(seq 0 $((seg_count - 1))); do
  plain="${seg_plain[$i]}"
  colored="${seg_colored[$i]}"
  seg_len=${#plain}

  if $first_on_line; then
    needed=$seg_len
  else
    needed=$((seg_len + sep_len))
  fi

  if ! $first_on_line && [ $((line_len + needed)) -gt "$term_width" ]; then
    # Current segment doesn't fit — start a new line
    [ -n "$output" ] && output="${output}\n"
    output="${output}${line}"
    line="$colored"
    line_len=$seg_len
    first_on_line=false
  else
    if $first_on_line; then
      line="$colored"
      line_len=$seg_len
      first_on_line=false
    else
      line="${line}${sep}${colored}"
      line_len=$((line_len + needed))
    fi
  fi
done

# Flush last line
[ -n "$line" ] && { [ -n "$output" ] && output="${output}\n${line}" || output="$line"; }

printf "%b" "$output"
