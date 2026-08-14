import type { Metadata } from "next";

import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";

import { publicEnv } from "@/shared/config/public-env";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  title: {
    default: "TripMate",
    template: "%s · TripMate",
  },
  description: "Plan memorable trips together, one day at a time.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
