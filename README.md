# cc-momentum

**Is your Claude Code usage growing or declining?**

Shows your week-by-week session count trend and classifies your current momentum.

## Usage

```bash
npx cc-momentum
```

Or use the browser version (no install):

→ **[yurukusa.github.io/cc-momentum](https://yurukusa.github.io/cc-momentum/)**

Drag in your `~/.claude` folder. Everything runs locally — nothing is uploaded.

## Sample output

```
cc-momentum — Week-by-week Claude Code trend

  2026-W02  ████░░░░░░░░░░░░░░░░░░░░░░░░░░   20
  2026-W03  ██████░░░░░░░░░░░░░░░░░░░░░░░░   32
  2026-W04  ███░░░░░░░░░░░░░░░░░░░░░░░░░░░   13
  2026-W05  ████████████████░░░░░░░░░░░░░░   77
  2026-W06  ██████████████████████████████  149 ◀ peak
  2026-W07  █████████████████░░░░░░░░░░░░░   83
  2026-W08  ███████████████░░░░░░░░░░░░░░░   75
  2026-W09  ███████░░░░░░░░░░░░░░░░░░░░░░░   36
  2026-W10  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    3 (in progress)

───────────────────────────────────────────────────────
  Trend (3w):  → Stable
  Recent avg: 65 / week  (-19% vs prev 3 weeks)

  Peak week:   2026-W06 — 149 sessions
  Total:       488 sessions across 9 weeks
```

## Trend classifications

| Trend | Change | Meaning |
|-------|--------|---------|
| 🚀 Accelerating | > +50% | Rapid adoption / intensive phase |
| 📈 Growing | +20–50% | Steady increase |
| → Stable | ±20% | Consistent usage pattern |
| 📉 Declining | -20–50% | Usage tapering off |
| ⬇️ Sharply Declining | > -50% | Significant drop-off |

*Note: The current (incomplete) week is excluded from trend calculation and marked "(in progress)".*

## Options

```bash
npx cc-momentum               # Last 12 weeks
npx cc-momentum --weeks=24   # Last 24 weeks
npx cc-momentum --json       # JSON output for dashboards
```

## Part of cc-toolkit

cc-momentum is tool #48 in [cc-toolkit](https://yurukusa.github.io/cc-toolkit/) — 49 free tools for Claude Code users.

Related tools:
- [cc-streak](https://github.com/yurukusa/cc-streak) — Consecutive days of usage
- [cc-gap](https://github.com/yurukusa/cc-gap) — Time between sessions
- [cc-session-length](https://github.com/yurukusa/cc-session-length) — How long do sessions last?

---

**GitHub**: [yurukusa/cc-momentum](https://github.com/yurukusa/cc-momentum)
**Try it**: `npx cc-momentum`
