const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Watchman on this machine is failing on its state directory permissions,
// which causes Expo/Metro startup to stall before the server begins listening.
// Falling back to Node's file watcher keeps local development working.
config.resolver.useWatchman = false;

module.exports = config;
