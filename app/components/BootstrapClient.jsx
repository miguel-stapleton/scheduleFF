"use client";
import { useEffect } from "react";

export default function BootstrapClient() {
  useEffect(() => {
    // In React 18 Strict Mode (dev), effects mount/unmount/mount.
    // Guard against double-loading and inject the public script explicitly.
    if (typeof window !== "undefined") {
      if (window.__weddingSchedulerScriptLoaded) return;
      window.__weddingSchedulerScriptLoaded = true;
      try {
        const existing = document.querySelector('script[src="/script.js"]');
        if (existing) return;
        const script = document.createElement("script");
        script.src = "/script.js"; // served from public/script.js
        script.type = "module";
        script.async = true;
        script.onload = () => console.log("BootstrapClient: /script.js loaded (public asset)");
        script.onerror = (e) => console.error("BootstrapClient: failed to load /script.js", e);
        document.body.appendChild(script);
      } catch (e) {
        console.error("BootstrapClient: script injection failed", e);
      }
    }
  }, []);
  return null;
}
