// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { themeStorageKey } from "@/shared/lib/theme-preference";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

function setThemeStorage() {
  const values = new Map<string, string>();

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
    setThemeStorage();
    window.localStorage.clear();
    document.documentElement.dataset.theme = "light";
  });

  it("uses the saved theme and lets the user switch it", async () => {
    window.localStorage.setItem(themeStorageKey, "dark");
    document.documentElement.dataset.theme = "dark";
    const user = userEvent.setup();

    render(<ThemeToggle />);

    const toggle = screen.getByRole("button", { name: "라이트 모드로 전환" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(screen.getByText("라이트 모드")).toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByRole("button", { name: "다크 모드로 전환" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(window.localStorage.getItem(themeStorageKey)).toBe("light");
    expect(screen.getByText("다크 모드")).toBeInTheDocument();
  });

  it("reflects the theme initialized before hydration", () => {
    document.documentElement.dataset.theme = "dark";

    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "라이트 모드로 전환" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
