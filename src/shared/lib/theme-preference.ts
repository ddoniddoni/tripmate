export const themeStorageKey = "tripmate-theme";

export const themes = ["light", "dark"] as const;

export type Theme = (typeof themes)[number];

export function resolveThemePreference(
  storedPreference: string | null | undefined,
  systemPrefersDark: boolean,
): Theme {
  if (storedPreference === "dark" || storedPreference === "light") {
    return storedPreference;
  }

  return systemPrefersDark ? "dark" : "light";
}

export const themeInitializationScript = `
  (() => {
    try {
      const storedPreference = window.localStorage.getItem("${themeStorageKey}");
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = storedPreference === "dark" || storedPreference === "light"
        ? storedPreference
        : systemPrefersDark
          ? "dark"
          : "light";
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.dataset.theme = "light";
    }
  })();
`;
