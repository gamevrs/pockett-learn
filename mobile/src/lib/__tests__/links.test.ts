import { lessonLinkTarget } from '../links';

describe('lessonLinkTarget', () => {
  it('opens Foundations and project lessons from the site and the scheme', () => {
    expect(lessonLinkTarget('https://www.pockett.ai/learn/fnd-bits-1')).toBe('/lesson/fnd-bits-1?path=%2Flearn%2Ffnd-bits-1');
    expect(lessonLinkTarget('https://pockett.ai/projects/garage/g-1?ref=x#top')).toBe('/lesson/g-1?path=%2Fprojects%2Fgarage%2Fg-1');
    expect(lessonLinkTarget('pockett://learn/fnd-bits-1')).toBe('/lesson/fnd-bits-1?path=%2Flearn%2Ffnd-bits-1');
    expect(lessonLinkTarget('/projects/garage/g-1/')).toBe('/lesson/g-1?path=%2Fprojects%2Fgarage%2Fg-1');
  });
  it('leaves everything else alone', () => {
    expect(lessonLinkTarget('https://www.pockett.ai/learn')).toBeNull();
    expect(lessonLinkTarget('https://www.pockett.ai/projects/garage')).toBeNull();
    expect(lessonLinkTarget('https://evil.example/learn/x')).toBeNull();
    expect(lessonLinkTarget('/account')).toBeNull();
    expect(lessonLinkTarget('pockett://')).toBeNull();
  });
});
