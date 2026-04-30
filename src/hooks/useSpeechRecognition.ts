import { useState, useRef, useCallback, useEffect } from 'react';

export type RecognitionStatus = 'idle' | 'listening' | 'error';

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (message: string) => void;
  lang?: string;
}

interface UseSpeechRecognitionReturn {
  status: RecognitionStatus;
  transcript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
}

export function useSpeechRecognition({
  onResult,
  onError,
  lang = 'en-US',
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [status, setStatus] = useState<RecognitionStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognitionAPI;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus('idle');
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      onError?.('Speech recognition is not supported in this browser.');
      setStatus('error');
      return;
    }

    // Stop any existing session
    recognitionRef.current?.stop();

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setStatus('listening');

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      const current = final || interim;
      setTranscript(current);
      if (final) {
        onResult?.(final.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setStatus('error');
      const messages: Record<string, string> = {
        'not-allowed': 'Microphone access denied. Please allow microphone permissions.',
        'no-speech': 'No speech detected. Please try again.',
        'audio-capture': 'No microphone found. Please connect a microphone.',
        'network': 'Network error during speech recognition.',
      };
      onError?.(messages[event.error] || `Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      setStatus('idle');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setTranscript('');

    try {
      recognition.start();
    } catch {
      onError?.('Failed to start speech recognition.');
      setStatus('error');
    }
  }, [SpeechRecognitionAPI, lang, onResult, onError]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return { status, transcript, isSupported, startListening, stopListening };
}
