import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLogo } from '@/components/brand/AppLogo';


export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="container px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <AppLogo size="sm" />
          </Link>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/search">AI Search</Link>
            </Button>
<Button variant="ghost" size="sm" asChild>
              <Link to="/instructor">Instructor</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/student">Student</Link>
            </Button>
            <Button size="sm" className="gradient-primary hover:opacity-90 hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-border"
            >
              <div className="flex flex-col gap-2 py-4">
                <Button variant="ghost" className="justify-start" asChild>
                  <Link to="/search" onClick={() => setIsOpen(false)}>AI Search</Link>
                </Button>
<Button variant="ghost" className="justify-start" asChild>
                  <Link to="/instructor" onClick={() => setIsOpen(false)}>Instructor</Link>
                </Button>
                <Button variant="ghost" className="justify-start" asChild>
                  <Link to="/student" onClick={() => setIsOpen(false)}>Student</Link>
                </Button>
                <Button className="gradient-primary hover:opacity-90" asChild>
                  <Link to="/auth" onClick={() => setIsOpen(false)}>Get Started</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
