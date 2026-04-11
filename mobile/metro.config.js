const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Watchman on this machine is failing on its state directory permissions,
// which causes Expo/Metro startup to stall before the server begins listening.
// Falling back to Node's file watcher keeps local development working.
config.resolver.useWatchman = false;

// Web build için ESM field'ı devre dışı bırak.
// zustand gibi paketler ESM sürümünde import.meta.env kullanıyor,
// ancak Metro bundle'ı type="module" değil klasik script olarak çıkarıyor,
// bu da "Cannot use 'import.meta' outside a module" hatasına yol açıyor.
// resolverMainFields: "module" field'ı çıkar (package.json top-level field)
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
// unstable_enablePackageExports: package.json "exports" field'ındaki
// "module" condition'ı da devre dışı bırakmak için exports'u kapat
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
