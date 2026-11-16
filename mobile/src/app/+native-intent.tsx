import { lessonLinkTarget } from '~/lib/links';

/**
 * Links into the app: https://www.pockett.ai/learn/<id> and /projects/<slug>/<lesson> (universal links / App Links,
 * claimed in app.json and served by the site, src/lib/app-links.ts), and the same paths on the pockett:// scheme,
 * open the Lesson screen. Anything else opens the app where it was.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return lessonLinkTarget(path) ?? path;
  } catch {
    return '/';
  }
}
