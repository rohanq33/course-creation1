import { Sparkles, BookOpen, MessageSquare, Trophy, Zap, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  { icon: Sparkles, title: 'AI Course Generation', description: 'Describe your topic — get full courses with lessons, summaries, and quizzes in seconds.', color: 'from-primary to-primary/70' },
  { icon: MessageSquare, title: 'Smart AI Copilot', description: 'A personal tutor that understands every lesson and adapts to your level.', color: 'from-primary/80 to-accent-foreground' },
  { icon: Brain, title: 'RAG-Powered Search', description: 'Ask anything — the AI searches through course content for grounded answers.', color: 'from-accent-foreground to-primary' },
  { icon: BookOpen, title: 'Rich Structured Content', description: 'Lessons auto-generated with depth: summaries, key points, and interactive sections.', color: 'from-primary to-primary/60' },
  { icon: Zap, title: 'Instant Quiz Generation', description: 'AI creates smart quiz questions to reinforce understanding and track mastery.', color: 'from-primary/70 to-accent-foreground' },
  { icon: Trophy, title: 'Progress Tracking', description: 'Visual progress, completion tracking, and a learning journey you can follow.', color: 'from-accent-foreground to-primary/80' },
];

export function Features() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/5 rounded-full blur-[100px]" />

      <div className="container px-4 relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <motion.span
            className="inline-block px-4 py-1.5 rounded-full glass text-sm font-medium text-muted-foreground mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            Intelligent Features
          </motion.span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything <span className="gradient-text">AI Course Developer</span> Can Do
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From course creation to doubt solving — AI powers the entire learning experience.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="group"
            >
              <div className="h-full glass rounded-2xl p-7 hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/30">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.35)] transition-shadow duration-300`}>
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
