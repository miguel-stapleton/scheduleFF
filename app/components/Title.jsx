"use client";
import { useEffect, useState } from "react";

function computeTitle(nameRaw) {
  const name = (nameRaw || "").trim();
  return name ? `${name}'s Wedding Schedule` : "Your Wedding Schedule";
}

export default function Title() {
  const [title, setTitle] = useState("Your Wedding Schedule");

  // Initialize from existing inputs if present
  useEffect(() => {
    try {
      const input = document.getElementById("settings-bride-name");
      const initial = computeTitle(input?.value || "");
      setTitle(initial);
    } catch (_) {}
  }, []);

  // Keep browser tab title in sync
  useEffect(() => {
    try {
      document.title = title;
    } catch (_) {}
  }, [title]);

  // Listen for settings saved events from non-React script
  useEffect(() => {
    const onSaved = (e) => {
      const brideName = e?.detail?.brideName || "";
      setTitle(computeTitle(brideName));
    };
    window.addEventListener("settings:saved", onSaved);
    return () => window.removeEventListener("settings:saved", onSaved);
  }, []);

  return <h1 id="schedule-title">{title}</h1>;
}
