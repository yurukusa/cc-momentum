#!/usr/bin/env node
import { readdir, open } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const VERSION = '1.0.0';
const MAX_CHUNK = 4096;

function parseArgs(argv) {
  const args = { weeks: 12, json: false };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--weeks=')) args.weeks = parseInt(a.slice(8)) || 12;
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') {
      console.log([
        `cc-momentum v${VERSION}`,
        '',
        'Usage: cc-momentum [options]',
        '',
        'Options:',
        '  --weeks=N   Show last N weeks (default: 12)',
        '  --json      Output JSON for piping',
        '  --help      Show this help',
        '',
        'Shows your week-by-week Claude Code session count trend.',
      ].join('\n'));
      process.exit(0);
    }
  }
  return args;
}

async function getFirstTimestamp(path) {
  let fh;
  try {
    fh = await open(path, 'r');
    const buf = Buffer.alloc(MAX_CHUNK);
    const { bytesRead } = await fh.read(buf, 0, MAX_CHUNK, 0);
    const text = buf.subarray(0, bytesRead).toString('utf8');
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const d = JSON.parse(line);
        if (d.timestamp) return new Date(d.timestamp);
      } catch {}
    }
  } catch {}
  finally { await fh?.close(); }
  return null;
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function main() {
  const args = parseArgs(process.argv);
  const claudeDir = join(homedir(), '.claude', 'projects');

  const weekCounts = new Map();
  let projectDirs;
  try { projectDirs = await readdir(claudeDir); } catch {
    console.error('~/.claude/projects not found');
    process.exit(1);
  }

  for (const pd of projectDirs) {
    const pdPath = join(claudeDir, pd);
    let files;
    try { files = await readdir(pdPath); } catch { continue; }
    for (const name of files) {
      if (!name.endsWith('.jsonl')) continue;
      const ts = await getFirstTimestamp(join(pdPath, name));
      if (!ts) continue;
      const week = getISOWeek(ts);
      weekCounts.set(week, (weekCounts.get(week) || 0) + 1);
    }
  }

  if (!weekCounts.size) {
    console.log('No sessions found.');
    process.exit(0);
  }

  const allWeeks = [...weekCounts.keys()].sort();
  const firstWeek = allWeeks[0];
  const lastWeek = allWeeks[allWeeks.length - 1];

  // Fill in gaps (weeks with 0 sessions)
  const weeks = [];
  let cursor = new Date(firstWeek.replace('W', '') + '-1'); // approximate
  // Build the full range of ISO weeks
  const allKeys = new Set(weekCounts.keys());
  // Generate all ISO weeks from first to last
  let [fy, fw] = firstWeek.split('-W').map(Number);
  let [ly, lw] = lastWeek.split('-W').map(Number);

  function nextWeek(y, w) {
    // Get max weeks for that year
    const dec28 = new Date(Date.UTC(y, 11, 28));
    const maxW = getISOWeek(dec28).endsWith('53') ? 53 : 52;
    if (w >= maxW) return [y + 1, 1];
    return [y, w + 1];
  }

  let cy = fy, cw = fw;
  while (true) {
    const key = `${cy}-W${String(cw).padStart(2, '0')}`;
    weeks.push({ key, count: weekCounts.get(key) || 0 });
    if (key === lastWeek) break;
    [cy, cw] = nextWeek(cy, cw);
    if (cy > ly + 1) break; // safety
  }

  // Show last N weeks
  const display = weeks.slice(-args.weeks);

  // Current week (may be incomplete) — mark it but exclude from trend
  const currentWeekKey = getISOWeek(new Date());
  const isCurrentWeekPresent = weeks.length > 0 && weeks[weeks.length - 1].key === currentWeekKey;

  // Trend: compare last 3 complete weeks vs previous 3 weeks
  const completeWeeks = isCurrentWeekPresent ? weeks.slice(0, -1) : weeks;
  const recentWeeks = completeWeeks.slice(-3);
  const prevWeeks = completeWeeks.slice(-6, -3);
  const recentAvg = recentWeeks.reduce((s, w) => s + w.count, 0) / Math.max(recentWeeks.length, 1);
  const prevAvg = prevWeeks.reduce((s, w) => s + w.count, 0) / Math.max(prevWeeks.length, 1);
  const trendPct = prevAvg > 0 ? ((recentAvg - prevAvg) / prevAvg * 100) : 0;
  const peakWeek = weeks.reduce((a, b) => a.count >= b.count ? a : b);
  const totalSessions = weeks.reduce((s, w) => s + w.count, 0);

  let trendLabel, trendColor;
  if (trendPct >= 50)       { trendLabel = '🚀 Accelerating';       trendColor = 'green'; }
  else if (trendPct >= 20)  { trendLabel = '📈 Growing';             trendColor = 'green'; }
  else if (trendPct >= -20) { trendLabel = '→  Stable';              trendColor = 'yellow'; }
  else if (trendPct >= -50) { trendLabel = '📉 Declining';           trendColor = 'orange'; }
  else                      { trendLabel = '⬇️  Sharply Declining';   trendColor = 'red'; }

  if (args.json) {
    console.log(JSON.stringify({
      totalSessions,
      weeks: weeks.map(w => ({ week: w.key, sessions: w.count })),
      peakWeek: peakWeek.key,
      peakCount: peakWeek.count,
      recentAvg: Math.round(recentAvg),
      prevAvg: Math.round(prevAvg),
      trendPct: Math.round(trendPct),
      trend: trendLabel,
    }, null, 2));
    return;
  }

  const C = {
    reset: '\x1b[0m', bold: '\x1b[1m',
    green: '\x1b[32m', yellow: '\x1b[33m',
    orange: '\x1b[38;5;214m', red: '\x1b[31m',
    purple: '\x1b[35m', cyan: '\x1b[36m',
    muted: '\x1b[90m',
  };
  const tc = trendColor === 'green' ? C.green
           : trendColor === 'yellow' ? C.yellow
           : trendColor === 'orange' ? C.orange
           : C.red;

  console.log(`\n${C.purple}${C.bold}cc-momentum${C.reset} — Week-by-week Claude Code trend\n`);

  const maxCount = Math.max(...display.map(w => w.count), 1);

  for (const w of display) {
    const barWidth = Math.round(w.count / maxCount * 30);
    const isPeak = w.key === peakWeek.key;
    const isCurrent = w.key === currentWeekKey;
    const color = isPeak ? C.purple : w.count > recentAvg * 1.2 ? C.cyan : C.muted;
    const filled = '█'.repeat(barWidth);
    const empty  = '░'.repeat(30 - barWidth);
    const suffix = isPeak ? C.purple + ' ◀ peak' : isCurrent ? C.muted + ' (in progress)' : '';
    console.log(
      `  ${C.muted}${w.key}${C.reset}  ` +
      `${color}${filled}${C.muted}${empty}${C.reset}  ` +
      `${C.muted}${String(w.count).padStart(3)}${suffix}${C.reset}`
    );
  }

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  ${C.cyan}Trend (4w):${C.reset}  ${tc}${C.bold}${trendLabel}${C.reset}`);
  const sign = trendPct >= 0 ? '+' : '';
  console.log(`  ${C.muted}Recent avg: ${Math.round(recentAvg)} / week  (${sign}${Math.round(trendPct)}% vs prev 3 weeks)${C.reset}`);
  console.log(`\n  ${C.muted}Peak week:${C.reset}   ${C.purple}${peakWeek.key}${C.reset} — ${C.bold}${peakWeek.count} sessions${C.reset}`);
  console.log(`  ${C.muted}Total:${C.reset}       ${C.bold}${totalSessions} sessions${C.reset} across ${C.bold}${weeks.length} weeks${C.reset}`);
  console.log();
}

main().catch(e => { console.error(e.message); process.exit(1); });
