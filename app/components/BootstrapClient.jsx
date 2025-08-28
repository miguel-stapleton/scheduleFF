'use client';
import { useEffect, useRef } from 'react';

export default function BootstrapClient() {
  const hasRegisteredRef = useRef(false);

  useEffect(() => {
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
