'use client';
import { useEffect, useRef } from 'react';

export default function BootstrapClient() {
  const hasRegisteredRef = useRef(false);

  useEffect(() => {
    // Device classing for CSS targeting
    try {
      const html = document.documentElement;
      const ua = navigator.userAgent || '';

      const isIPhone = /iPhone/i.test(ua);
      const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /Android/i.test(ua);

      html.classList.remove('device-ios', 'device-iphone', 'device-android', 'device-desktop');
      if (isIPhone) {
        html.classList.add('device-ios', 'device-iphone');
      } else if (isIPad) {
        html.classList.add('device-ios');
      } else if (isAndroid) {
        html.classList.add('device-android');
      } else {
        html.classList.add('device-desktop');
      }
    } catch (_) {}

    if (hasRegisteredRef.current) return;
    hasRegisteredRef.current = true;

    if ('serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (!reg) {
            navigator.serviceWorker.register('/sw.js').catch(console.error);
          }
        });
      };

      // Register immediately; do not depend on window 'load' firing
      registerSW();
    }
  }, []);

  return null;
}
