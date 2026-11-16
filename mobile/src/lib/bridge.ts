/**
 * The app ⇄ embed page protocol (contract §2). Parsing is strict: a message that does not match its type exactly
 * is dropped, since the page is a web page and anything it posts is untrusted input.
 */
import { parseProgress, type ProgressState } from './progress';

export type EmbedMessage =
  | { type: 'ready'; lessonId: string; title: string }
  | { type: 'step'; index: number; total: number; title: string }
  | { type: 'answer'; correct: boolean }
  | { type: 'lessonComplete'; lessonId: string; xp: number }
  | { type: 'progress'; data: ProgressState }
  | { type: 'navigate'; path: string }
  | { type: 'external'; url: string }
  | { type: 'close' }
  | { type: 'auth'; event: 'signedIn' | 'signedOut' };

const str = (v: unknown, max = 500): v is string => typeof v === 'string' && v.length <= max;
const int = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 10_000;

export function parseEmbedMessage(raw: string): EmbedMessage | null {
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!msg || typeof msg !== 'object') return null;
  const m = msg as Record<string, unknown>;
  switch (m.type) {
    case 'ready':
      return str(m.lessonId) ? { type: 'ready', lessonId: m.lessonId, title: str(m.title) ? m.title : '' } : null;
    case 'step':
      return int(m.index) && int(m.total) && m.total > 0 ? { type: 'step', index: Math.min(m.index, m.total - 1), total: m.total, title: str(m.title) ? m.title : '' } : null;
    case 'answer':
      return typeof m.correct === 'boolean' ? { type: 'answer', correct: m.correct } : null;
    case 'lessonComplete':
      return str(m.lessonId) ? { type: 'lessonComplete', lessonId: m.lessonId, xp: int(m.xp) ? m.xp : 0 } : null;
    case 'progress': {
      const data = parseProgress(m.data);
      return data ? { type: 'progress', data } : null;
    }
    case 'navigate':
      return str(m.path, 2000) && m.path.startsWith('/') && !m.path.startsWith('//') ? { type: 'navigate', path: m.path } : null;
    case 'external':
      return str(m.url, 4000) && /^https?:\/\//i.test(m.url) ? { type: 'external', url: m.url } : null;
    case 'close':
      return { type: 'close' };
    case 'auth':
      return m.event === 'signedIn' || m.event === 'signedOut' ? { type: 'auth', event: m.event } : null;
    default:
      return null;
  }
}

export interface AppGlobal {
  platform: 'ios' | 'android';
  appVersion: string;
  theme: 'dark' | 'light';
  session: { access_token: string; refresh_token: string } | null;
  progress: ProgressState | null;
}

/**
 * The script run in the page before its own scripts (injectedJavaScriptBeforeContentLoaded): defines
 * window.__POCKETT_APP__. JSON is a subset of JS, but U+2028/2029 and "</script" are escaped so no value can end
 * the script or break the string.
 */
export function injectedGlobal(app: AppGlobal): string {
  const json = JSON.stringify(app).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029').replace(/<\//g, '<\\/');
  return `window.__POCKETT_APP__ = ${json};\ntrue;`;
}

/** The script that tells a loaded page the theme changed (contract §2, "Native → page later"). */
export function themeMessageScript(theme: 'dark' | 'light'): string {
  const data = JSON.stringify(JSON.stringify({ type: 'theme', theme }));
  return `window.dispatchEvent(new MessageEvent("message", { data: ${data} }));\ntrue;`;
}

/** The URL the WebView loads for a site path: /embed + path, with the theme. */
export function embedUrl(site: string, path: string, theme: 'dark' | 'light', embed = true): string {
  const base = site.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  const sep = p.includes('?') ? '&' : '?';
  return `${base}${embed ? '/embed' : ''}${p}${sep}theme=${theme}`;
}

/**
 * Whether the WebView may load a URL itself: only pages on the site (and its code frame, which the page loads in
 * an iframe). Anything else opens in the in-app browser.
 */
export function isSiteUrl(url: string, site: string): boolean {
  try {
    const u = new URL(url);
    const s = new URL(site);
    return u.origin === s.origin || u.protocol === 'about:' || u.protocol === 'data:' || u.protocol === 'blob:';
  } catch {
    return url.startsWith('about:');
  }
}
