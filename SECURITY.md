# Security policy

## Supported versions

Security fixes go into the latest release only. Please update before reporting.

| Version | Supported |
|---|---|
| 1.x | Yes |
| < 1.0 | No |

## Reporting a vulnerability

**Please don't open a public issue.** Report it privately through
[GitHub Security Advisories](https://github.com/X-Saikat-93/embermeter/security/advisories/new).

Please include:
- what an attacker could do;
- the steps or input needed to reproduce it;
- the Embermeter and Claude Code versions you tested.

What to expect:
- **Acknowledgement:** within 3 days.
- **First assessment:** within 7 days.
- **Fix or mitigation:** within 30 days for confirmed issues, sooner for severe ones.

You'll be credited in the release notes unless you'd rather not be.

## Threat model

Embermeter runs inside Claude Code, with the permissions Claude Code grants a mod. What it does and doesn't do:

| Area | Behaviour |
|---|---|
| Network | None. No `fetch`, no sockets, no model calls. The context breakdown uses the engine's local estimate. |
| File system | Reads only `/sys/class/thermal/*`, `/sys/class/power_supply/BAT0/*`, `/sys/devices/system/cpu/online`, `/proc/loadavg` and `/proc/meminfo`. Writes nothing. |
| Processes | Starts none. |
| Storage | Session state lives in Claude Code's session state. Lifetime totals (session count, turns, calls, cost) are kept in Claude Code's plugin store on your machine. Prompts, file contents and command output are never stored across sessions. |
| Rendering | Every string drawn into SVG goes through one escaping function (`esc` in `hooks/draw.ts`). The SVG renders in image mode, where scripts don't run. |
| Blocking | Every hook fails open. The heat guard is the only code that can refuse an action, and only for Bash commands that match `heavyPattern` while the CPU is over `maxTempC` or the battery is below `minBatteryPct` and discharging. |
| Configuration | `heavyPattern` is a regular expression you supply yourself. An invalid pattern falls back to the built-in one. |

### What the pane can show

The pane shows short snippets of session activity: tool names, file paths, the first characters of Bash commands, and subagent descriptions. Keep that in mind when you share a screenshot or the output of `/embermeter report`.

## Supply chain

- No runtime dependencies. The mod is plain TypeScript loaded by Claude Code.
- CI actions are pinned to full commit SHAs and kept current by Dependabot.
- CodeQL scans every push and pull request.
