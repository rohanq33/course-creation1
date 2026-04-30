import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface StatItem {
  target: number;
  suffix: string;
  label: string;
}

const stats: StatItem[] = [
  { target: 10, suffix: 'k+', label: 'Courses Created' },
  { target: 50, suffix: 'k+', label: 'Active Learners' },
  { target: 98, suffix: '%', label: 'Satisfaction' },
  { target: 24, suffix: '/7', label: 'AI Support' },
];

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1800, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target]);

  return <div ref={ref} className="text-3xl md:text-4xl font-bold gradient-text">{count}{suffix}</div>;
}

export function AnimatedStats() {
  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
    >
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          className="text-center glass rounded-2xl p-5 hover:shadow-lg transition-all"
          whileHover={{ scale: 1.05, y: -4 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
        >
          <Counter target={stat.target} suffix={stat.suffix} />
          <div className="text-muted-foreground mt-1 text-xs md:text-sm">{stat.label}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}
