import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ritch Tribiana | Enterprise IT Support Specialist",
  description:
    "AI-powered portfolio website for Ritch Tribiana, focused on Enterprise IT Support and practical IT service inquiry assistance.",
};

const themeInitializer = `
  (function() {
    try {
      var stored = localStorage.getItem("rt-theme");
      var preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var theme = stored || (preferredDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
    } catch (error) {
      document.documentElement.classList.remove("dark");
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
