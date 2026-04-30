import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useWakeWord } from '@/hooks/useWakeWord';
import { streamChatSearch } from '@/lib/chatService';
import {
  detectIntent,
  executeCreateCourse,
  executeAddLesson,
  executeGenerateQuiz,
} from '@/lib/voiceIntents';
import { RabbitAssistantAvatar, type RabbitState } from '@/components/voice/RabbitAssistantAvatar';
import { toast } from 'sonner';

type AssistantPhase = 'hidden' | 'greeting' | 'listening' | 'processing' | 'speaking' | 'error';

const PROCESSING_TIMEOUT_MS = 90_000;

export function GlobalVoiceAssistant() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<AssistantPhase>('hidden');
  const [subtitle, setSubtitle] = useState('');
  const [userText, setUserText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const afterSpeechRef = useRef<(() => void) | null>(null);
  const [wakeEnabled, setWakeEnabled] = useState(true);

  /* ── helpers ── */

  const clearProcessingTimeout = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  const dismiss = useCallback(() => {
    clearProcessingTimeout();
    abortRef.current?.abort();
    abortRef.current = null;
    afterSpeechRef.current = null;
    synthesisRef.current.stop();
    recognitionRef.current.stopListening();
    setPhase('hidden');
    setSubtitle('');
    setUserText('');
    setTimeout(() => setWakeEnabled(true), 1500);
  }, [clearProcessingTimeout]);

  /* We store hook returns in refs so dismiss() doesn't need them as deps */
  const synthesisRef = useRef<ReturnType<typeof useSpeechSynthesis>>(null!);
  const recognitionRef = useRef<ReturnType<typeof useSpeechRecognition>>(null!);

  /* ── speech synthesis ── */
  const synthesis = useSpeechSynthesis({
    onEnd: () => {
      const action = afterSpeechRef.current;
      afterSpeechRef.current = null;
      if (action) { dismiss(); action(); }
      else { setPhase('listening'); setSubtitle(''); recognitionRef.current.startListening(); }
    },
    onError: () => {
      const action = afterSpeechRef.current;
      afterSpeechRef.current = null;
      // Fallback: even if TTS fails, still show subtitle and continue
      if (action) { dismiss(); action(); }
      else { setPhase('listening'); setSubtitle(''); recognitionRef.current.startListening(); }
    },
  });
  synthesisRef.current = synthesis;

  /* ── speak helper ── */
  const speakAndShow = useCallback((text: string, afterAction?: () => void) => {
    clearProcessingTimeout();
    setSubtitle(text);
    setPhase('speaking');
    afterSpeechRef.current = afterAction || null;
    if (synthesis.isSupported) {
      synthesis.speak(text);
    } else {
      // TTS not supported — show subtitle, then continue after delay
      setTimeout(() => {
        afterSpeechRef.current = null;
        if (afterAction) { dismiss(); afterAction(); }
        else { setPhase('listening'); setSubtitle(''); recognitionRef.current.startListening(); }
      }, 2500);
    }
  }, [synthesis, clearProcessingTimeout, dismiss]);

  /* ── process query (intent routing) ── */
  const processQuery = useCallback(async (query: string) => {
    const intent = detectIntent(query);

    // ─ dismiss
    if (intent.type === 'dismiss') {
      speakAndShow('Anytime!', () => {});
      return;
    }

    // ─ navigate
    if (intent.type === 'navigate' && intent.target) {
      speakAndShow(intent.topic || 'On it!', () => navigate(intent.target!));
      return;
    }

    // ─ conversation (instant local answer)
    if (intent.type === 'conversation' && intent.topic) {
      speakAndShow(intent.topic);
      return;
    }

    // ─ start processing phase
    setPhase('processing');
    clearProcessingTimeout();
    timeoutRef.current = setTimeout(() => {
      speakAndShow('Sorry, that took too long. Please try again.');
    }, PROCESSING_TIMEOUT_MS);

    // ─ create course
    if (intent.type === 'create_course' && intent.topic) {
      setSubtitle(`Creating "${intent.topic}" course…`);
      const result = await executeCreateCourse(intent.topic);
      clearProcessingTimeout();
      if (result.success) {
        toast.success(result.message);
        speakAndShow(result.message, result.navigateTo ? () => navigate(result.navigateTo!) : undefined);
      } else {
        speakAndShow(result.message);
      }
      return;
    }

    // ─ add lesson
    if (intent.type === 'add_lesson' && intent.topic) {
      setSubtitle(`Adding lesson on "${intent.topic}"…`);
      const result = await executeAddLesson(intent.topic);
      clearProcessingTimeout();
      if (result.success) {
        toast.success(result.message);
        speakAndShow(result.message, result.navigateTo ? () => navigate(result.navigateTo!) : undefined);
      } else {
        speakAndShow(result.message);
      }
      return;
    }

    // ─ generate quiz
    if (intent.type === 'generate_quiz') {
      setSubtitle('Generating quiz…');
      const result = await executeGenerateQuiz();
      clearProcessingTimeout();
      if (result.success) {
        toast.success(result.message);
        speakAndShow(result.message, result.navigateTo ? () => navigate(result.navigateTo!) : undefined);
      } else {
        speakAndShow(result.message);
      }
      return;
    }

    // ─ summarize / search / general → RAG pipeline
    setSubtitle('Thinking…');
    const controller = new AbortController();
    abortRef.current = controller;
    let fullContent = '';

    const prompt = intent.type === 'summarize'
      ? `Summarize the most recent lesson content in 2-3 sentences: ${query}`
      : `Answer very concisely in 1-2 sentences: ${query}`;

    await streamChatSearch({
      query: prompt,
      messages: [],
      onMeta: () => {},
      onDelta: (delta) => {
        fullContent += delta;
        setSubtitle(fullContent.length > 200 ? fullContent.slice(0, 200) + '…' : fullContent);
      },
      onDone: () => {
        clearProcessingTimeout();
        abortRef.current = null;
        speakAndShow(fullContent || "I couldn't find an answer. Could you rephrase?");
      },
      onError: (err) => {
        clearProcessingTimeout();
        abortRef.current = null;
        speakAndShow(err || 'Something went wrong. Please try again.');
      },
      signal: controller.signal,
    });
  }, [navigate, clearProcessingTimeout, speakAndShow]);

  /* ── speech recognition ── */
  const recognition = useSpeechRecognition({
    onResult: (text) => { setUserText(text); processQuery(text); },
    onError: (msg) => {
      toast.error(msg);
      // Don't break — show error subtitle and let user retry
      setSubtitle(msg);
      setPhase('error');
      setTimeout(() => {
        setPhase('listening');
        setSubtitle('');
        recognitionRef.current.startListening();
      }, 3000);
    },
  });
  recognitionRef.current = recognition;

  /* ── wake word handler ── */
  const handleWake = useCallback(() => {
    if (phase !== 'hidden') return;
    setWakeEnabled(false);
    setUserText('');

    const greetings = ["Hi! How can I help you?", "Hey! What do you need?", "I'm here! What's up?"];
    const greet = greetings[Math.floor(Math.random() * greetings.length)];
    setSubtitle(greet);
    setPhase('speaking');
    afterSpeechRef.current = null;
    if (synthesis.isSupported) {
      synthesis.speak(greet);
    } else {
      setTimeout(() => { setPhase('listening'); setSubtitle(''); recognition.startListening(); }, 1500);
    }
  }, [phase, synthesis, recognition]);

  const wakeWord = useWakeWord({
    onWake: handleWake,
    enabled: wakeEnabled && phase === 'hidden',
  });

  /* ── visibility pause ── */
  useEffect(() => {
    const handler = () => {
      if (document.hidden) setWakeEnabled(false);
      else if (phase === 'hidden') setWakeEnabled(true);
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [phase]);

  /* ── cleanup ── */
  useEffect(() => () => {
    abortRef.current?.abort();
    clearProcessingTimeout();
    synthesis.stop();
    recognition.stopListening();
  }, []);

  /* ── derived state ── */
  const rabbitState: RabbitState =
    phase === 'listening' ? 'listening' :
    phase === 'processing' ? 'processing' :
    phase === 'speaking' || phase === 'greeting' ? 'speaking' :
    'idle';

  if (!wakeWord.isSupported) return null;

  return (
    <>
      {/* Wake-word indicator */}
      <AnimatePresence>
        {phase === 'hidden' && wakeWord.isListening && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur border border-border/50 shadow-lg">
              <motion.div
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[10px] text-muted-foreground">Say "Hey Buddy"</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rabbit assistant overlay */}
      <AnimatePresence>
        {phase !== 'hidden' && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex flex-col items-center pointer-events-none"
            style={{ maxWidth: 320 }}
          >
            {/* Subtitle bubble */}
            <AnimatePresence mode="wait">
              {subtitle && (
                <motion.div
                  key={subtitle.slice(0, 30)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="pointer-events-auto mb-3 px-4 py-2.5 rounded-2xl bg-card/95 backdrop-blur-sm border border-border/60 shadow-xl max-w-[300px]"
                >
                  <p className="text-xs text-foreground leading-relaxed text-center">{subtitle}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* User query */}
            {userText && phase !== 'speaking' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mb-2 px-3 py-1 rounded-xl bg-muted/80 backdrop-blur-sm"
              >
                <p className="text-[10px] text-muted-foreground italic">"{userText}"</p>
              </motion.div>
            )}

            {/* Avatar */}
            <div className="pointer-events-auto cursor-pointer" onClick={dismiss}>
              <RabbitAssistantAvatar state={rabbitState} size={100} />
            </div>

            {/* Listening bars */}
            {phase === 'listening' && (
              <motion.div className="mt-1 flex items-center gap-1"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1 rounded-full bg-primary"
                    animate={{ height: [4, 12, 4] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </motion.div>
            )}

            {/* Error retry hint */}
            {phase === 'error' && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-1 text-[10px] text-destructive">
                Retrying…
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
