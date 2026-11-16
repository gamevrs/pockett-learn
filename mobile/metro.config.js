// Learn more: https://docs.expo.dev/guides/customizing-metro/
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * The app runs a few of the website's pure modules itself rather than keeping copies that drift: the progress
 * schema and its merge (`@site/data/progress/types`, `@site/data/progress/merge`), imported by the path
 * tsconfig.json maps to ../src. Metro has to watch that folder to bundle them. Only modules with no browser,
 * Next.js or Node dependency may be imported this way.
 */
config.watchFolders = [path.resolve(__dirname, '../src/data/progress')];

/** Packages always come from the app's own node_modules, never the website's. */
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
