"use client";

import { useEffect } from 'react';
import WeddingScheduleApp from './components/WeddingScheduleApp';

export default function Page() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const uri = params.get('uri');
      if (uri) {
        console.log('[App] Launched via protocol handler with uri:', uri);
        // TODO: handle uri (e.g., parse and load a schedule)
      }
    } catch (e) {
      // no-op
    }
  }, []);

  return (
    <>
      <WeddingScheduleApp />
    </>
  );
}
