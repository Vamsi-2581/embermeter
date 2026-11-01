<p align="center">
  <img src="docs/art/hero.svg" alt="Embermeter, model EM-1: a live instrument panel for Claude Code" width="880">
</p>

<p align="center">
  <a href="https://github.com/X-Saikat-93/embermeter/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/X-Saikat-93/embermeter/ci.yml?branch=main&style=flat-square&label=ci&labelColor=1a1917&color=93ae7e"></a>
  <a href="https://github.com/X-Saikat-93/embermeter/releases"><img alt="Release" src="https://img.shields.io/github/v/release/X-Saikat-93/embermeter?style=flat-square&labelColor=1a1917&color=e2a23c&display_name=tag"></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/X-Saikat-93/embermeter"><img alt="OpenSSF Scorecard" src="https://img.shields.io/ossf-scorecard/github.com/X-Saikat-93/embermeter?style=flat-square&label=scorecard&labelColor=1a1917&color=93ae7e"></a>
  <img alt="Claude Code 2.1.287+" src="https://img.shields.io/badge/claude%20code-2.1.287%2B-e2a23c?style=flat-square&labelColor=1a1917">
  <img alt="Network: none" src="https://img.shields.io/badge/network-none-87a3b6?style=flat-square&labelColor=1a1917">
  <img alt="Dependencies: 0" src="https://img.shields.io/badge/dependencies-0-87a3b6?style=flat-square&labelColor=1a1917">
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-c7b089?style=flat-square&labelColor=1a1917"></a>
</p>

<p align="center">
  <a href="#install"><b>I</b> Install</a> &nbsp;·&nbsp;
  <a href="#instruments"><b>II</b> Instruments</a> &nbsp;·&nbsp;
  <a href="#tour"><b>III</b> Tour</a> &nbsp;·&nbsp;
  <a href="#controls"><b>IV</b> Controls</a> &nbsp;·&nbsp;
  <a href="#workings"><b>V</b> Workings</a> &nbsp;·&nbsp;
  <a href="#safety"><b>VI</b> Safety</a> &nbsp;·&nbsp;
  <a href="#notes"><b>VII</b> Notes</a> &nbsp;·&nbsp;
  <a href="#bench"><b>VIII</b> Workbench</a>
</p>

> **Operator's note.** A model working in your editor burns three things at once: **context**, **money** and **your machine**. Embermeter puts all three on one warm, quiet panel beside the chat. It shows what Claude is doing right now, what it has cost, and how many turns remain before the window compacts. When the CPU runs hot, it holds the heavy jobs until the ember cools.
>
> It's one folder that Claude Code loads, with no server, no network and no dependencies.

<a id="install"></a>
<p align="center"><img src="docs/art/section-install.svg" alt="I. Installation" width="880"></p>

You need **Claude Code 2.1.287 or later**. In any session:

```
/plugin install embermeter --marketplace X-Saikat-93/embermeter
```

Answer `y` to add the marketplace, then choose a scope. *User* scope loads it in every session. From a shell:

```sh
claude plugin install embermeter --marketplace X-Saikat-93/embermeter
```

The panel opens with your next session. `/embermeter` brings it back at any time.

<a id="instruments"></a>
<p align="center"><img src="docs/art/section-instruments.svg" alt="II. The Instruments" width="880"></p>

Most dashboards report what the agent already did. Embermeter also **forecasts** what comes next, **explains** its readings, and **protects** the machine underneath.

<p align="center"><img src="docs/art/cluster.svg" alt="Twelve instruments: runway to compact, context composition, health grade, cache analytics, cost burn, rate limits, live flow, tool leaderboard, file heatmap, subagent swimlanes, heat guard, session report" width="880"></p>

<details>
<summary><b>The twelve instruments, in words</b></summary>
<br>

