import { describe, expect, it } from "vitest";

import { resolveThemePreference } from "@/shared/lib/theme-preference";

describe("resolveThemePreference", () => {
  it("uses a valid saved preference before the system setting", () => {
    expect(resolveThemePreference("dark", false)).toBe("dark");
    expect(resolveThemePreference("light", true)).toBe("light");
  });

  it("uses the system setting when no valid saved preference exists", () => {
    expect(resolveThemePreference(null, true)).toBe("dark");
    expect(resolveThemePreference("system", false)).toBe("light");
  });
});
