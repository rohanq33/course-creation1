import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppLogo } from '@/components/brand/AppLogo';

export function Footer() {
  return (
    <motion.footer
      className="py-12 border-t border-border"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="container px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <AppLogo size="sm" />
          </div>

          <div className="flex gap-8 text-muted-foreground text-sm">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/search" className="hover:text-foreground transition-colors">AI Search</Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link>
          </div>

          <div className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} AI Course Developer. All rights reserved.
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
