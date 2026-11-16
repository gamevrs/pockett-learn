import { compareVersions, needsUpdate, parseAppConfig } from '../app-config';
import { embedUrl, injectedGlobal, isSiteUrl, parseEmbedMessage, themeMessageScript } from '../bridge';
import { EMPTY_PROGRESS } from '../progress';
import { planReminders } from '../reminders';

describe('parseEmbedMessage', () => {
  const ok = (m: unknown) => parseEmbedMessage(JSON.stringify(m));
  it('accepts every contract message', () => {
    expect(ok({ type: 'ready', lessonId: 'fnd-bits-1', title: 'Bits' })).toEqual({ type: 'ready', lessonId: 'fnd-bits-1', title: 'Bits' });
    expect(ok({ type: 'step', index: 2, total: 8, title: 'x' })).toEqual({ type: 'step', index: 2, total: 8, title: 'x' });
    expect(ok({ type: 'answer', correct: true })).toEqual({ type: 'answer', correct: true });
    expect(ok({ type: 'lessonComplete', lessonId: 'a', xp: 20 })).toEqual({ type: 'lessonComplete', lessonId: 'a', xp: 20 });
    expect(ok({ type: 'progress', data: { ...EMPTY_PROGRESS, xp: 5 } })).toMatchObject({ type: 'progress', data: { xp: 5 } });
    expect(ok({ type: 'navigate', path: '/learn/x' })).toEqual({ type: 'navigate', path: '/learn/x' });
    expect(ok({ type: 'external', url: 'https://example.com' })).toEqual({ type: 'external', url: 'https://example.com' });
    expect(ok({ type: 'close' })).toEqual({ type: 'close' });
    expect(ok({ type: 'auth', event: 'signedOut' })).toEqual({ type: 'auth', event: 'signedOut' });
  });
  it('drops anything malformed', () => {
    expect(parseEmbedMessage('nope')).toBeNull();
    expect(ok({ type: 'step', index: 1, total: 0 })).toBeNull();
    expect(ok({ type: 'step', index: -1, total: 3 })).toBeNull();
    expect(ok({ type: 'answer', correct: 'yes' })).toBeNull();
    expect(ok({ type: 'navigate', path: '//evil.example/x' })).toBeNull();
    expect(ok({ type: 'navigate', path: 'https://x' })).toBeNull();
    expect(ok({ type: 'external', url: 'javascript:alert(1)' })).toBeNull();
    expect(ok({ type: 'progress', data: { version: 1 } })).toBeNull();
    expect(ok({ type: 'auth', event: 'hacked' })).toBeNull();
    expect(ok({ type: 'unknown' })).toBeNull();
  });
  it('clamps a step index past the end', () => {
    expect(ok({ type: 'step', index: 9, total: 3, title: '' })).toMatchObject({ index: 2 });
  });
});

describe('injected scripts', () => {
  it('defines the global and cannot be broken out of', () => {
    const js = injectedGlobal({ platform: 'ios', appVersion: '1.0.0', theme: 'dark', session: null, progress: { ...EMPTY_PROGRESS, drafts: { a: '</script><script>alert(1) ' } } });
    expect(js.startsWith('window.__POCKETT_APP__ = ')).toBe(true);
    expect(js).not.toContain('</script>');
    expect(js).not.toContain(' ');
    const json = js.slice('window.__POCKETT_APP__ = '.length, js.lastIndexOf(';\ntrue;'));
    expect(JSON.parse(json).progress.drafts.a).toBe('</script><script>alert(1) ');
  });
  it('sends the theme as a message event with a JSON string', () => {
    expect(themeMessageScript('light')).toContain(JSON.stringify(JSON.stringify({ type: 'theme', theme: 'light' })));
  });
  it('builds embed URLs and recognises the site', () => {
    expect(embedUrl('https://www.pockett.ai/', '/learn/a', 'dark')).toBe('https://www.pockett.ai/embed/learn/a?theme=dark');
    expect(embedUrl('http://localhost:3170', '/learn/a', 'light', false)).toBe('http://localhost:3170/learn/a?theme=light');
    expect(isSiteUrl('https://www.pockett.ai/embed/x', 'https://www.pockett.ai')).toBe(true);
    expect(isSiteUrl('https://evil.example/', 'https://www.pockett.ai')).toBe(false);
    expect(isSiteUrl('about:blank', 'https://www.pockett.ai')).toBe(true);
  });
});

describe('app config', () => {
  it('compares versions numerically', () => {
    expect(compareVersions('1.10.0', '1.9.2')).toBe(1);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.9.9', '1.0.0')).toBe(-1);
  });
  it('gates only below the minimum', () => {
    const c = parseAppConfig({ minVersion: '1.2.0', latestVersion: '1.3.0', announcements: [{ id: 'a', title: 't', body: 'b', date: '2026-11-01' }, { id: 1 }] })!;
    expect(c.announcements).toHaveLength(1);
    expect(needsUpdate('1.1.9', c)).toBe(true);
    expect(needsUpdate('1.2.0', c)).toBe(false);
    expect(parseAppConfig({ minVersion: 'latest' })).toBeNull();
  });
});

describe('planReminders', () => {
  const now = new Date(2026, 10, 16, 15, 0);
  const settings = { dailyReminder: true, reminderTime: 18 * 60, streakReminder: true };
  it('schedules a week of daily reminders from today', () => {
    const plan = planReminders(EMPTY_PROGRESS, settings, now);
    expect(plan.filter((n) => n.id.startsWith('daily-'))).toHaveLength(7);
    expect(plan[0].at.getHours()).toBe(18);
  });
  it('skips today once a lesson is done, and warns tomorrow evening about the streak', () => {
    const p = { ...EMPTY_PROGRESS, streak: 4, lastActiveDate: '2026-11-16' };
    const plan = planReminders(p, settings, now);
    expect(plan.some((n) => n.id === 'daily-2026-11-16')).toBe(false);
    const streak = plan.find((n) => n.id.startsWith('streak-'))!;
    expect(streak.id).toBe('streak-2026-11-17');
    expect(streak.title).toBe('Keep your 4-day streak');
    expect(streak.at.getHours()).toBe(20);
  });
  it('warns this evening when the streak ends tonight, and nothing when it has lapsed', () => {
    expect(planReminders({ ...EMPTY_PROGRESS, streak: 2, lastActiveDate: '2026-11-15' }, settings, now).some((n) => n.id === 'streak-2026-11-16')).toBe(true);
    expect(planReminders({ ...EMPTY_PROGRESS, streak: 2, lastActiveDate: '2026-11-13' }, settings, now).some((n) => n.id.startsWith('streak-'))).toBe(false);
  });
  it('schedules nothing when both are off, and nothing in the past', () => {
    expect(planReminders(EMPTY_PROGRESS, { dailyReminder: false, reminderTime: 600, streakReminder: false }, now)).toEqual([]);
    const late = planReminders(EMPTY_PROGRESS, { ...settings, reminderTime: 9 * 60 }, now);
    expect(late.some((n) => n.id === 'daily-2026-11-16')).toBe(false);
  });
});
