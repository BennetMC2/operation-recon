import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ReconProvider } from "@/contexts/ReconContext";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "OPERATION: RECON",
  description: "Tactical Weight Loss Command Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.variable} font-mono antialiased`}>
        <ReconProvider>
          <div className="crt-overlay" />
          <div className="flicker min-h-screen">
            {children}
          </div>
        </ReconProvider>
      </body>
    </html>
  );
}
