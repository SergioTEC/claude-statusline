# claude-statusline

> Real-time status line for Claude Code showing token usage, model, cost, and plan limits — always visible at the bottom of your terminal.

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Claude Code](https://img.shields.io/badge/Claude%20Code-compatible-orange)

---

## What it shows

![Statusline preview](https://github.com/user-attachments/assets/5216fa89-817b-471e-bcad-ffa2914a938e)

<!--
```
claude-sonnet-4-6 | Input: 125.8k | Output: 25.0k | Total: 150.8k | CTX: 125.8k (24%) | Cost: $1.30 | Session: 34% · 7min | Weekly: 52% · 2d12h
```
-->

| Field | Color | Description |
|---|---|---|
| Model | 🟡 Yellow | Active Claude model |
| Input | 🔴 Red | Input tokens sent this session |
| Output | 🟢 Green | Output tokens generated |
| Total | 🔵 Blue | Combined input + output tokens |
| CTX | 🟠 Orange | Total tokens in current context (input + output + cache) + % of the model's context window used (approaches 100% → Claude Code auto-compacts) |
| Cost | ⚪ White | Estimated session cost in USD |
| Session | 🔵 Cyan | 5-hour rate limit usage + time until reset |
| Weekly | 🟣 Magenta | 7-day rate limit usage + time until reset |

> **Session** and **Weekly** are only shown for users logged in with a Claude.ai Pro/Max subscription via `claude login`.

---

## Install

```bash
npx @sergiojr/claude-statusline
```

That's it. No cloning, no dependencies to install manually.

To uninstall:

```bash
npx @sergiojr/claude-statusline uninstall
```

---

## Requirements

- [Claude Code](https://claude.ai/code) CLI installed and logged in
- `bash`
- `jq`
- `curl`
- `python3`

---

## Manual installation (alternative)

If you prefer cloning the repo:

```bash
git clone https://github.com/SergioTEC/claude-statusline.git
cd claude-statusline
node install.js
```

To uninstall manually:

```bash
node uninstall.js
```

---

## Platform support

| Platform | Status | Auth method |
|---|---|---|
| macOS | ✅ Fully supported | macOS Keychain (`security`) |
| Linux | ✅ Fully supported | `~/.claude/.credentials.json` |
| Windows (WSL) | ⚠️ Should work | `~/.claude/.credentials.json` |
| Windows (native) | ❌ Not supported | — |

### Authentication

No configuration needed. The scripts read your OAuth credentials automatically:

- **macOS** — reads from the system Keychain (entry `Claude Code-credentials`), written there automatically by `claude login`
- **Linux / WSL** — reads from `~/.claude/.credentials.json`, written there automatically by `claude login`

If you use Claude Code only with an API key (no `claude login`), the session and weekly limit fields will not appear — token, cost, and context data will still work normally.

---

## How it works

Claude Code supports a `statusLine` setting in `~/.claude/settings.json` that runs a shell command on each update and displays its output at the bottom of the terminal.

`statusline.sh` reads the JSON piped by Claude Code (model, tokens, context, cost) and calls `fetch-usage.sh` to get plan usage from the Anthropic OAuth API.

**Session** and **Weekly** data is cached in `/tmp/claude-usage-cache.json` for 180 seconds. On a 429 rate-limit response, the script backs off for 300 seconds before retrying — avoiding repeated blocked requests.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](.github/CONTRIBUTING.md) before opening a PR.

**Branch flow:**
```
feature/* → develop → main
```

- Open PRs against `develop`, not `main`
- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, etc.) — versioning is automatic

---

## License

MIT
