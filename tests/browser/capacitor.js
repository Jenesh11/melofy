export const Capacitor = { isNativePlatform: () => !!window.fixtureNative, getPlatform: () => window.fixtureNative ? 'android' : 'web' };
export const registerPlugin = () => new Proxy({}, { get: (_target, method) => method === 'then' ? undefined : async () => method === 'addListener' ? { remove() {} } : {} });
export class WebPlugin {}
