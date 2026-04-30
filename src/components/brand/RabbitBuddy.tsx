import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface RabbitBuddyProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  interactive?: boolean;
}

const sizes = {
  sm: { w: 48, h: 48, ear: 16, eye: 4, body: 28 },
  md: { w: 80, h: 80, ear: 24, eye: 6, body: 44 },
  lg: { w: 140, h: 140, ear: 36, eye: 9, body: 72 },
  xl: { w: 220, h: 220, ear: 52, eye: 13, body: 110 },
};

export function RabbitBuddy({ size = 'lg', className = '', interactive = true }: RabbitBuddyProps) {
  const s = sizes[size];
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const eyeOffsetX = useTransform(mouseX, [-200, 200], [-2, 2]);
  const eyeOffsetY = useTransform(mouseY, [-200, 200], [-1.5, 1.5]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  return (
    <motion.div
      ref={containerRef}
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: s.w, height: s.h }}
      onMouseMove={handleMouseMove}
      whileHover={interactive ? { scale: 1.08 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.3), transparent 70%)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      <svg viewBox="0 0 100 100" width={s.w} height={s.h} className="relative z-10">
        <defs>
          <linearGradient id="rabbit-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--gradient-start))" />
            <stop offset="100%" stopColor="hsl(var(--gradient-end))" />
          </linearGradient>
          <linearGradient id="rabbit-ear-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--gradient-end))" />
            <stop offset="100%" stopColor="hsl(var(--gradient-start))" />
          </linearGradient>
          <filter id="rabbit-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="rabbit-shine" cx="35%" cy="30%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.35" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Left ear */}
        <motion.ellipse
          cx="36" cy="22" rx="8" ry="20"
          fill="url(#rabbit-ear-grad)"
          filter="url(#rabbit-glow)"
          animate={{ rotate: [-3, 3, -3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '36px 40px' }}
        />
        <ellipse cx="36" cy="22" rx="4" ry="12" fill="hsl(var(--primary-foreground))" opacity="0.15" />

        {/* Right ear */}
        <motion.ellipse
          cx="64" cy="22" rx="8" ry="20"
          fill="url(#rabbit-ear-grad)"
          filter="url(#rabbit-glow)"
          animate={{ rotate: [3, -3, 3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          style={{ transformOrigin: '64px 40px' }}
        />
        <ellipse cx="64" cy="22" rx="4" ry="12" fill="hsl(var(--primary-foreground))" opacity="0.15" />

        {/* Body */}
        <circle cx="50" cy="58" r="28" fill="url(#rabbit-body-grad)" filter="url(#rabbit-glow)" />
        <circle cx="50" cy="58" r="28" fill="url(#rabbit-shine)" />

        {/* Eyes */}
        <motion.g style={{ x: eyeOffsetX, y: eyeOffsetY }}>
          <circle cx="41" cy="53" r="4.5" fill="hsl(var(--primary-foreground))" />
          <circle cx="41" cy="52" r="2" fill="hsl(var(--background))" opacity="0.9" />
          <motion.circle
            cx="42" cy="51" r="1"
            fill="hsl(var(--primary-foreground))"
            animate={{ opacity: [1, 1, 0, 1] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.92, 0.96, 1] }}
          />

          <circle cx="59" cy="53" r="4.5" fill="hsl(var(--primary-foreground))" />
          <circle cx="59" cy="52" r="2" fill="hsl(var(--background))" opacity="0.9" />
          <motion.circle
            cx="60" cy="51" r="1"
            fill="hsl(var(--primary-foreground))"
            animate={{ opacity: [1, 1, 0, 1] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.92, 0.96, 1] }}
          />
        </motion.g>

        {/* Nose */}
        <ellipse cx="50" cy="60" rx="2.5" ry="2" fill="hsl(var(--primary-foreground))" opacity="0.7" />

        {/* Mouth */}
        <path d="M47 63 Q50 66 53 63" stroke="hsl(var(--primary-foreground))" strokeWidth="1" fill="none" opacity="0.5" />

        {/* Cheek glow */}
        <circle cx="35" cy="60" r="4" fill="hsl(var(--gradient-end))" opacity="0.2" />
        <circle cx="65" cy="60" r="4" fill="hsl(var(--gradient-end))" opacity="0.2" />
      </svg>

      {/* Breathing glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary/20"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}
