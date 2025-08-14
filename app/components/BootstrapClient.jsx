"use client";
import { useEffect } from "react";

export default function BootstrapClient() {
  useEffect(() => {
    // In React 18 Strict Mode (dev), effects mount/unmount/mount.
    // Guard against double-loading and prefer dynamic import for reliability.
    if (typeof window !== "undefined") {
      if (window.__weddingSchedulerScriptLoaded) return;
      window.__weddingSchedulerScriptLoaded = true;
      console.log("BootstrapClient: loading /script.js via dynamic import");
      import("/script.js")
        .then(() => {
          console.log("BootstrapClient: /script.js imported");
        })
        .catch((err) => {
          console.warn("BootstrapClient: dynamic import failed, falling back to script tag", err);
          try {
            const existing = document.querySelector('script[src="/script.js"]');
            if (existing) return;
            const script = document.createElement("script");
            script.src = "/script.js";
            script.type = "module";
            script.async = true;
            document.body.appendChild(script);
          } catch (e) {
            console.error("BootstrapClient: fallback injection failed", e);
          }
        });
    }
  }, []);
  return null;
}
