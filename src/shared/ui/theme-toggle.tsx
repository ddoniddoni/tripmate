"use client";

import { useSyncExternalStore } from "react";

import {
  resolveThemePreference,
  themeStorageKey,
  type Theme,
} from "@/shared/lib/theme-preference";

function getSystemPrefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function getStoredThemePreference() {
  try {
    return window.localStorage.getItem(themeStorageKey);
  } catch {
    return null;
  }
}

function saveThemePreference(theme: Theme) {
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // The selected theme remains active for this visit when storage is unavailable.
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

const themeListeners = new Set<() => void>();

function getCurrentTheme(): Theme {
  const documentTheme = document.documentElement.dataset.theme;

  if (documentTheme === "dark" || documentTheme === "light") {
    return documentTheme;
  }

  return resolveThemePreference(getStoredThemePreference(), getSystemPrefersDark());
}

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);

  return () => {
    themeListeners.delete(listener);
  };
}

function updateTheme(theme: Theme) {
  applyTheme(theme);
  saveThemePreference(theme);
  themeListeners.forEach((listener) => listener());
}

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20 15.6A8.5 8.5 0 0 1 8.4 4 8.5 8.5 0 1 0 20 15.6Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getCurrentTheme, () => "light");

  function handleToggle() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";

    updateTheme(nextTheme);
  }

  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      aria-pressed={isDark}
      className="theme-toggle"
      onClick={handleToggle}
      type="button"
    >
      <span className="theme-toggle-icon theme-toggle-sun">
        <SunIcon />
      </span>
      <span className="theme-toggle-icon theme-toggle-moon">
        <MoonIcon />
      </span>
      <span className="theme-toggle-copy">
        <span className="theme-toggle-title">화면 테마</span>
        <span className="theme-toggle-label">{isDark ? "라이트 모드" : "다크 모드"}</span>
      </span>
      <span aria-hidden="true" className="theme-toggle-switch">
        <span />
      </span>
    </button>
  );
}
