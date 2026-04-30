import { motion } from 'framer-motion';
import { BookOpen, Zap, Brain, Search, MessageSquare, GraduationCap } from 'lucide-react';

interface FloatingCardData {
  icon: React.ElementType;
  label: string;
  sub: string;
  x: number;
  y: number;
  delay: number;
}

const cards: FloatingCardData[] = [
  { icon: Zap, label: 'AI Generate', sub: '12 lessons', x: -180, y: -80, delay: 0 },
  { icon: Search, label: 'Smart Search', sub: 'RAG powered', x: 160, y: -60, delay: 0.6 },
  { icon: MessageSquare, label: 'AI Copilot', sub: 'Always on', x: -150, y: 70, delay: 1.2 },
  { icon: GraduationCap, label: 'Quiz Ready', sub: 'Auto graded', x: 170, y: 90, delay: 1.8 },
  { icon: BookOpen, label: 'Course Live', sub: '98% rated', x: -60, y: 140, delay: 0.9 },
  { icon: Brain, label: 'Adaptive', sub: 'Personalized', x: 80, y: -130, delay: 1.5 },
];

export function FloatingCourseCards() {
  return (
    <div className="relative w-full h-full">
      {cards.map((card, i) => (
        <motion.div
          key={i}
          className="absolute glass rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-lg hover:shadow-xl transition-shadow cursor-default"
          style={{
            left: `calc(50% + ${card.x}px)`,
            top: `calc(50% + ${card.y}px)`,
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -8, 0],
          }}
          whileHover={{ scale: 1.1, y: -4 }}
          transition={{
            opacity: { delay: 0.8 + card.delay, duration: 0.5 },
            scale: { delay: 0.8 + card.delay, duration: 0.5 },
            y: { delay: 1.3 + card.delay, duration: 3 + i * 0.3, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-[0_0_12px_hsl(var(--primary)/0.3)]">
            <card.icon className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-xs font-semibold leading-tight">{card.label}</div>
            <div className="text-[10px] text-muted-foreground">{card.sub}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
