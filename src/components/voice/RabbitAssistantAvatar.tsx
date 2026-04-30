import { motion } from 'framer-motion';

export type RabbitState = 'idle' | 'listening' | 'processing' | 'speaking' | 'exit';

interface RabbitAssistantAvatarProps {
  state: RabbitState;
  size?: number;
}

export function RabbitAssistantAvatar({ state, size = 120 }: RabbitAssistantAvatarProps) {
  const s = size;
  const earWiggle = state === 'listening'
    ? { rotate: [-8, 8, -8], y: [-2, 0, -2] }
    : state === 'processing'
      ? { rotate: [0, 3, 0] }
      : { rotate: [-2, 2, -2] };

  const earTransition = state === 'listening'
    ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' as const }
    : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const };

  const bodyBreathe = state === 'speaking'
    ? { scale: [1, 1.03, 1], y: [0, -1, 0] }
    : state === 'processing'
      ? { scale: [1, 1.01, 1] }
      : { scale: [1, 1.015, 1], y: [0, -1, 0] };

  const bodyTransition = state === 'speaking'
    ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' as const }
    : { duration: 3, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <div className="relative" style={{ width: s, height: s + 20 }}>
      {/* Glow ring behind rabbit */}
      {(state === 'listening' || state === 'speaking') && (
        <motion.div
          className="absolute rounded-full"
          style={{
            left: s * 0.1,
            top: s * 0.2,
            width: s * 0.8,
            height: s * 0.8,
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)',
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {state === 'processing' && (
        <motion.div
          className="absolute rounded-full border-2 border-primary/40"
          style={{
            left: s * 0.15,
            top: s * 0.25,
            width: s * 0.7,
            height: s * 0.7,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <svg viewBox="0 0 120 140" width={s} height={s + 20} className="relative z-10">
        <defs>
          <linearGradient id="rb-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
          <linearGradient id="rb-ear" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
          <radialGradient id="rb-shine" cx="35%" cy="30%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <filter id="rb-shadow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Left ear */}
        <motion.g
          style={{ transformOrigin: '42px 55px' }}
          animate={earWiggle}
          transition={earTransition}
        >
          <ellipse cx="38" cy="30" rx="10" ry="26" fill="url(#rb-ear)" />
          <ellipse cx="38" cy="30" rx="5" ry="16" fill="hsl(var(--primary-foreground))" opacity="0.15" />
          {/* Inner ear pink */}
          <ellipse cx="38" cy="32" rx="4" ry="12" fill="hsl(var(--destructive))" opacity="0.2" />
        </motion.g>

        {/* Right ear */}
        <motion.g
          style={{ transformOrigin: '78px 55px' }}
          animate={{ ...earWiggle, rotate: earWiggle.rotate.map((r: number) => -r) }}
          transition={{ ...earTransition, delay: 0.15 }}
        >
          <ellipse cx="82" cy="30" rx="10" ry="26" fill="url(#rb-ear)" />
          <ellipse cx="82" cy="30" rx="5" ry="16" fill="hsl(var(--primary-foreground))" opacity="0.15" />
          <ellipse cx="82" cy="32" rx="4" ry="12" fill="hsl(var(--destructive))" opacity="0.2" />
        </motion.g>

        {/* Body */}
        <motion.g
          style={{ transformOrigin: '60px 85px' }}
          animate={bodyBreathe}
          transition={bodyTransition}
        >
          {/* Main body */}
          <ellipse cx="60" cy="90" rx="34" ry="38" fill="url(#rb-body)" filter="url(#rb-shadow)" />
          <ellipse cx="60" cy="90" rx="34" ry="38" fill="url(#rb-shine)" />

          {/* Belly */}
          <ellipse cx="60" cy="98" rx="20" ry="22" fill="hsl(var(--primary-foreground))" opacity="0.1" />

          {/* Face */}
          {/* Eyes */}
          <motion.g
            animate={
              state === 'processing'
                ? { y: [0, -1, 0] }
                : {}
            }
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {/* Left eye */}
            <ellipse cx="48" cy="78" rx="5.5" ry="6" fill="hsl(var(--primary-foreground))" />
            <ellipse cx="47" cy="77" rx="2.5" ry="3" fill="hsl(var(--background))" opacity="0.9" />
            <motion.ellipse
              cx="47" cy="76" rx="1.2" ry="1.2"
              fill="white"
              animate={{ opacity: [1, 1, 0.2, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
            />

            {/* Right eye */}
            <ellipse cx="72" cy="78" rx="5.5" ry="6" fill="hsl(var(--primary-foreground))" />
            <ellipse cx="71" cy="77" rx="2.5" ry="3" fill="hsl(var(--background))" opacity="0.9" />
            <motion.ellipse
              cx="71" cy="76" rx="1.2" ry="1.2"
              fill="white"
              animate={{ opacity: [1, 1, 0.2, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
            />
          </motion.g>

          {/* Nose */}
          <ellipse cx="60" cy="86" rx="3" ry="2.5" fill="hsl(var(--destructive))" opacity="0.5" />

          {/* Mouth */}
          <motion.path
            d={state === 'speaking'
              ? "M53 91 Q60 97 67 91"
              : "M55 90 Q60 94 65 90"
            }
            stroke="hsl(var(--primary-foreground))"
            strokeWidth="1.2"
            fill={state === 'speaking' ? 'hsl(var(--destructive))' : 'none'}
            fillOpacity={state === 'speaking' ? 0.3 : 0}
            animate={state === 'speaking' ? { d: ["M53 91 Q60 97 67 91", "M54 90 Q60 93 66 90", "M53 91 Q60 97 67 91"] } : {}}
            transition={state === 'speaking' ? { duration: 0.4, repeat: Infinity } : {}}
          />

          {/* Cheeks */}
          <circle cx="40" cy="88" r="5" fill="hsl(var(--destructive))" opacity="0.15" />
          <circle cx="80" cy="88" r="5" fill="hsl(var(--destructive))" opacity="0.15" />

          {/* Little paws at bottom */}
          <ellipse cx="47" cy="122" rx="8" ry="5" fill="url(#rb-body)" />
          <ellipse cx="73" cy="122" rx="8" ry="5" fill="url(#rb-body)" />
        </motion.g>

        {/* AI sparkle accent */}
        <motion.g
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '92px 60px' }}
        >
          <circle cx="92" cy="60" r="3" fill="hsl(var(--primary))" opacity="0.6" />
          <circle cx="92" cy="60" r="1.5" fill="white" opacity="0.8" />
        </motion.g>
      </svg>
    </div>
  );
}
