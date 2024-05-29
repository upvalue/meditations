import '@mantine/core/styles.css';

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import {theme} from '../theme';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "dungeon",
  description: "dungeon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body className="bg-zinc-950 text-lg  text-sky-100">
        <MantineProvider  forceColorScheme="dark" theme={theme}>{children}</MantineProvider>
      </body>
    </html>
  );
}
