/**
 * Where a link into the app goes. Lesson links, from the site's own domain or the pockett:// scheme, become the
 * app's Lesson route; the lesson's site path rides along so a lesson newer than the cached catalog still opens.
 * Null for anything that is not a lesson link.
 */
export function lessonLinkTarget(link: string): string | null {
  let path = link;
  const url = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)/i.exec(link);
  if (url) {
    const [, scheme, host, rest] = url;
    if (/^https?$/i.test(scheme)) {
      if (!/^(www\.)?pockett\.ai$/i.test(host)) return null;
      path = rest || '/';
    } else {
      // pockett://learn/<id>: the host is the first path segment
      path = `/${host}${rest}`;
    }
  }
  path = path.split(/[?#]/)[0].replace(/\/+$/, '');
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.startsWith('/embed/')) path = path.slice('/embed'.length);
  const learn = /^\/learn\/([^/]+)$/.exec(path);
  if (learn) return `/lesson/${encodeURIComponent(decodeURIComponent(learn[1]))}?path=${encodeURIComponent(path)}`;
  const project = /^\/projects\/([^/]+)\/([^/]+)$/.exec(path);
  if (project) return `/lesson/${encodeURIComponent(decodeURIComponent(project[2]))}?path=${encodeURIComponent(path)}`;
  return null;
}

/**
 * Where a site path a page asked to open (`navigate`, an announcement) goes in the app: a lesson to the Lesson
 * screen, a course to its page in Learn, the Foundations and project hubs to Learn, the dashboard to Home, the
 * playground to the Playground. Null: not an app screen (open it in the in-app browser).
 */
export type AppTarget =
  | { kind: 'lesson'; id: string; path: string }
  | { kind: 'course'; id: string }
  | { kind: 'tab'; tab: '/' | '/learn' | '/progress' | '/account' }
  | { kind: 'playground' };

export function appTargetForPath(sitePath: string): AppTarget | null {
  let path = sitePath.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (path.startsWith('/embed/')) path = path.slice('/embed'.length);
  const learn = /^\/learn\/([^/]+)$/.exec(path);
  if (learn) return { kind: 'lesson', id: decodeURIComponent(learn[1]), path };
  const lesson = /^\/projects\/([^/]+)\/([^/]+)$/.exec(path);
  if (lesson) return { kind: 'lesson', id: decodeURIComponent(lesson[2]), path };
  const course = /^\/projects\/([^/]+)$/.exec(path);
  if (course) return { kind: 'course', id: decodeURIComponent(course[1]) };
  if (path === '/learn' || path === '/projects') return { kind: 'tab', tab: '/learn' };
  if (path === '/' || path === '/dashboard') return { kind: 'tab', tab: '/' };
  if (path === '/account') return { kind: 'tab', tab: '/account' };
  if (path === '/playground') return { kind: 'playground' };
  return null;
}
