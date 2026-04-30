import { Star, Quote } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Marketing Instructor',
    content: 'I created my entire digital marketing course in 2 hours. The AI understood exactly what I needed and generated quality content my students love.',
    initials: 'SC',
  },
  {
    name: 'Marcus Johnson',
    role: 'CS Student',
    content: 'The AI copilot is like having a personal tutor available 24/7. It explains complex algorithms in ways I can actually understand.',
    initials: 'MJ',
  },
  {
    name: 'Dr. Emily Park',
    role: 'Biology Professor',
    content: 'This platform transformed how I create educational content. The AI-generated quizzes are impressive and save me hours of work.',
    initials: 'EP',
  },
];

export function Testimonials() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />

      <div className="container px-4 relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Loved by <span className="gradient-text">Educators & Learners</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See why instructors and students trust their AI Course Buddy
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, index) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: index * 0.12, duration: 0.5 }}
              whileHover={{ y: -6 }}
              className="group"
            >
              <div className="h-full glass rounded-2xl p-7 border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-xl relative">
                <Quote className="absolute top-5 right-5 w-8 h-8 text-primary/10" />
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                  "{t.content}"
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                    <AvatarFallback className="gradient-primary text-primary-foreground font-semibold text-xs">
                      {t.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
