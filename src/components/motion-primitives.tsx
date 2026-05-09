'use client';

/**
 * Componentes motion reutilizables.
 * Al ser 'use client', los Server Components los pueden importar
 * como leaf components sin contaminar el árbol de servidor.
 */

import { motion, type Variants } from 'framer-motion';

/* ──────────────────────────────────────────────
   Fade + slide-up de entrada (para páginas y cards)
────────────────────────────────────────────── */

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.055,
      duration: 0.28,
      ease: [0.32, 0.72, 0, 1],
    },
  }),
};

/**
 * Wrapper que anima la entrada con fade + slide-up.
 * `index` controla el stagger entre siblings.
 */
export function FadeUp({
  children,
  index = 0,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <motion.div
      variants={fadeUpVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   Stagger container (para listas)
────────────────────────────────────────────── */

const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.045, delayChildren: 0.05 },
  },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] },
  },
};

export function StaggerList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   Scale on hover (para cards interactivas)
────────────────────────────────────────────── */

export function ScaleOnHover({
  children,
  className,
  scale = 1.015,
}: {
  children: React.ReactNode;
  className?: string;
  scale?: number;
}) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   AnimatePresence re-export (para modales, cart items)
────────────────────────────────────────────── */

export { AnimatePresence, motion } from 'framer-motion';
