import fixture from '../../fixtures/catalog.json';
import { indexCatalog, type Catalog } from '../catalog';
import {
  absorbPageProgress,
  achievements,
  activeDays,
  addDays,
  currentStreak,
  dayKey,
  EMPTY_PROGRESS,
  goalHistory,
  heatmap,
  levelFor,
  newlyEarned,
  parseProgress,
  recentCompletions,
  streakAtRisk,
  type ProgressState,
} from '../progress';

const index = indexCatalog(fixture as Catalog);
const lessons = [...index.byId.values()].map((r) => r.lesson);
const NOW = new Date(2026, 10, 16, 15, 0); // Mon 16 Nov 2026, 3 pm local

function done(ids: string[], at: Date[]): ProgressState['completed'] {
  return Object.fromEntries(ids.map((id, i) => [id, { at: at[i].toISOString(), code: '', attempts: 1 }]));
}

describe('parseProgress', () => {
  it('reads a v2 object or its JSON string, and nothing else', () => {
    const p = parseProgress(JSON.stringify({ ...EMPTY_PROGRESS, xp: 30 }));
    expect(p?.xp).toBe(30);
    expect(parseProgress({ version: 1 })).toBeNull();
    expect(parseProgress('not json')).toBeNull();
    expect(parseProgress(null)).toBeNull();
  });

  it('drops broken parts instead of throwing', () => {
    const p = parseProgress({ version: 2, xp: -5, streak: 'x', lastActiveDate: 'yesterday', completed: { a: { at: '2026-01-01T00:00:00Z' }, b: 'nope', c: { code: 'x' } }, drafts: { a: 1, b: 'code' } });
    expect(p).not.toBeNull();
    expect(p!.xp).toBe(0);
    expect(p!.streak).toBe(0);
    expect(p!.lastActiveDate).toBeNull();
    expect(Object.keys(p!.completed)).toEqual(['a']);
    expect(p!.completed.a.attempts).toBe(1);
    expect(p!.drafts).toEqual({ b: 'code' });
    expect(p!.audio.enabled).toBe(false);
  });
});

describe('absorbPageProgress', () => {
  it('takes the page copy but never loses a completion the app had', () => {
    const local: ProgressState = { ...EMPTY_PROGRESS, xp: 20, streak: 2, bestStreak: 4, lastActiveDate: '2026-11-15', completed: done(['a'], [new Date('2026-11-15T10:00:00Z')]) };
    const page: ProgressState = { ...EMPTY_PROGRESS, xp: 10, streak: 3, bestStreak: 3, lastActiveDate: '2026-11-16', completed: done(['b'], [new Date('2026-11-16T10:00:00Z')]) };
    const out = absorbPageProgress(local, page);
    expect(Object.keys(out.completed).sort()).toEqual(['a', 'b']);
    expect(out.streak).toBe(3);
    expect(out.lastActiveDate).toBe('2026-11-16');
    expect(out.bestStreak).toBe(4);
    expect(out.xp).toBe(20);
  });

  it('is the page copy when the page already has everything', () => {
    const local: ProgressState = { ...EMPTY_PROGRESS, completed: done(['a'], [new Date('2026-11-15T10:00:00Z')]) };
    const page: ProgressState = { ...EMPTY_PROGRESS, xp: 50, completed: { ...local.completed, ...done(['b'], [new Date()]) } };
    expect(absorbPageProgress(local, page).xp).toBe(50);
  });
});

describe('streak', () => {
  const base = { ...EMPTY_PROGRESS, streak: 5 };
  it('stands through yesterday and lapses after a missed day', () => {
    expect(currentStreak({ ...base, lastActiveDate: dayKey(NOW) }, NOW)).toBe(5);
    expect(currentStreak({ ...base, lastActiveDate: addDays(dayKey(NOW), -1) }, NOW)).toBe(5);
    expect(currentStreak({ ...base, lastActiveDate: addDays(dayKey(NOW), -2) }, NOW)).toBe(0);
    expect(currentStreak(EMPTY_PROGRESS, NOW)).toBe(0);
  });
  it('is at risk only the day after the last active day', () => {
    expect(streakAtRisk({ ...base, lastActiveDate: addDays(dayKey(NOW), -1) }, NOW)).toBe(true);
    expect(streakAtRisk({ ...base, lastActiveDate: dayKey(NOW) }, NOW)).toBe(false);
    expect(streakAtRisk({ ...base, lastActiveDate: addDays(dayKey(NOW), -3) }, NOW)).toBe(false);
  });
  it('adds days across month ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('levels', () => {
  it('uses the site levels: 200 XP each with rank names', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, rank: 'Rookie', intoLevel: 0 });
    expect(levelFor(450)).toMatchObject({ level: 3, rank: 'Mechanic', intoLevel: 50 });
    expect(levelFor(100000).rank).toBe('Legend');
  });
});

describe('activity', () => {
  const p: ProgressState = {
    ...EMPTY_PROGRESS,
    completed: done([lessons[0].id, lessons[1].id, lessons[2].id], [new Date(2026, 10, 16, 9), new Date(2026, 10, 16, 10), new Date(2026, 10, 14, 9)]),
  };
  it('lists active days from first-pass times', () => {
    expect([...activeDays(p)].sort()).toEqual(['2026-11-14', '2026-11-16']);
  });
  it('sums minutes per day against the goal', () => {
    const h = goalHistory(p, index, 5, NOW, 3);
    expect(h.map((d) => d.day)).toEqual(['2026-11-14', '2026-11-15', '2026-11-16']);
    expect(h[1]).toEqual({ day: '2026-11-15', minutes: 0, met: false });
    expect(h[2].minutes).toBe((lessons[0].minutes ?? 0) + (lessons[1].minutes ?? 0));
  });
  it('lays out a Monday-first heatmap ending this week, future days empty', () => {
    const grid = heatmap(p, new Date(2026, 10, 18), 2); // a Wednesday
    expect(grid).toHaveLength(2);
    expect(grid[1][0]?.day).toBe('2026-11-16');
    expect(grid[1][0]?.active).toBe(true);
    expect(grid[1][2]?.day).toBe('2026-11-18');
    expect(grid[1][3]).toBeNull();
    expect(grid[0][5]?.day).toBe('2026-11-14');
    expect(grid[0][5]?.active).toBe(true);
  });
  it('orders recent completions newest first', () => {
    expect(recentCompletions(p, 2).map((r) => r.id)).toEqual([lessons[1].id, lessons[0].id]);
  });
});

describe('achievements', () => {
  it('awards only what the numbers show', () => {
    const none = achievements(EMPTY_PROGRESS, index);
    expect(none.every((a) => !a.earned)).toBe(true);
    const module = [...index.modules.values()][0].module;
    const p: ProgressState = { ...EMPTY_PROGRESS, xp: 1200, streak: 3, bestStreak: 3, completed: done(module.lessons.map((l) => l.id), module.lessons.map(() => NOW)) };
    const got = achievements(p, index);
    const earned = new Set(got.filter((a) => a.earned).map((a) => a.id));
    expect(earned.has('first-lesson')).toBe(true);
    expect(earned.has('streak-3')).toBe(true);
    expect(earned.has('streak-7')).toBe(false);
    expect(earned.has('xp-1000')).toBe(true);
    expect(earned.has('module')).toBe(true);
    expect(got.find((a) => a.id === 'streak-7')!.progress).toBeCloseTo(3 / 7);
    expect(newlyEarned(none, got).map((a) => a.id)).toContain('first-lesson');
    expect(newlyEarned(got, got)).toEqual([]);
  });
});
