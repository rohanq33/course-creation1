import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

interface VoiceControlsProps {
  voiceState: VoiceState;
  isRecognitionSupported: boolean;
  isSynthesisSupported: boolean;
  onMicClick: () => void;
  onStopSpeaking: () => void;
}

export function VoiceControls({
  voiceState,
  isRecognitionSupported,
  isSynthesisSupported,
  onMicClick,
  onStopSpeaking,
}: VoiceControlsProps) {
  if (!isRecognitionSupported) return null;

  return (
    <div className="relative flex items-center">
      {/* Speaking stop button */}
      <AnimatePresence>
        {voiceState === 'speaking' && isSynthesisSupported && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            <Button
              size="icon"
              variant="ghost"
              onClick={onStopSpeaking}
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
              title="Stop speaking"
            >
              <VolumeX className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic button */}
      <div className="relative">
        {/* Pulse rings when listening */}
        <AnimatePresence>
          {voiceState === 'listening' && (
            <>
              <motion.div
                className="absolute inset-0 rounded-xl bg-primary/20"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute inset-0 rounded-xl bg-primary/15"
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
              />
            </>
          )}
        </AnimatePresence>

        <Button
          size="icon"
          variant={voiceState === 'listening' ? 'default' : 'ghost'}
          onClick={onMicClick}
          disabled={voiceState === 'processing'}
          className={cn(
            'h-9 w-9 rounded-xl transition-all relative z-10',
            voiceState === 'listening' && 'gradient-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)]',
            voiceState === 'processing' && 'opacity-60',
            voiceState === 'idle' && 'text-muted-foreground hover:text-foreground',
          )}
          title={
            voiceState === 'listening'
              ? 'Stop listening'
              : voiceState === 'processing'
                ? 'Processing...'
                : 'Speak to AI Buddy'
          }
        >
          {voiceState === 'processing' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : voiceState === 'listening' ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Speaking indicator */}
      <AnimatePresence>
        {voiceState === 'speaking' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-0.5 ml-1"
          >
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-0.5 bg-primary rounded-full"
                animate={{ height: [4, 12, 4] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
