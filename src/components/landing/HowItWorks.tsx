import { PenTool, Wand2, Users, GraduationCap, BookOpen, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { RabbitBuddy } from '@/components/brand/RabbitBuddy';

const flows = [
  {
    title: 'For Instructors',
    subtitle: 'Create → Generate → Publish',
    steps: [
      { icon: PenTool, num: '01', title: 'Describe Your Vision', desc: 'Enter a topic. The AI structures everything.' },
      { icon: Wand2, num: '02', title: 'AI Builds Your Course', desc: 'Lessons, quizzes, summaries — generated instantly.' },
      { icon: Users, num: '03', title: 'Publish & Teach', desc: 'Edit, refine, publish. Students enroll immediately.' },
    ],
  },
  {
    title: 'For Students',
    subtitle: 'Discover → Learn → Master',
    steps: [
      { icon: Search, num: '01', title: 'Explore & Search', desc: 'Find courses or ask AI directly about any topic.' },
      { icon: BookOpen, num: '02', title: 'Learn with AI Buddy', desc: 'Study lessons with your personal AI copilot.' },
      { icon: GraduationCap, num: '03', title: 'Test & Track', desc: 'Take quizzes, track progress, master concepts.' },
    ],
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 bg-muted/20 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[120px]" />

      <div className="container px-4 relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <motion.div className="flex justify-center mb-4">
            <RabbitBuddy size="md" interactive={false} />
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            How <span className="gradient-text">AI Course Buddy</span> Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Two paths, one intelligent platform. Create or learn — your buddy guides every step.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {flows.map((flow, fi) => (
            <motion.div
              key={flow.title}
              className="glass rounded-2xl p-8 border border-border/50"
              initial={{ opacity: 0, x: fi === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: fi * 0.15 }}
            >
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-1">{flow.title}</h3>
                <p className="text-sm text-muted-foreground">{flow.subtitle}</p>
              </div>

              <div className="space-y-5">
                {flow.steps.map((step, si) => (
                  <motion.div
                    key={step.num}
                    className="flex gap-4 items-start group"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: fi * 0.15 + si * 0.1, duration: 0.4 }}
                  >
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm group-hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-shadow">
                      {step.num}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-0.5">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
