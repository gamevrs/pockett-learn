/**
 * GET /api/app/config (contract §1): the force-update floor and the announcements the Notifications inbox lists.
 */

export interface Announcement {
  id: string;
  title: string;
  body: string;
  /** A full URL (opened in the in-app browser) or a site path (opened in the app when it can be). */
  url?: string;
  /** ISO date. */
  date: string;
}

export interface AppConfig {
  minVersion: string;
  latestVersion: string;
  announcements: Announcement[];
}

export const DEFAULT_CONFIG: AppConfig = { minVersion: '0.0.0', latestVersion: '0.0.0', announcements: [] };

export function parseAppConfig(raw: unknown): AppConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const version = (v: unknown) => (typeof v === 'string' && /^\d+(\.\d+){0,2}$/.test(v) ? v : null);
  const minVersion = version(c.minVersion);
  if (!minVersion) return null;
  const announcements: Announcement[] = [];
  if (Array.isArray(c.announcements)) {
    for (const a of c.announcements) {
      if (!a || typeof a !== 'object') continue;
      const x = a as Record<string, unknown>;
      if (typeof x.id !== 'string' || typeof x.title !== 'string' || typeof x.body !== 'string' || typeof x.date !== 'string') continue;
      announcements.push({ id: x.id, title: x.title, body: x.body, date: x.date, ...(typeof x.url === 'string' && (/^https?:\/\//.test(x.url) || (x.url.startsWith('/') && !x.url.startsWith('//'))) ? { url: x.url } : {}) });
    }
  }
  return { minVersion, latestVersion: version(c.latestVersion) ?? minVersion, announcements };
}

/** -1, 0 or 1, comparing dotted numeric versions ("1.10.0" > "1.9.2"); missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

export function needsUpdate(appVersion: string, config: AppConfig): boolean {
  return compareVersions(appVersion, config.minVersion) < 0;
}
