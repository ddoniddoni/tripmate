// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createSupabaseBrowserClient: vi.fn() }));

vi.mock("@/shared/api/supabase/browser", () => ({
  createSupabaseBrowserClient: mocks.createSupabaseBrowserClient,
}));

import { SupabaseSessionRefresher } from "@/shared/ui/supabase-session-refresher";

describe("SupabaseSessionRefresher", () => {
  beforeEach(() => {
    mocks.createSupabaseBrowserClient.mockReset();
  });

  it("starts the browser session manager once after mounting", async () => {
    render(<SupabaseSessionRefresher />);

    await waitFor(() => {
      expect(mocks.createSupabaseBrowserClient).toHaveBeenCalledOnce();
    });
  });
});
