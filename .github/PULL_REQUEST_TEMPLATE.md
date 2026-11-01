## What and why

<!-- One or two sentences: what changes, and the problem it solves. Link the issue if there is one. -->

## Screenshots

<!-- For visual changes: before and after, night and day theme, and a narrow pane if layout changed. -->

## Checklist

- [ ] `claude plugin validate .` passes
- [ ] `claude plugin test .` passes, and new logic in `core.ts` has a test
- [ ] Hooks still fail open (`.catch(($, e, next) => next(e))`)
- [ ] Every new string drawn into an SVG goes through `txt()` (escaped)
- [ ] No network calls, no file writes, no new dependencies
- [ ] Colours come from `PALETTES` in `draw.ts`; motion respects the `motion` setting
- [ ] README images regenerated (`node scripts/render-docs.ts`) if the look changed
- [ ] `CHANGELOG.md` updated under *Unreleased*
