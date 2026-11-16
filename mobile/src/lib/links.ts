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
