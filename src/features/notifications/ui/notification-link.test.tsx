// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NotificationLink } from "@/features/notifications/ui/notification-link";

describe("NotificationLink", () => {
  it("announces the number of invitations waiting for a response", () => {
    render(<NotificationLink pendingCount={3} />);

    expect(screen.getByRole("link", { name: "알림, 응답할 초대 3개" })).toHaveAttribute(
      "href",
      "/notifications",
    );
    expect(screen.getByText("3")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps an empty notification link concise", () => {
    render(<NotificationLink pendingCount={0} />);

    expect(screen.getByRole("link", { name: "알림" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
