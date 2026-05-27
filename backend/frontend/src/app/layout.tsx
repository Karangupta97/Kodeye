import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kodeye AI — Intelligent Code Review",
  description:
    "AI-powered GitHub code review platform that analyzes pull requests, detects vulnerabilities, and posts AI review comments.",
  keywords: ["code review", "AI", "GitHub", "pull request", "security"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-kd-bg text-kd-text">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "var(--kd-surface)",
                  color: "var(--kd-text)",
                  border: "1px solid var(--kd-border)",
                  borderRadius: "0.75rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  backdropFilter: "blur(16px)",
                },
                success: {
                  iconTheme: {
                    primary: "var(--kd-success)",
                    secondary: "var(--kd-surface)",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "var(--kd-critical)",
                    secondary: "var(--kd-surface)",
                  },
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