| | Instrument | What it tells you |
|---:|---|---|
| 01 | **Runway to compact** | Learns how much context each turn uses and counts the turns left before auto-compact. |
| 02 | **Context composition** | Messages, system tools, MCP tools, system prompt, memory files, skills and agents, with the compaction line marked. Also every always-loaded file and MCP tool, with its token cost. |
| 03 | **Health grade** | One A–F score from context headroom, tool errors, temperature, denials, rate limits and budget, with the reasons beside it. |
| 04 | **Cache analytics** | Fresh input, cache read, cache write and output tokens. Also cache-hit rate, output speed, and the model behind every turn. |
| 05 | **Cost burn** | Session cost, cost per hour and per turn, and an optional budget with a red line. |
| 06 | **Rate limits** | Every window, how full it is, and a countdown to its reset. |
| 07 | **Live flow** | Prompt → Model → Gate → Tools → Subagents. Particles move only along links that are working. |
| 08 | **Tool leaderboard** | Calls, success and failure split, average and p95 duration, and the slowest calls. |
| 09 | **File heatmap** | Every file read, edited or written, tinted by how much it changed. |
| 10 | **Subagent swimlanes** | Each subagent on a time grid with its model, duration, tools and outcome. Click one to open its transcript. |
| 11 | **Heat guard** | Holds heavy Bash jobs (builds, tests, installs, Docker…) while the CPU is over its limit or the battery is low. Claude is told why. |
| 12 | **Session report** | A one-click Markdown report, plus totals across every session. An optional meter scores how often commands use a wrapper like `rtk`. |

</details>

<a id="tour"></a>
<p align="center"><img src="docs/art/section-tour.svg" alt="III. A Tour of the Panel" width="880"></p>

The panel has seven tabs, and keys `1`–`7` switch between them. It opens on the **Overview**:

<p align="center"><img src="docs/header.svg" alt="Header: health grade, live turn timer, model and session clock" width="640"></p>
<p align="center"><img src="docs/overview.svg" alt="Overview: arc gauges for context, cost, cache hit and temperature; rate limits; live flow; trends; turn timeline" width="640"></p>

<table>
  <tr>
    <td width="50%"><img src="docs/context.svg" alt="Context tab"><br><sub><b>Context:</b> composition bar, auto-compact marker, tokens and cache, always-loaded files and MCP tools</sub></td>
    <td width="50%"><img src="docs/tools.svg" alt="Tools tab"><br><sub><b>Tools:</b> leaderboard with success share, average and p95, slowest calls</sub></td>
  </tr>
  <tr>
    <td><img src="docs/agents.svg" alt="Agents tab"><br><sub><b>Agents:</b> swimlanes on a shared time grid</sub></td>
    <td><img src="docs/files.svg" alt="Files tab"><br><sub><b>Files:</b> heatmap of reads, edits and writes</sub></td>
  </tr>
  <tr>
    <td><img src="docs/system.svg" alt="System tab"><br><sub><b>System:</b> CPU temperature, battery, memory, load, thermal trend, guardrails</sub></td>
    <td><img src="docs/overview-day.svg" alt="Day theme"><br><sub><b>Day:</b> the paper palette, for light editors</sub></td>
  </tr>
</table>

A slim strip rides above the prompt, and the status line carries a one-line summary:

<p align="center"><img src="docs/strip.svg" alt="Strip above the prompt" width="600"></p>

<table>
  <tr>
    <td width="62%" valign="top">

**On the design**

- **An instrument palette, not neon.** *Night* is warm ink with amber, sage, steel and rust. *Day* is paper. Amber is the one signal colour; everything else stays quiet so the signal stands out.
- **Motion that means something.** Readings ease from their last value. Particles, pulses and breathing appear only on stages that are working, and stop when the work stops. `motion: reduced` or `off` calms it all.
- **Responsive.** Under about 76 columns, every page re-flows to one column. Gauges go 2×2 and the flow becomes a vertical rail (right).
- **Steady numbers.** Tabular figures, so values don't jitter as they tick.

</td>
    <td width="38%" align="center"><img src="docs/overview-narrow.svg" alt="Overview in a narrow pane" width="250"></td>
  </tr>
</table>

<a id="controls"></a>
<p align="center"><img src="docs/art/section-controls.svg" alt="IV. Controls" width="880"></p>

