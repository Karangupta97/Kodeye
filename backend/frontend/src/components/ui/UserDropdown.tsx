"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Settings, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export function UserDropdown() {
  const { user, profile, signOut, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  if (loading || !user) return null;

  const displayName =
    profile?.username ||
    user.user_metadata?.user_name ||
    user.email?.split("@")[0] ||
    "User";

  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;

  const handleSignOut = async () => {
    setIsOpen(false);
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        id="user-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-kd-card/50 transition-all duration-200 cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {avatarUrl ? (
          <div className="avatar-ring">
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full"
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-kd-primary to-kd-glow flex items-center justify-center text-white text-sm font-bold">
            {displayName[0].toUpperCase()}
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium text-kd-text max-w-[120px] truncate">
          {displayName}
        </span>
        <svg
          className={`w-4 h-4 text-kd-text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="dropdown-menu absolute right-0 top-full mt-2 w-64 z-50"
          >
            {/* User Info */}
            <div className="px-4 py-3 border-b border-kd-border">
              <p className="text-sm font-semibold text-kd-text truncate">
                {displayName}
              </p>
              <p className="text-xs text-kd-text-muted truncate mt-0.5">
                {profile?.email || user.email || ""}
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-1.5">
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="dropdown-item"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="dropdown-item"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <Link
                href={`https://github.com/${profile?.username || ""}`}
                target="_blank"
                onClick={() => setIsOpen(false)}
                className="dropdown-item"
              >
                <User className="w-4 h-4" />
                GitHub Profile
              </Link>
            </div>

            {/* Divider + Logout */}
            <div className="dropdown-divider" />
            <div className="py-1.5">
              <button
                id="logout-button"
                onClick={handleSignOut}
                className="dropdown-item dropdown-item-danger w-full"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
