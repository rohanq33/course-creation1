import { useState, useRef, useCallback, useEffect } from 'react';

export type SynthesisStatus = 'idle' | 'speaking';

interface UseSpeechSynthesisOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

interface UseSpeechSynthesisReturn {
  status: SynthesisStatus;
  isSupported: boolean;
  speak: (text: string) => void;
  stop: () => void;
}

export function useSpeechSynthesis({
  lang = 'en-US',
  rate = 1,
  pitch = 1,
  onEnd,
  onError,
}: UseSpeechSynthesisOptions = {}): UseSpeechSynthesisReturn {
  const [status, setStatus] = useState<SynthesisStatus>('idle');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    setStatus('idle');
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) {
        onError?.('Text-to-speech is not supported in this browser.');
        return;
      }

      // Stop any current speech
      window.speechSynthesis.cancel();

      // Strip markdown for cleaner speech
      const clean = text
        .replace(/```[\s\S]*?```/g, ' code block ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[#*_~>\[\]()!|]/g, '')
        .replace(/\n+/g, '. ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!clean) return;

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;

      // Try to pick a natural-sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('natural'),
      ) || voices.find(
        (v) => v.lang.startsWith('en') && !v.localService,
      ) || voices.find(
        (v) => v.lang.startsWith('en'),
      );
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setStatus('speaking');
      utterance.onend = () => {
        setStatus('idle');
        onEnd?.();
      };
      utterance.onerror = (e) => {
        setStatus('idle');
        if (e.error !== 'canceled') {
          onError?.('Text-to-speech playback failed.');
        }
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, lang, rate, pitch, onEnd, onError],
  );

  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  return { status, isSupported, speak, stop };
}