| Command | Action |
|---|---|
| `/embermeter` | Open the panel |
| `/embermeter context` · `tools` · `files` · `agents` · `system` · `log` | Open it on that tab |
| `/embermeter report` | Print the session report in the transcript |
| `/embermeter copy` | Copy the report to the clipboard |
| `/embermeter reset` | Zero this session's counters |
| `/embermeter close` | Close the panel |

**Settings.** Open `/config`, or set them under `pluginConfigs.embermeter` in `~/.claude/settings.json`:

```jsonc
{
  "pluginConfigs": {
    "embermeter": {
      "theme": "night",       // or "day"
      "motion": "smooth",     // "reduced" | "off"
      "budgetUsd": 5,         // red line on the cost gauge; 0 = off
      "maxTempC": 80,         // heat guard limit, CPU package temperature
      "commandPrefix": "rtk"  // optional compliance meter
    }
  }
}
```

<details>
<summary><b>Every setting</b></summary>
<br>

| Option | Default | Meaning |
|---|---|---|
| `theme` | `night` | `night` (warm ink) or `day` (paper) |
| `motion` | `smooth` | `smooth`: transitions and live animation · `reduced`: transitions only · `off`: static |
| `openOnStart` | `true` | Open the panel when a session starts |
| `band` | `true` | Show the strip above the prompt |
| `alerts` | `true` | Toast once when context (70%, 85%), temperature, budget or a rate limit (90%) crosses its line |
| `budgetUsd` | `0` | Session budget in USD; `0` turns it off |
| `guard` | `true` | Heat guard on or off |
| `maxTempC` | `80` | CPU temperature limit for the heat guard |
| `minBatteryPct` | `20` | Battery floor for the heat guard, while discharging |
| `heavyPattern` | built-in | Regular expression for the Bash commands the guard treats as heavy |
| `commandPrefix` | empty | Wrapper the compliance meter looks for; empty turns it off |
| `threads` | `0` | CPU threads used to scale the load gauge; `0` detects them |

</details>

| Surface | What you get |
|---|---|
| **VS Code**, **desktop app** | The full animated panel, strip and status line |
| **Terminal** | No SVG there. The same data as text, plus the status line and `/embermeter report` |
| **Linux** | Vitals and heat guard from `/sys` and `/proc` |
| **macOS, Windows** | Vitals read `–` and the heat guard rests. Everything else works |

<a id="workings"></a>
<p align="center"><img src="docs/art/section-workings.svg" alt="V. Inner Workings" width="880"></p>

```mermaid
flowchart LR
  subgraph CC[Claude Code engine]
    E[events<br/>prompt · turn · tool · agent · compact]
    U[session.usage<br/>context · cost · rate limits]
  end
  subgraph EM[Embermeter]
    R[register.tsx<br/>hooks · sensors · commands]
    C[core.ts<br/>pure state + analytics]
    D[draw.ts<br/>pure SVG builders]
  end
  S[/sys · /proc<br/>read-only/]
  E --> R
  U --> R
  S --> R
  R -->|board| C
  C -->|board| D
  D -->|SVG| P[Panel · strip · status line]
```

| Layer | Role |
|---|---|
| `hooks/register.tsx` | The only file that touches the engine: events, sensors, `/embermeter`, the panel |
| `hooks/core.ts` | Pure state and analytics: forecast, health, alerts, heat-guard decision, report. No I/O, unit-tested |
| `hooks/draw.ts` | The design system and pure SVG builders: gauges, sparklines, flow, composition, swimlanes, heatmap |
| `types/index.d.ts` | The state contract, checked by `claude plugin validate` |

**Running costs.** It runs one timer. The clock ticks each second only while work runs. Sensors are read every 5 seconds, and the context breakdown at most every 15. Every list is capped, so memory stays flat across long sessions. The full engineering tour is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

<a id="safety"></a>
<p align="center"><img src="docs/art/section-safety.svg" alt="VI. Safety Notice" width="880"></p>

