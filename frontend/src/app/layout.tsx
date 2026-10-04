import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./workspace.css";
import "./research-ui.css";
import "./experience-ui.css";
import "./decision-ui.css";
import "./studio-ui.css";
import "./brand-ui.css";
import "./risk-ui.css";
import "./ecosystem-ui.css";
import "./theme.css";
import "./workstation.css";
import "./palette.css";
import "./deal-sourcing.css";
import "./today-ui.css";

const uiFont = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-ui",
  display: "swap",
  weight: "100 900",
});
const valueFont = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-values",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Whistle",
  description: "Research companies, inspect their sources and record investment decisions.",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
};

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script id="vc-scope-theme" dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('vc-scope:theme:v1')==='dark'?'dark':'light'}catch{}" }} />
      </head>
      <body className={`${uiFont.variable} ${valueFont.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
