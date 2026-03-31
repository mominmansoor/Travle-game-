import type { Metadata } from "next";
import "./globals.css";
import { SettingsProvider } from "@/components/SettingsProvider";
import { buildThemeInitScript } from "@/lib/themeManager";

export const metadata: Metadata = {
  title: "TRAVLE.EXE",
  description: "The land-border geography puzzle game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: buildThemeInitScript() }} />
      </head>
      <body>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
