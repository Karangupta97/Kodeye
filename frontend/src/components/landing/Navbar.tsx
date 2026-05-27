"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { UserDropdown } from "@/components/ui/UserDropdown";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Sparkles, Menu, X } from "lucide-react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Navbar() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: easeOut }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-kd-surface/80 backdrop-blur-xl border-b border-kd-border shadow-lg shadow-black/5"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-16">
            {/* ── Logo ─────────────────────────────────────── */}
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-kd-primary to-kd-glow flex items-center justify-center group-hover:shadow-lg group-hover:shadow-kd-primary/20 transition-shadow">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-kd-text">
                Kodeye
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-kd-primary/15 text-kd-glow border border-kd-primary/20">
                AI
              </span>
            </Link>

            {/* ── Desktop Nav Links ────────────────────────── */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3.5 py-2 text-sm font-medium text-kd-text-muted hover:text-kd-text transition-colors rounded-lg hover:bg-kd-card/30"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* ── Right Side Actions ───────────────────────── */}
            <div className="flex items-center gap-3">
              <ThemeToggle />

              {/* Auth State */}
              {loading ? (
                <div className="w-8 h-8 rounded-full shimmer" />
              ) : user ? (
                <UserDropdown />
              ) : (
                <div className="hidden sm:flex items-center gap-2.5">
                  <Link
                    href="/login"
                    className="btn-ghost text-sm"
                  >
                    Login
                  </Link>
                  <Link
                    href="/login"
                    className="btn-primary text-sm !py-2 !px-4"
                  >
                    <span className="relative z-10">Get Started</span>
                  </Link>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                id="mobile-menu-toggle"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-kd-card/50 border border-kd-border text-kd-text-muted hover:text-kd-text transition-colors cursor-pointer"
                aria-label="Toggle menu"
              >
                {mobileOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4" />
                )}
              </button>
            </div>
          </nav>
        </div>
      </motion.header>

      {/* ── Mobile Menu ──────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 md:hidden"
          >
            <div className="bg-kd-surface/95 backdrop-blur-xl border-b border-kd-border shadow-xl">
              <div className="px-4 py-4 space-y-1">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-kd-text-muted hover:text-kd-text hover:bg-kd-card/50 rounded-xl transition-colors"
                  >
                    {link.label}
                  </a>
                ))}

                {!loading && !user && (
                  <div className="pt-3 mt-2 border-t border-kd-border space-y-2">
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="block w-full text-center btn-ghost text-sm"
                    >
                      Login
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="block w-full text-center btn-primary text-sm"
                    >
                      <span className="relative z-10">Get Started</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