<p align="center"><img src="docs/art/spec.svg" alt="Specifications: no network, no model calls, no files written, no processes, zero dependencies, one timer" width="880"></p>

- **No network, no model calls.** The context breakdown uses the engine's local estimate, which sends nothing.
- **Read-only on your machine.** It reads `/sys/class/thermal`, `/sys/class/power_supply`, `/sys/devices/system/cpu/online`, `/proc/loadavg` and `/proc/meminfo`, and writes nothing.
- **Local memory only.** Across sessions it keeps just four numbers: sessions, turns, calls and cost. They live in Claude Code's own plugin store.
- **Fail-open.** If any hook faults, it passes the event on unchanged. The heat guard is the only part that can refuse anything: a Bash command that matches the heavy pattern, while the machine is hot or low on battery.
- **Escaped drawing.** Every path, command and agent name passes through a single escaping function before it reaches SVG, and SVG renders in image mode, where scripts don't run.

Found a hole? Please report it privately. See [SECURITY.md](SECURITY.md).

<a id="notes"></a>
<p align="center"><img src="docs/art/section-notes.svg" alt="VII. Field Notes" width="880"></p>

<details>
<summary><b>The panel doesn't appear.</b></summary>
<br>

Run `/embermeter`. If the surface can't place a panel, for example a plain terminal, the strip, the status line and `/embermeter report` still carry every reading.
</details>

<details>
<summary><b>The temperature reads higher than my system monitor.</b></summary>
<br>

Embermeter reads CPU sensors first (`x86_pkg_temp`, `TCPU`, `coretemp`, `k10temp`, `cpu-thermal`). It falls back to the hottest zone only when none of those exist. ACPI zones (`acpitz`) often report trip points far above the real die temperature, so they're skipped when a CPU sensor is present.
</details>

<details>
<summary><b>The heat guard held a command that isn't heavy.</b></summary>
<br>

The built-in pattern matches whole command words, such as `npm test`, `cargo build` and `pnpm install`, but never paths like `tests/a.test.ts`. Narrow it with `heavyPattern`, raise `maxTempC`, or set `guard: false`.
</details>

<details>
<summary><b>Do the numbers match my bill?</b></summary>
<br>

Cost and rate limits come from Claude Code's own `session.usage`. The context composition is the engine's local estimate: a close guide, not an invoice.
</details>

<details>
<summary><b>Does it slow Claude down?</b></summary>
<br>

Not noticeably. Each hook makes one small in-memory update and passes the event on, with no network and no file reads on the tool path. The heat guard decides from the last cached sensor reading with a single regex test.
</details>

**On the bench next:**
- **Per-turn waterfall:** tokens and cost turn by turn.
- **Context growth by tool:** which tool outputs eat the window.
- **Git awareness:** branch, dirty files and lines changed.
- **Background jobs:** a watch on dev servers and watchers left running.
- **Cross-session history:** charts from lifetime stats.
- **Vitals for macOS and Windows.**

Ideas are welcome in [Discussions](https://github.com/X-Saikat-93/embermeter/discussions).

<a id="bench"></a>
<p align="center"><img src="docs/art/section-bench.svg" alt="VIII. The Workbench" width="880"></p>

```sh
git clone https://github.com/X-Saikat-93/embermeter && cd embermeter
claude --plugin-dir .            # run it live; edits hot-reload
claude plugin validate .         # manifest, hooks and state contract
claude plugin test .             # unit and UI tests on every surface
node scripts/render-docs.ts      # regenerate the panel screenshots
node scripts/render-art.ts       # regenerate the README art
```

Rules of the workbench, the design rules, and the release steps are in [CONTRIBUTING.md](CONTRIBUTING.md). Released under the [MIT License](LICENSE) © X-Saikat-93.

<p align="center">
  <img src="docs/art/signoff.svg" alt="Keep the ember low." width="880">
</p>

<p align="center"><sub>Embermeter is an independent community project. It's not affiliated with or endorsed by Anthropic. “Claude” and “Claude Code” are trademarks of Anthropic, PBC.</sub></p>
