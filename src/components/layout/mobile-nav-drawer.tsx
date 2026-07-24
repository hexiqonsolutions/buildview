"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/** Full-screen mobile nav drawer portaled to body so overlay sits behind menu, not on top. */
export function MobileNavDrawer({ open, onClose, children, className }: MobileNavDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/40 lg:hidden"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[110] flex w-72 max-w-[85vw] flex-col border-r border-slate-200/90 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 lg:hidden",
          className
        )}
      >
        {children}
      </aside>
    </>,
    document.body
  );
}
