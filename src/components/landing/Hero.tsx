import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedBackground } from '@/components/brand/AnimatedBackground';
import { AppLogo } from '@/components/brand/AppLogo';
import { FloatingCourseCards } from '@/components/brand/FloatingCourseCard';
import { AnimatedStats } from '@/components/brand/AnimatedStats';

export function Hero() {
  return (
    <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden">
      <AnimatedBackground variant="hero" />

      <div className="container relative z-10 px-4 py-16 md:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center max-w-6xl mx-auto">
          {/* Left: Text */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium mb-6"
            >
              <AppLogo size="sm" showText={false} />
              <span>Meet Your AI Course Developer</span>
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Your Smart{' '}
              <span className="gradient-text">AI Course</span>
              <br />
              Developer
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Create AI-powered courses in seconds. Learn with an intelligent copilot that truly understands your content.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button
                size="lg"
                className="text-lg px-8 py-6 gradient-primary hover:opacity-90 transition-all hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] hover:scale-105"
                asChild
              >
                <Link to="/auth?tab=signup&role=instructor">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Creating
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 hover:scale-105 transition-all glass"
                asChild
              >
                <Link to="/student-dashboard">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Start Learning
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* Right: Mascot + floating cards */}
          <motion.div
            className="relative hidden lg:flex items-center justify-center"
            style={{ minHeight: 420 }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            {/* Central mascot */}
            <motion.div
              className="relative z-20"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <AppLogo size="lg" showText={false} />
            </motion.div>

            {/* Orbiting cards */}
            <FloatingCourseCards />

            {/* Background glow behind mascot */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 rounded-full bg-primary/15 blur-[80px]" />
            </div>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="mt-16 md:mt-20">
          <AnimatedStats />
        </div>
      </div>
    </section>
  );
}
