import React, { useSyncExternalStore } from 'react';
let user = { uid: 'alice', displayName: 'Alice', getIdToken: async () => 'fixture-alice' };
const listeners = new Set();
let loading = false;
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export function setUser(next) { user = next; listeners.forEach(fn => fn()); }
export function setAuthLoading(next) { loading = next; listeners.forEach(fn => fn()); }
export function useAuth() { return { user: useSyncExternalStore(subscribe, () => user), loading: useSyncExternalStore(subscribe, () => loading) }; }
export function currentUser() { return user; }
export function AuthProvider({ children }) { return children; }
