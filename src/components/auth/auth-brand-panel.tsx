"use client";

import { motion } from "framer-motion";

export function AuthBrandPanel() {
  return (
    <div className="relative hidden min-h-screen overflow-hidden lg:flex lg:w-[48%] lg:flex-col lg:justify-between lg:p-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(249,115,22,0.28),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(255,255,255,0.06),_transparent_45%),linear-gradient(160deg,#0A0A0A_0%,#141414_45%,#1A120C_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-lg font-bold text-black">
            BV
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">
              BuildView
            </p>
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">
              Construction CRM
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="relative z-10 max-w-lg space-y-5"
      >
        <h1 className="font-[family-name:var(--font-display)] text-5xl font-semibold leading-[1.05] tracking-tight text-white">
          Pipeline clarity for every project bid.
        </h1>
        <p className="text-lg leading-relaxed text-zinc-300">
          Track leads, run follow-ups, and close construction deals from one
          premium workspace — HubSpot speed with Close-level focus.
        </p>
        <div className="flex gap-6 pt-2 text-sm text-zinc-400">
          <div>
            <p className="text-2xl font-semibold text-orange-400">01</p>
            <p>Lead intake</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-orange-400">02</p>
            <p>Email rhythm</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-orange-400">03</p>
            <p>Won deals</p>
          </div>
        </div>
      </motion.div>

      <p className="relative z-10 text-sm text-zinc-500">
        Built for estimators, BDMs, and sales leaders.
      </p>
    </div>
  );
}
