import { Sparkles } from 'lucide-react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { container: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { container: 'w-10 h-10', icon: 'w-5 h-5' },
  lg: { container: 'w-14 h-14', icon: 'w-7 h-7' },
};

export function AppLogo({ size = 'md', showText = true, className = '' }: AppLogoProps) {
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${s.container} rounded-xl gradient-primary flex items-center justify-center flex-shrink-0`}>
        <Sparkles className={`${s.icon} text-primary-foreground`} />
      </div>
      {showText && (
        <span className="font-bold text-lg hidden sm:inline">AI Course Developer</span>
      )}
    </div>
  );
}
