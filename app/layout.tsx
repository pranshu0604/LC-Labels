import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LitChowk Label Editor - Generate Printable Labels from Excel",
  description:
    "Transform your Excel data into beautifully formatted, printable labels. Upload your spreadsheet and generate professional labels instantly.",
  keywords: ["label generator", "excel to labels", "printable labels", "LitChowk"],
  authors: [{ name: "Pranshu Pandey" }],
  openGraph: {
    title: "LitChowk Label Editor",
    description: "Transform your Excel data into printable labels instantly",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
