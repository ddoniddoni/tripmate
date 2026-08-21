// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { NativeSelect } from "@/shared/ui/native-select";

describe("NativeSelect", () => {
  it("keeps a native, labelled select with the shared decorative chevron", () => {
    const selectRef = createRef<HTMLSelectElement>();
    const { container } = render(
      <label>
        분류
        <NativeSelect containerClassName="expense-category-select" ref={selectRef}>
          <option value="food">식비</option>
        </NativeSelect>
      </label>,
    );

    expect(screen.getByRole("combobox", { name: "분류" })).toHaveValue("food");
    expect(selectRef.current).toBeInstanceOf(HTMLSelectElement);
    expect(container.querySelector(".native-select.expense-category-select > svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
