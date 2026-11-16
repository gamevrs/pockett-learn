import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * The website the app reads from and hosts lessons of. Production is https://www.pockett.ai (app.json
 * `extra.siteUrl`); a development build can point at a local dev server with EXPO_PUBLIC_SITE_URL (inlined when
 * Metro bundles). Use localhost: the code frame only accepts a parent on pockett.ai or localhost. The Android
 * emulator reaches the Mac's localhost after `adb reverse tcp:<port> tcp:<port>`.
 */
const fromEnv = process.env.EXPO_PUBLIC_SITE_URL;
const fromConfig = (Constants.expoConfig?.extra as { siteUrl?: string } | undefined)?.siteUrl;

export const SITE_URL = (fromEnv || fromConfig || 'https://www.pockett.ai').replace(/\/+$/, '');

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export const PLATFORM: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';

export const SUPPORT_EMAIL = 'support@pockett.ai';

export const LINKS = {
  privacy: `${SITE_URL}/privacy`,
  terms: `${SITE_URL}/terms`,
  brand: `${SITE_URL}/brand`,
  site: SITE_URL,
} as const;
