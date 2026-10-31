import type { Metadata, Viewport } from "next";
import "@fontsource/rubik/400.css";
import "@fontsource/rubik/500.css";
import "@fontsource/rubik/700.css";
import "@fontsource/pixelify-sans/400.css";
import "@fontsource/pixelify-sans/600.css";
import "./globals.css";
import { SettingsProvider } from "@/components/SettingsProvider";
import { buildThemeInitScript } from "@/lib/themeManager";

export const metadata: Metadata = {
  title: "Travle",
  description: "Get from one country to another by naming every border you cross.",
};

export const viewport: Viewport = {
  themeColor: "#7bc672",
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
        {/* Put the right palette down before first paint */}
        <script dangerouslySetInnerHTML={{ __html: buildThemeInitScript() }} />
      </head>
      <body>
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
