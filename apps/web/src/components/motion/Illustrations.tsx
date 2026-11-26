'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../ui/cn';

/**
 * Decorative artwork for empty areas of public pages, drawn in the theme colours (no external images).
 * Purely decorative: hidden from assistive technology.
 */

type BookSpec = { w: number; h: number; d: number; cover: string; spine: string; band: string; tilt: number; x: number };
const BOOKS: BookSpec[] = [
  { w: 200, h: 34, d: 140, cover: '#0b3a3c', spine: '#114a4c', band: '#d6b47f', tilt: -4, x: 0 },
  { w: 184, h: 30, d: 130, cover: '#8a6530', spine: '#ad8247', band: '#f6ebd8', tilt: 3, x: 12 },
  { w: 192, h: 38, d: 136, cover: '#297375', spine: '#1a5d5f', band: '#e2c799', tilt: -2, x: -6 },
  { w: 170, h: 28, d: 124, cover: '#5b3a29', spine: '#8a5a3c', band: '#d6b47f', tilt: 5, x: 18 },
];

/** A stack of 3D books (CSS 3D transforms) with a gentle float. */
export function BookStack3D({ className, scale = 1 }: { className?: string; scale?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div aria-hidden className={cn('pointer-events-none select-none', className)} style={{ perspective: 900 }}
      animate={reduce ? undefined : { y: [0, -10, 0], rotateZ: [0, 1, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
      <div className="relative" style={{ transform: `scale(${scale}) rotateX(58deg) rotateZ(-28deg)`, transformStyle: 'preserve-3d', width: 220, height: 160 }}>
        {[...BOOKS].reverse().map((b, i) => {
          const z = (BOOKS.length - 1 - i) * 34;
          return (
            <div key={i} className="absolute start-0 top-0" style={{ width: b.w, height: b.d, transform: `translate3d(${b.x}px, 0, ${z}px) rotateZ(${b.tilt}deg)`, transformStyle: 'preserve-3d' }}>
              {/* top cover */}
              <div className="absolute inset-0 rounded-[6px] shadow-[0_0_0_1px_rgb(0_0_0/0.05)]" style={{ background: b.cover, transform: `translateZ(${b.h}px)` }}>
                <div className="absolute inset-x-5 top-1/2 h-2 -translate-y-1/2 rounded-full opacity-80" style={{ background: b.band }} />
                <div className="absolute inset-3 rounded-[4px] border opacity-40" style={{ borderColor: b.band }} />
              </div>
              {/* spine (front edge) */}
              <div className="absolute bottom-0 start-0 w-full origin-bottom" style={{ height: b.h, background: b.spine, transform: 'rotateX(-90deg)' }}>
                <div className="absolute inset-y-1 start-6 w-1.5 rounded" style={{ background: b.band }} />
                <div className="absolute inset-y-1 end-6 w-1.5 rounded" style={{ background: b.band }} />
              </div>
              {/* page block (side) */}
              <div className="absolute end-0 top-0 h-full origin-right" style={{ width: b.h, transform: 'rotateY(90deg)', background: 'repeating-linear-gradient(90deg,#fffcf7 0 2px,#ecdabb 2px 3px)' }} />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/** One open book, slightly tilted in 3D, pages gently fanning. */
export function OpenBook3D({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className={cn('pointer-events-none select-none', className)} style={{ perspective: 800 }}>
      <motion.div style={{ transformStyle: 'preserve-3d' }} initial={{ rotateX: 50, rotateZ: -12 }}
        animate={reduce ? { rotateX: 50, rotateZ: -12 } : { rotateX: [50, 46, 50], rotateZ: [-12, -9, -12] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} className="relative h-36 w-64">
        <div className="absolute inset-y-0 start-0 w-1/2 origin-right rounded-s-lg bg-[#fffcf7] shadow-lg" style={{ transform: 'rotateY(12deg)', backgroundImage: 'repeating-linear-gradient(0deg,transparent 0 14px,#ecdabb 14px 15px)' }} />
        <div className="absolute inset-y-0 end-0 w-1/2 origin-left rounded-e-lg bg-[#fffcf7] shadow-lg" style={{ transform: 'rotateY(-12deg)', backgroundImage: 'repeating-linear-gradient(0deg,transparent 0 14px,#ecdabb 14px 15px)' }} />
        <div className="absolute -inset-2 -z-10 rounded-xl bg-brand-900" style={{ transform: 'translateZ(-6px)' }} />
        {!reduce && (
          <motion.div className="absolute inset-y-0 end-0 w-1/2 origin-left rounded-e-lg bg-cream-50" style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateY: [-12, -150, -12] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }} />
        )}
      </motion.div>
    </div>
  );
}

/** Flat (2D) Dubai skyline with Burj Khalifa, line-art in gold on transparent background. */
export function BurjKhalifa({ className, tone = 'gold' }: { className?: string; tone?: 'gold' | 'brand' | 'light' }) {
  const reduce = useReducedMotion();
  const stroke = tone === 'gold' ? '#c49a5e' : tone === 'brand' ? '#0b3a3c' : '#ffffff';
  const fill = tone === 'light' ? 'rgb(255 255 255 / 0.08)' : tone === 'gold' ? 'rgb(196 154 94 / 0.12)' : 'rgb(11 58 60 / 0.08)';
  return (
    <svg aria-hidden viewBox="0 0 260 420" className={cn('pointer-events-none select-none', className)} fill="none">
      {/* Burj Khalifa: stepped setbacks narrowing to a spire */}
      <motion.path
        d="M130 8 L130 40 M126 40 L134 40 L136 78 L124 78 Z M121 78 L139 78 L142 120 L118 120 Z M114 120 L146 120 L150 168 L110 168 Z M106 168 L154 168 L160 222 L100 222 Z M96 222 L164 222 L172 282 L88 282 Z M84 282 L176 282 L186 350 L74 350 Z M68 350 L192 350 L204 404 L56 404 Z"
        stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" fill={fill}
        initial={reduce ? undefined : { pathLength: 0 }} whileInView={reduce ? undefined : { pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 2.4, ease: 'easeInOut' }} />
      {/* central fins */}
      <path d="M130 40 L130 404 M118 120 L112 404 M142 120 L148 404" stroke={stroke} strokeWidth="1" opacity="0.45" />
      {/* neighbouring towers */}
      <path d="M18 404 L18 300 L38 286 L38 404 M44 404 L44 330 L62 330 L62 404 M200 404 L200 318 L214 300 L228 318 L228 404 M232 404 L232 344 L250 344 L250 404" stroke={stroke} strokeWidth="1.6" opacity="0.6" />
      {/* ground line */}
      <path d="M4 406 H256" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      {/* beacon */}
      {!reduce && <motion.circle cx="130" cy="8" r="4" fill={stroke} animate={{ opacity: [0.2, 1, 0.2], r: [3, 5, 3] }} transition={{ duration: 2.4, repeat: Infinity }} />}
    </svg>
  );
}

/** Composition for an empty right-hand column: skyline behind, books in front. */
export function DubaiLearningArt({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative grid place-items-center', className)}>
      <div className="absolute inset-x-6 bottom-6 top-0 rounded-t-full bg-gradient-to-b from-gold-100/80 to-cream-50/0" />
      <BurjKhalifa className="relative h-[22rem] w-auto" />
      <BookStack3D className="absolute -bottom-2 start-2" scale={0.8} />
      <OpenBook3D className="absolute bottom-10 end-0 scale-75" />
    </div>
  );
}

/** Stepped hexagonal tiers [apothem, height] in units of 1/100 of the tower height, bottom to top. */
const TIERS: [number, number][] = [[12, 14], [10.6, 12], [9.3, 11], [8, 10], [6.8, 9.5], [5.6, 9], [4.5, 8.5], [3.4, 8], [2.4, 7]];
const SIDES = 6;
/** Bottom offset of each tier, and where the spire starts. */
const TIER_BOTTOMS = TIERS.map((_, i) => TIERS.slice(0, i).reduce((n, [, h]) => n + h, 0));
const SPIRE_AT = TIERS.reduce((n, [, h]) => n + h, 0);

/**
 * A real 3D Burj Khalifa built from CSS 3D prisms (no images, no WebGL): stepped hexagonal tiers and
 * a spire, turning slowly on its own axis. `size` is the tower height in vh.
 */
export function Burj3D({ className, size = 76, tone = 'gold', duration = 30 }: { className?: string; size?: number; tone?: 'gold' | 'light'; duration?: number }) {
  const reduce = useReducedMotion();
  const u = (n: number) => `calc(var(--u) * ${n})`;
  const faceBg = (k: number) => {
    const shade = [0.95, 0.75, 0.55, 0.45, 0.6, 0.85][k];
    return tone === 'light'
      ? `linear-gradient(180deg, rgb(255 255 255 / ${0.22 * shade}), rgb(214 180 127 / ${0.28 * shade})), repeating-linear-gradient(0deg, rgb(255 255 255 / 0.35) 0 1px, transparent 1px 7px)`
      : `linear-gradient(180deg, rgb(226 199 153 / ${shade}), rgb(173 130 71 / ${shade})), repeating-linear-gradient(0deg, rgb(255 252 247 / 0.55) 0 1px, transparent 1px 7px)`;
  };
  const edge = tone === 'light' ? 'rgb(255 255 255 / 0.35)' : 'rgb(138 101 48 / 0.55)';
  return (
    <div aria-hidden className={cn('pointer-events-none relative select-none', className)}
      style={{ ['--u' as string]: `calc(${size}vh / 100)`, height: u(100), width: u(30), perspective: '1800px' } as React.CSSProperties}>
      <motion.div className="absolute inset-0 [transform-style:preserve-3d] will-change-transform" style={{ rotateX: -6 }}
        animate={reduce ? undefined : { rotateY: 360 }} transition={{ duration, repeat: Infinity, ease: 'linear' }}>
        {TIERS.map(([a, h], ti) => {
          const bottom = TIER_BOTTOMS[ti];
          const w = a * 1.1547; // face width of a hexagon from its apothem
          return (
            <div key={ti} className="absolute left-1/2 [transform-style:preserve-3d]" style={{ bottom: u(bottom), height: u(h), width: 0 }}>
              {Array.from({ length: SIDES }, (_, k) => (
                <div key={k} className="absolute bottom-0 h-full" style={{ width: u(w), left: u(-w / 2), background: faceBg(k), borderInline: `1px solid ${edge}`, transform: `rotateY(${k * (360 / SIDES)}deg) translateZ(${u(a)})` }} />
              ))}
            </div>
          );
        })}
        {/* spire */}
        <div className="absolute left-1/2 [transform-style:preserve-3d]" style={{ bottom: u(SPIRE_AT), height: u(100 - SPIRE_AT), width: 0 }}>
          {[0, 60, 120].map((r) => <div key={r} className="absolute bottom-0 h-full" style={{ width: u(1.2), left: u(-0.6), background: tone === 'light' ? 'rgb(255 255 255 / 0.5)' : '#ad8247', clipPath: 'polygon(30% 0, 70% 0, 100% 100%, 0 100%)', transform: `rotateY(${r}deg)` }} />)}
        </div>
      </motion.div>
    </div>
  );
}

/** Kept for compatibility: the turning tower. */
export function SpinningBurj({ className, tone = 'gold', duration = 30 }: { className?: string; tone?: 'gold' | 'brand' | 'light'; duration?: number }) {
  return <Burj3D className={className} tone={tone === 'light' ? 'light' : 'gold'} duration={duration} />;
}

/**
 * Section decoration. Even variants: a large turning 3D Burj Khalifa behind the content.
 * Odd variants: a 3D book stack shown in full colour in its own corner (never behind text).
 * A section never gets both.
 */
export function SectionArt({ variant = 0, dark = false }: { variant?: number; dark?: boolean }) {
  const right = Math.floor(variant / 2) % 2 === 0;
  if (variant % 2 === 0) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <Burj3D size={76} tone={dark ? 'light' : 'gold'} duration={28 + (variant % 3) * 6}
          className={cn('absolute bottom-0 opacity-25 sm:opacity-40', dark && 'sm:opacity-50', right ? 'end-[4%]' : 'start-[4%]')} />
      </div>
    );
  }
  return (
    <div aria-hidden className={cn('pointer-events-none absolute top-10 z-20 hidden lg:block', right ? 'end-[3%]' : 'start-[3%]')}>
      <BookStack3D scale={1.05} />
    </div>
  );
}
