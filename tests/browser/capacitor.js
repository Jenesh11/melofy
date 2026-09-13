export const Capacitor = { isNativePlatform: () => !!window.fixtureNative, getPlatform: () => window.fixtureNative ? 'android' : 'web' };
