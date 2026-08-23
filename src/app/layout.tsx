import type { Metadata } from "next";

import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";

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
      <head>
        {/* This native head script must run before first paint to prevent a saved-theme flash. */}
        <script id="theme-initializer">{themeInitializationScript}</script>
      </head>
      <body>
        <SupabaseSessionRefresher />
        {children}
      </body>
    </html>
  );
}
