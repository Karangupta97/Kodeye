"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ── GitHub SVG Icon ───────────────────────────────────── */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/* ── Kodeye Eye Logo ───────────────────────────────────── */
function KodeyeLogo() {
  return (
    <motion.div
      className="relative w-16 h-16 mx-auto mb-6"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="absolute inset-0 rounded-full bg-kd-primary/20 blur-xl" />
      <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-kd-primary to-kd-glow">
        <svg
          viewBox="0 0 40 40"
          className="w-9 h-9 text-white"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 8C12 8 5.5 14 3 20c2.5 6 9 12 17 12s14.5-6 17-12c-2.5-6-9-12-17-12z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="20" r="6" fill="currentColor" />
          <circle cx="20" cy="20" r="2.5" fill="var(--kd-primary)" />
        </svg>
      </div>
    </motion.div>
  );
}

/* ── Login Page ────────────────────────────────────────── */
function LoginPageContent() {
  const { user, loading: authLoading, signInWithGitHub } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle error from callback
  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "config") {
      toast.error("Supabase is not configured. Check your .env.local file.");
    } else if (error) {
      toast.error("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/overview");
    }
  }, [user, authLoading, router]);

  const handleGitHubLogin = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGitHub();
    } catch {
      toast.error("Failed to initiate GitHub login. Please try again.");
      setIsSigningIn(false);
    }
  };

  // Full-page loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kd-bg">
        <div className="spinner-lg spinner" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-kd-bg">
      {/* ── Animated Background Blobs ────────────────────── */}
      <div className="gradient-blob gradient-blob-1 -top-40 -left-40" />
      <div className="gradient-blob gradient-blob-2 top-1/2 -right-32" />
      <div className="gradient-blob gradient-blob-3 -bottom-32 left-1/3" />

      {/* ── Subtle Grid Pattern ──────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--kd-text) 1px, transparent 1px), linear-gradient(90deg, var(--kd-text) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* ── Login Card ───────────────────────────────────── */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 text-sm text-kd-text-muted hover:text-kd-text transition-colors"
      >
        ← Back to home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: easeOut }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-card-strong animate-pulse-glow p-8 sm:p-10">
          {/* Logo */}
          <KodeyeLogo />

          {/* Branding */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-kd-text mb-2 tracking-tight">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-kd-primary to-kd-glow bg-clip-text text-transparent">
                Kodeye AI
              </span>
            </h1>
            <p className="text-kd-text-muted text-sm sm:text-base leading-relaxed">
              AI-powered code review for your GitHub repositories.
              <br />
              Ship secure code, faster.
            </p>
          </motion.div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 h-px bg-kd-border" />
            <span className="text-xs font-medium text-kd-text-muted uppercase tracking-wider">
              Sign in
            </span>
            <div className="flex-1 h-px bg-kd-border" />
          </div>

          {/* GitHub Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <button
              id="github-login-button"
              onClick={handleGitHubLogin}
              disabled={isSigningIn}
              className="btn-github disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSigningIn ? (
                <>
                  <div className="spinner" />
                  <span>Connecting to GitHub...</span>
                </>
              ) : (
                <>
                  <GitHubIcon className="w-5 h-5" />
                  <span>Continue with GitHub</span>
                </>
              )}
            </button>
          </motion.div>

          {/* Footer Text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-6 text-center text-xs text-kd-text-muted leading-relaxed"
          >
            By continuing, you agree to Kodeye&apos;s{" "}
            <span className="text-kd-accent hover:text-kd-glow cursor-pointer transition-colors">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="text-kd-accent hover:text-kd-glow cursor-pointer transition-colors">
              Privacy Policy
            </span>
          </motion.p>
        </div>

        {/* Bottom glow effect */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-kd-primary/15 blur-3xl rounded-full" />
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-kd-bg">
          <div className="spinner-lg spinner" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
