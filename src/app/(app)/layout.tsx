import type { Metadata } from "next";
import '@mantine/core/styles.css';
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import SupabaseProvider from "../providers/SupabaseProvider";
import classes from "./RootLayout.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Futsal App",
  description: "Rate and manage futsal players",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // <html lang="en">
    //   <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SupabaseProvider>
          <div className={classes.layout}>
            <Navbar />
            <main className={classes.main}>{children}</main>
          </div>
        </SupabaseProvider>
    //   </body>
    // </html>
  );
}
