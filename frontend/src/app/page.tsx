import Link from "next/link";
import { Sparkles, Shield, Zap, GitBranch, ArrowRight } from "lucide-react";
import { LandingAuthBanner } from "@/components/landing/LandingAuthBanner";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-kd-bg overflow-x-hidden">
      <div className="gradient-blob gradient-blob-1 -top-40 -left-40" aria-hidden />
      <div className="gradient-blob gradient-blob-2 top-1/3 -right-32" aria-hidden />

      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 h-16 border-b border-kd-border/60 bg-kd-surface/30 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-kd-primary to-kd-glow flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" aria-hidden />
          </div>
          <span className="text-lg font-bold text-kd-text">Kodeye</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-kd-primary/15 text-kd-glow border border-kd-primary/20">
            AI
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-kd-text-muted hover:text-kd-text transition-colors px-3 py-2"
          >
            Sign in
          </Link>
          <Link href="/login" className="btn-primary text-sm !py-2.5 !px-4">
            Get started
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </nav>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-16 sm:py-24 text-center">
        <LandingAuthBanner />
        <p className="kd-caption mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-kd-primary/30 bg-kd-primary/10 text-kd-glow">
          AI-powered code review
        </p>
        <h1 className="max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-kd-text leading-[1.1]">
          Ship secure code with{" "}
          <span className="bg-gradient-to-r from-kd-primary to-kd-glow bg-clip-text text-transparent">
            senior-level AI reviews
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-base sm:text-lg text-kd-text-muted leading-relaxed">
          Kodeye analyzes pull requests for security vulnerabilities, bugs, and
          performance issues — then posts actionable feedback directly on GitHub.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link href="/login" className="btn-primary w-full sm:w-auto">
            Continue with GitHub
          </Link>
          <Link href="/login" className="btn-ghost w-full sm:w-auto">
            View demo workspace
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl text-left">
          {[
            {
              icon: Shield,
              title: "Security first",
              desc: "OWASP-aligned findings with severity scoring and inline diffs.",
            },
            {
              icon: Zap,
              title: "Multi-agent analysis",
              desc: "Security, bug, performance, and quality agents run in parallel.",
            },
            {
              icon: GitBranch,
              title: "GitHub native",
              desc: "Connect repos via GitHub App — reviews sync with your workflow.",
            },
          ].map((f) => (
            <div key={f.title} className="glass-card p-6 glow-border">
              <f.icon className="w-8 h-8 text-kd-glow mb-4" aria-hidden />
              <h2 className="kd-heading-2">{f.title}</h2>
              <p className="kd-body-muted mt-2">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-kd-border py-6 text-center text-xs text-kd-text-muted">
        © {new Date().getFullYear()} Kodeye AI. Built for engineering teams.
      </footer>
    </div>
  );
}
