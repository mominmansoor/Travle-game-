import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SettingsProvider } from "@/components/SettingsProvider";
import { buildThemeInitScript } from "@/lib/themeManager";

export const metadata: Metadata = {
  title: "Travle — a land-border expedition",
  description: "Chart a route from one country to another by naming every border you cross.",
};

export const viewport: Viewport = {
  themeColor: "#f4e9cd",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Lay the right paper down before first paint */}
        <script dangerouslySetInnerHTML={{ __html: buildThemeInitScript() }} />
      </head>
      <body>
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
