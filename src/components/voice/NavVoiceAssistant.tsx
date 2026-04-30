import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { streamChatSearch } from '@/lib/chatService';
import { detectIntent, executeCreateCourse } from '@/lib/voiceIntents';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export type NavVoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

const PROCESSING_TIMEOUT_MS = 90_000;

export function NavVoiceAssistant() {
  const navigate = useNavigate();
  const [voiceState, setVoiceState] = useState<NavVoiceState>('idle');
  const [statusLabel, setStatusLabel] = useState('');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearProcessingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const finishWithError = useCallback((msg: string) => {
    clearProcessingTimeout();
    abortRef.current?.abort();
    abortRef.current = null;
    toast.error(msg);
    setVoiceState('error');
    setStatusLabel(msg);
    setTimeout(() => {
      setVoiceState('idle');
      setShowOverlay(false);
      setStatusLabel('');
    }, 3000);
  }, [clearProcessingTimeout]);

  const finishWithSpeech = useCallback((text: string, afterSpeech?: () => void) => {
    clearProcessingTimeout();
    abortRef.current = null;
    if (text && synthesis.isSupported) {
      setVoiceState('speaking');
      setStatusLabel('');
      synthesis.speak(text);
      if (afterSpeech) {
        // Navigate after speech ends — handled via onEnd
      }
    } else {
      setVoiceState('idle');
      setTimeout(() => setShowOverlay(false), 1500);
      afterSpeech?.();
    }
  }, [clearProcessingTimeout]);

  // We need synthesis declared before finishWithSpeech references it,
  // but synthesis.speak is stable, so this is fine with the ref pattern.
  const afterSpeechActionRef = useRef<(() => void) | null>(null);

  const synthesis = useSpeechSynthesis({
    onEnd: () => {
      setVoiceState('idle');
      const action = afterSpeechActionRef.current;
      afterSpeechActionRef.current = null;
      if (action) {
        setTimeout(() => {
          setShowOverlay(false);
          action();
        }, 500);
      } else {
        setTimeout(() => setShowOverlay(false), 1500);
      }
    },
    onError: (msg) => {
      toast.error(msg);
      setVoiceState('idle');
      const action = afterSpeechActionRef.current;
      afterSpeechActionRef.current = null;
      if (action) action();
    },
  });

  const processQuery = useCallback(async (query: string) => {
    const intent = detectIntent(query);

    // Start a global timeout so we never get stuck
    clearProcessingTimeout();
    timeoutRef.current = setTimeout(() => {
      finishWithError('Request timed out. Please try again.');
    }, PROCESSING_TIMEOUT_MS);

    if (intent.type === 'create_course' && intent.topic) {
      setStatusLabel(`Creating "${intent.topic}" course…`);

      const result = await executeCreateCourse(intent.topic);
      clearProcessingTimeout();

      if (result.success) {
        const confirmMsg = result.message;
        setResponse(confirmMsg);
        afterSpeechActionRef.current = result.navigateTo ? () => {
          navigate(result.navigateTo!);
        } : null;
        if (synthesis.isSupported) {
          setVoiceState('speaking');
          synthesis.speak(confirmMsg);
        } else {
          setVoiceState('idle');
          setTimeout(() => {
            setShowOverlay(false);
            if (result.navigateTo) navigate(result.navigateTo);
          }, 1000);
        }
        toast.success(confirmMsg);
      } else {
        finishWithError(result.message || 'Failed to create course.');
      }
      return;
    }

    // General query — use streaming RAG pipeline
    setStatusLabel('');
    const controller = new AbortController();
    abortRef.current = controller;
    let fullContent = '';

    await streamChatSearch({
      query,
      messages: [],
      onMeta: () => {},
      onDelta: (delta) => {
        fullContent += delta;
        setResponse(fullContent);
      },
      onDone: () => {
        clearProcessingTimeout();
        abortRef.current = null;
        if (fullContent && synthesis.isSupported) {
          setVoiceState('speaking');
          synthesis.speak(fullContent);
        } else {
          setVoiceState('idle');
          setTimeout(() => setShowOverlay(false), 2000);
        }
      },
      onError: (err) => {
        finishWithError(err);
      },
      signal: controller.signal,
    });
  }, [synthesis, navigate, clearProcessingTimeout, finishWithError]);

  const recognition = useSpeechRecognition({
    onResult: (text) => {
      setTranscript(text);
      setVoiceState('processing');
      processQuery(text);
    },
    onError: (msg) => {
      toast.error(msg);
      setVoiceState('error');
      setTimeout(() => {
        setVoiceState('idle');
        setShowOverlay(false);
      }, 2000);
    },
  });

  const handleClick = useCallback(() => {
    if (voiceState === 'listening') {
      recognition.stopListening();
      setVoiceState('idle');
      setShowOverlay(false);
      return;
    }
    if (voiceState === 'speaking') {
      synthesis.stop();
      afterSpeechActionRef.current = null;
      setVoiceState('idle');
      setShowOverlay(false);
      return;
    }
    if (voiceState === 'processing') {
      abortRef.current?.abort();
      clearProcessingTimeout();
      setVoiceState('idle');
      setShowOverlay(false);
      return;
    }
    if (!recognition.isSupported) {
      toast.error('Voice assistant is not supported in this browser.');
      return;
    }
    setTranscript('');
    setResponse('');
    setStatusLabel('');
    setShowOverlay(true);
    synthesis.stop();
    recognition.startListening();
    setVoiceState('listening');
  }, [voiceState, recognition, synthesis, clearProcessingTimeout]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      clearProcessingTimeout();
      synthesis.stop();
      recognition.stopListening();
    };
  }, []);

  if (!recognition.isSupported) return null;

  const isActive = voiceState !== 'idle';

  const displayStatus = statusLabel || (
    voiceState === 'listening' ? 'Listening…' :
    voiceState === 'processing' ? 'Thinking…' :
    voiceState === 'speaking' ? 'Speaking…' :
    voiceState === 'error' ? 'Something went wrong' :
    (response ? 'Done' : 'Ready')
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <AnimatePresence>
              {voiceState === 'listening' && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/15"
                    initial={{ scale: 1, opacity: 0.3 }}
                    animate={{ scale: 2.8, opacity: 0 }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                  />
                </>
              )}
              {voiceState === 'speaking' && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/20"
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
            </AnimatePresence>

            <Button
              size="icon"
              variant="ghost"
              onClick={handleClick}
              className={cn(
                'relative z-10 h-9 w-9 rounded-full transition-all duration-300',
                isActive && 'shadow-[0_0_20px_hsl(var(--primary)/0.5)]',
              )}
            >
              <VoiceOrbIcon state={voiceState} />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {voiceState === 'idle' && 'Ask Buddy'}
            {voiceState === 'listening' && 'Listening… tap to stop'}
            {voiceState === 'processing' && 'Thinking…'}
            {voiceState === 'speaking' && 'Speaking… tap to stop'}
            {voiceState === 'error' && 'Try again'}
          </p>
        </TooltipContent>
      </Tooltip>

      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
            onClick={() => {
              if (voiceState === 'idle') setShowOverlay(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center gap-6 max-w-md px-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleClick}
                className="relative w-28 h-28 rounded-full flex items-center justify-center focus:outline-none"
              >
                <div className="absolute inset-0 rounded-full gradient-primary opacity-20 blur-xl" />
                <motion.div
                  className="absolute inset-0 rounded-full gradient-primary"
                  animate={
                    voiceState === 'listening'
                      ? { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }
                      : voiceState === 'processing'
                        ? { rotate: 360 }
                        : voiceState === 'speaking'
                          ? { scale: [1, 1.05, 1] }
                          : {}
                  }
                  transition={
                    voiceState === 'listening'
                      ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                      : voiceState === 'processing'
                        ? { duration: 2, repeat: Infinity, ease: 'linear' }
                        : voiceState === 'speaking'
                          ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
                          : {}
                  }
                  style={{ opacity: 0.9 }}
                />
                <div className="relative z-10">
                  <VoiceOrbIcon state={voiceState} size={40} />
                </div>

                {voiceState === 'listening' && (
                  <>
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute inset-0 rounded-full border-2 border-primary/30"
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ scale: 1.5 + i * 0.4, opacity: 0 }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
                      />
                    ))}
                  </>
                )}

                {voiceState === 'speaking' && (
                  <div className="absolute -bottom-3 flex items-end gap-[3px]">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-[3px] rounded-full bg-primary-foreground"
                        animate={{ height: [6, 18, 6] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                )}
              </button>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{displayStatus}</p>
                {transcript && voiceState !== 'idle' && (
                  <p className="text-xs text-muted-foreground italic max-w-sm">"{transcript}"</p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  recognition.stopListening();
                  synthesis.stop();
                  abortRef.current?.abort();
                  clearProcessingTimeout();
                  afterSpeechActionRef.current = null;
                  setVoiceState('idle');
                  setShowOverlay(false);
                }}
              >
                <X className="w-4 h-4 mr-1" />
                {voiceState === 'idle' ? 'Close' : 'Cancel'}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}

// ─── Siri-style Voice Orb Icon ──────────────────────────
function VoiceOrbIcon({ state, size = 18 }: { state: NavVoiceState; size?: number }) {
  const r = size / 2;
  const cx = r;
  const cy = r;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" className="overflow-visible">
      <circle cx={cx} cy={cy} r={r - 1} stroke="hsl(var(--primary))" strokeWidth={state === 'idle' ? 1.5 : 2} fill="none" opacity={state === 'idle' ? 0.6 : 1} />
      <circle cx={cx} cy={cy} r={r * 0.45} fill="hsl(var(--primary))" opacity={state === 'idle' ? 0.7 : 1} />
      {(state === 'listening' || state === 'speaking') && (
        <>
          <line x1={cx - r * 0.55} y1={cy} x2={cx - r * 0.25} y2={cy} stroke="hsl(var(--primary))" strokeWidth={1.5} strokeLinecap="round" />
          <line x1={cx + r * 0.25} y1={cy} x2={cx + r * 0.55} y2={cy} stroke="hsl(var(--primary))" strokeWidth={1.5} strokeLinecap="round" />
        </>
      )}
      {state === 'processing' && (
        <circle cx={cx} cy={cy} r={r - 1} stroke="hsl(var(--primary))" strokeWidth={2} fill="none" strokeDasharray={`${r * 1.5} ${r * 3}`} className="animate-spin origin-center" />
      )}
    </svg>
  );
}
