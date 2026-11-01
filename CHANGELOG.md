# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-11-01

First public release.

### Added
- Live pane with seven tabs: Overview, Context, Tools, Files, Agents, System and Log. Keys `1`–`7` switch tabs.
- Arc gauges with red-line markers for context (auto-compact point), cost (budget), cache hit and CPU temperature.
- Context composition by category, with the always-loaded memory files and MCP tools and their token cost.
- Runway forecast: turns left before auto-compact.
- Token analytics: fresh input, cache read and write, output, cache-hit rate, output speed and model per turn.
- Cost per hour and per turn, an optional budget, and every rate-limit window with its reset countdown.
- Live flow diagram (Prompt → Model → Gate → Tools → Subagents) with particles on active links.
- Tool leaderboard with success share, average and p95. File heatmap. Subagent swimlanes that open transcripts.
- Health grade A–F, with its reasons.
- Heat guard: holds heavy Bash jobs while the CPU is hot or the battery is low.
- Optional command-prefix compliance meter.
- Strip above the prompt, status-line summary and toast alerts.
- `/embermeter` command with `report`, `copy`, `reset`, `close` and tab names.
- Night and day palettes, `motion` setting (smooth, reduced, off), and a responsive narrow layout.
- Lifetime totals across sessions.

### Security
- No network, no file writes, no processes. Every hook fails open. All SVG text is escaped.

[Unreleased]: https://github.com/X-Saikat-93/embermeter/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/X-Saikat-93/embermeter/releases/tag/v1.0.0
