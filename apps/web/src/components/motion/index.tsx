'use client';

import { animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useTransform, type Variants } from 'framer-motion';
import { Children, Fragment, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Motion primitives for the public website only (never used in the portal or staff panel).
 * Every effect is skipped for visitors who ask their system for reduced motion.
 */
const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade and rise into view once, when scrolled to. */
export function FadeUp({ children, delay = 0, y = 28, className, as = 'div' }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'li' | 'section' }) {
  const reduce = useReducedMotion();
  const M = motion[as];
  if (reduce) return <M className={className}>{children}</M>;
  return (
    <M className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, ease: EASE, delay }}>
      {children}
    </M>
  );
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } };
const item: Variants = { hidden: { opacity: 0, y: 30, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: EASE } } };

/** Children appear one after another (a grid of cards, a list). Each direct child is wrapped. */
export function Stagger({ children, className, itemClassName }: { children: ReactNode; className?: string; itemClassName?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
      {Children.map(children, (c) => (c ? <motion.div variants={item} className={itemClassName}>{c}</motion.div> : c))}
    </motion.div>
  );
}

/** Card that lifts gently on hover. */
export function Lift({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return <motion.div className={className} whileHover={{ y: -8 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>{children}</motion.div>;
}

/** Headline whose words rise in one after another. */
export function WordsReveal({ text, className, delay = 0.1 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;
  const words = text.split(' ');
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <motion.span className="inline-block" initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: delay + i * 0.07 }}>{w}</motion.span>
          </span>
          {i < words.length - 1 && ' '}
        </Fragment>
      ))}
    </span>
  );
}

/** Slow parallax for a full-bleed background layer. */
export function Parallax({ children, className, distance = 120 }: { children: ReactNode; className?: string; distance?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, distance]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1.15]);
  return <div ref={ref} className={className}><motion.div className="absolute inset-0" style={reduce ? undefined : { y, scale }}>{children}</motion.div></div>;
}

/** Number that counts up the first time it is seen. */
export function CountUp({ to, className, suffix = '' }: { to: number; className?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) { mv.set(to); return; }
    const controls = animate(mv, to, { duration: 1.4, ease: EASE });
    return () => controls.stop();
  }, [inView, reduce, to, mv]);
  useEffect(() => mv.on('change', (v) => setShown(Math.round(v))), [mv]);
  return <span ref={ref} className={className}>{inView ? shown : 0}{suffix}</span>;
}

/** Endless gentle float (hero cards, decorative badges). */
export function Float({ children, className, amount = 10, duration = 6 }: { children: ReactNode; className?: string; amount?: number; duration?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return <motion.div className={className} animate={{ y: [0, -amount, 0] }} transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}>{children}</motion.div>;
}

/** Entrance for the top of a page (hero copy, page header). */
export function Enter({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return <motion.div className={className} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay }}>{children}</motion.div>;
}

/** Image that zooms in slightly as it scrolls into view. */
export function ZoomIn({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return <motion.div className={className} initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.9, ease: EASE }}>{children}</motion.div>;
}
