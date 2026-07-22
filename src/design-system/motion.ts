import type { Transition, Variants } from "framer-motion";

export const bvEase = [0.16, 1, 0.3, 1] as const;

export const bvTransition: Transition = {
  duration: 0.25,
  ease: bvEase,
};

export const bvTransitionSlow: Transition = {
  duration: 0.4,
  ease: bvEase,
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const cardHover = {
  y: -2,
  transition: bvTransition,
};

export const drawerVariants: Variants = {
  hidden: { x: "100%", opacity: 0.8 },
  visible: { x: 0, opacity: 1 },
  exit: { x: "100%", opacity: 0.8 },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 8 },
};

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: bvEase } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};
