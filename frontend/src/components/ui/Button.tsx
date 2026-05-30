"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "ghost" | "danger" | "subtle";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  danger:
    "inline-flex items-center justify-center gap-2 font-medium rounded-xl border border-kd-critical/40 bg-kd-critical/10 text-kd-critical hover:bg-kd-critical/20 transition-colors",
  subtle:
    "inline-flex items-center justify-center gap-2 font-medium rounded-xl bg-kd-card/50 text-kd-text-muted hover:text-kd-text hover:bg-kd-card transition-colors",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "text-xs py-2 px-3",
  md: "text-sm py-2.5 px-4",
  lg: "text-base py-3 px-5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isPrimaryOrGhost = variant === "primary" || variant === "ghost";
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          variantClass[variant],
          !isPrimaryOrGhost && sizeClass[size],
          variant === "primary" && size === "sm" && "!py-2 !px-3 !text-xs",
          variant === "ghost" && size === "sm" && "!py-2 !px-3 !text-xs",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="spinner" aria-hidden />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
