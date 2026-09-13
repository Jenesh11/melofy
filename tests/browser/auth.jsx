import React, { useSyncExternalStore } from 'react';
let user = { uid: 'alice', displayName: 'Alice', getIdToken: async () => 'fixture-alice' };
const listeners = new Set();
export function setUser(next) { user = next; listeners.forEach(fn => fn()); }
export function useAuth() { return { user: useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => user), loading: false }; }
export function currentUser() { return user; }
export function AuthProvider({ children }) { return children; }
