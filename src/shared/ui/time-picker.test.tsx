// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { TimePicker } from "@/shared/ui/time-picker";

function TimePickerHarness() {
  const [value, setValue] = useState("");

  return (
    <>
      <TimePicker onChange={setValue} value={value} />
      <output>{value || "시간 미정"}</output>
    </>
  );
}

describe("TimePicker", () => {
  it("combines hour and minute choices and lets the user clear the time", async () => {
    const user = userEvent.setup();
    render(<TimePickerHarness />);

    expect(screen.getByRole("group", { name: "시작 시간" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "미정" })).toHaveAttribute("aria-pressed", "true");

    await user.selectOptions(screen.getByRole("combobox", { name: "시작 시간 시" }), "09");
    expect(screen.getByRole("status")).toHaveTextContent("시간 미정");

    await user.selectOptions(screen.getByRole("combobox", { name: "시작 시간 분" }), "30");
    expect(screen.getByRole("status")).toHaveTextContent("09:30");
    expect(screen.getByRole("button", { name: "미정" })).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "미정" }));
    expect(screen.getByRole("status")).toHaveTextContent("시간 미정");
  });
});
