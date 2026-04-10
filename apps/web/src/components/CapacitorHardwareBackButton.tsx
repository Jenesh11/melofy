'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

export function CapacitorHardwareBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If not running in Capacitor, do nothing
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const backButtonListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // If we are at the app root, exiting the app makes sense
      if (pathname === '/' || pathname === '/login') {
        CapacitorApp.exitApp();
      } else if (canGoBack) {
        // Alternatively we can use standard history API or Next router
        router.back();
      } else {
        router.back();
      }
    });

    return () => {
      backButtonListener.then((listener) => listener.remove());
    };
  }, [router, pathname]);

  return null;
}
