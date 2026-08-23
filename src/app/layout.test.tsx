import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import RootLayout from "@/app/layout";

describe("RootLayout", () => {
  it("runs the saved theme initializer directly in the document head", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <main>TripMate</main>
      </RootLayout>,
    );
    const headStart = html.indexOf("<head>");
    const headEnd = html.indexOf("</head>");
    const initializer = html.indexOf('id="theme-initializer"');

    expect(headStart).toBeGreaterThanOrEqual(0);
    expect(initializer).toBeGreaterThan(headStart);
    expect(initializer).toBeLessThan(headEnd);
    expect(html).toContain('localStorage.getItem("tripmate-theme")');
  });
});
