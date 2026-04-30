import { useState, useRef, useCallback, useEffect } from 'react';

interface UseWakeWordOptions {
  wakePhrase?: string;
  onWake: () => void;
  enabled?: boolean;
  cooldownMs?: number;
  lang?: string;
}

export function useWakeWord({
  wakePhrase = 'hey buddy',
  onWake,
  enabled = true,
  cooldownMs = 3000,
  lang = 'en-US',
}: UseWakeWordOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const cooldownRef = useRef(false);
  const enabledRef = useRef(enabled);
  const onWakeRef = useRef(onWake);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  enabledRef.current = enabled;
  onWakeRef.current = onWake;

  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognitionAPI;

  const stopListening = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI || !enabledRef.current) return;

    // Clean up any existing instance
    recognitionRef.current?.abort();

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (cooldownRef.current) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        if (transcript.includes(wakePhrase)) {
          cooldownRef.current = true;
          // Stop background listening, trigger wake callback
          recognition.abort();
          recognitionRef.current = null;
          setIsListening(false);
          onWakeRef.current();
          setTimeout(() => {
            cooldownRef.current = false;
          }, cooldownMs);
          return;
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' and 'aborted' are normal for background listening
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.warn('[WakeWord] error:', event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if still enabled and not in cooldown
      if (enabledRef.current && !cooldownRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current) startListening();
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // Already started
    }
  }, [SpeechRecognitionAPI, lang, wakePhrase, cooldownMs]);

  useEffect(() => {
    if (enabled && isSupported) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [enabled, isSupported]);

  return { isListening, isSupported, stopListening, startListening };
}
