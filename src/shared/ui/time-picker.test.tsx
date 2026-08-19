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
      <output>{value || "선택 안 함"}</output>
    </>
  );
}

describe("TimePicker", () => {
  it("combines numeric hour and minute choices", async () => {
    const user = userEvent.setup();
    render(<TimePickerHarness />);

    expect(screen.getByRole("group", { name: "도착 시간" })).toBeInTheDocument();
    expect(screen.getAllByRole("option", { name: "09" })).toHaveLength(2);
    expect(screen.queryByRole("option", { name: "09시" })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "도착 시간 시" }), "09");
    expect(screen.getByRole("status")).toHaveTextContent("선택 안 함");

    await user.selectOptions(screen.getByRole("combobox", { name: "도착 시간 분" }), "30");
    expect(screen.getByRole("status")).toHaveTextContent("09:30");
  });
});
