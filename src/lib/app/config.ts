/**
 * What the phone app (Expo, branch feat/native-app) asks the site for when it starts: the oldest app version still
 * allowed to run (older builds show a "please update" gate), the newest one in the stores, and the notices shown in the
 * app's Notifications inbox. Edit this file and deploy to change them. Contract: scratchpad native/contract.md, section 1.
 */

export interface AppAnnouncement {
  id: string;
  title: string;
  body: string;
  /** Opened when the notice is tapped: a site path (/learn/...) opens in the app, a full URL in the browser. */
  url?: string;
  /** YYYY-MM-DD */
  date: string;
}

export interface AppConfig {
  minVersion: string;
  latestVersion: string;
  announcements: AppAnnouncement[];
}

export const APP_CONFIG: AppConfig = {
  minVersion: "1.0.0",
  latestVersion: "1.0.0",
  announcements: [
    {
      id: "welcome-2026-11",
      title: "Welcome to the Pockett app",
      body: "Every Foundations lesson and project is here, and your progress follows you between the app and pockett.ai when you sign in.",
      url: "/learn",
      date: "2026-11-16",
    },
  ],
};
