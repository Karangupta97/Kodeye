"use client";

import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/motion";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <motion.header
      variants={fadeInUp}
      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6"
    >
      <div className="min-w-0">
        <h1 className="kd-heading-1">{title}</h1>
        {description && (
          <p className="kd-body-muted mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </motion.header>
  );
}
