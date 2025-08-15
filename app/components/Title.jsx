"use client";
import { useEffect } from "react";

function computeTitle(nameRaw) {
  const name = (nameRaw || "").trim();
  return name ? `${name}'s Wedding Schedule` : "Your Wedding Schedule";
}

export default function Title({ brideName }) {
  const title = computeTitle(brideName);

  // Keep browser tab title in sync
  useEffect(() => {
    try {
      document.title = title;
    } catch (_) {}
  }, [title]);

  return <h1 id="schedule-title">{title}</h1>;
}
