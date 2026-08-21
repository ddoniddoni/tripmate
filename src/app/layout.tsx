import type { Metadata } from "next";

import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import Script from "next/script";

import { publicEnv } from "@/shared/config/public-env";
import { themeInitializationScript } from "@/shared/lib/theme-preference";
import { SupabaseSessionRefresher } from "@/shared/ui/supabase-session-refresher";

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
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Script id="theme-initializer" strategy="beforeInteractive">
          {themeInitializationScript}
        </Script>
        <SupabaseSessionRefresher />
        {children}
      </body>
    </html>
  );
}
