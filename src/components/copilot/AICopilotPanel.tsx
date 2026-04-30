import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  X, Send, Bot, User, Loader2,
  FileText, Expand, Lightbulb, ListChecks, BookOpen,
  ClipboardCopy, Replace, Plus, RotateCcw,
  GraduationCap, PenTool
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { streamChat, type ChatMessage, type LessonContext } from '@/lib/streamChat';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLogo } from '@/components/brand/AppLogo';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

export type CopilotMode = 'instructor' | 'student';

interface SmartAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const instructorActions: SmartAction[] = [
  { id: 'generate-lesson', label: 'Generate Lesson', icon: <FileText className="w-3.5 h-3.5" />, description: 'Full lesson content' },
  { id: 'expand-content', label: 'Expand', icon: <Expand className="w-3.5 h-3.5" />, description: 'Add more detail' },
  { id: 'simplify', label: 'Simplify', icon: <Lightbulb className="w-3.5 h-3.5" />, description: 'Simpler language' },
  { id: 'add-examples', label: 'Examples', icon: <ListChecks className="w-3.5 h-3.5" />, description: 'Real-world examples' },
  { id: 'step-by-step', label: 'Step-by-Step', icon: <BookOpen className="w-3.5 h-3.5" />, description: 'Step-by-step guide' },
  { id: 'generate-quiz', label: 'Quiz', icon: <GraduationCap className="w-3.5 h-3.5" />, description: 'MCQ quiz' },
  { id: 'summarize', label: 'Summarize', icon: <ClipboardCopy className="w-3.5 h-3.5" />, description: 'Key points' },
  { id: 'convert-notes', label: 'Notes', icon: <PenTool className="w-3.5 h-3.5" />, description: 'Study notes format' },
];

const studentActions: SmartAction[] = [
  { id: 'explain-beginner', label: 'Explain Simply', icon: <Lightbulb className="w-3.5 h-3.5" />, description: 'Beginner-friendly' },
  { id: 'add-examples', label: 'Examples', icon: <ListChecks className="w-3.5 h-3.5" />, description: 'Real-world examples' },
  { id: 'generate-quiz', label: 'Quiz Me', icon: <GraduationCap className="w-3.5 h-3.5" />, description: 'Practice quiz' },
  { id: 'summarize', label: 'Summarize', icon: <ClipboardCopy className="w-3.5 h-3.5" />, description: 'Quick summary' },
  { id: 'step-by-step', label: 'Step-by-Step', icon: <BookOpen className="w-3.5 h-3.5" />, description: 'Break it down' },
];

interface AICopilotPanelProps {
  lessonContext: LessonContext;
  mode: CopilotMode;
  courseId?: string;
  onClose: () => void;
  onInsertContent?: (content: string) => void;
  onReplaceContent?: (content: string) => void;
  onAppendContent?: (content: string) => void;
}

export function AICopilotPanel({
  lessonContext,
  mode,
  courseId,
  onClose,
  onInsertContent,
  onReplaceContent,
  onAppendContent,
}: AICopilotPanelProps) {
  const welcomeMsg = mode === 'instructor'
    ? `Hey there! ✨ I'm your AI Course Developer assistant. I can help you create lesson content, generate quizzes, expand topics, and more.\n\nUse the quick actions below or ask me anything!`
    : `Hey! ✨ I'm your AI Course Developer assistant for "${lessonContext.title || 'this lesson'}". Ask me anything!\n\n• Explain concepts simply\n• Give examples\n• Quiz you\n• Summarize the lesson`;

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: welcomeMsg },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastAssistantContent, setLastAssistantContent] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'speaking' | 'error'>('idle');
  const pendingVoiceRef = useRef(false);

  const actions = mode === 'instructor' ? instructorActions : studentActions;

  const synthesis = useSpeechSynthesis({
    onEnd: () => setVoiceState('idle'),
    onError: (msg) => { toast.error(msg); setVoiceState('idle'); },
  });

  const recognition = useSpeechRecognition({
    onResult: (transcript) => {
      setInput(transcript);
      pendingVoiceRef.current = true;
    },
    onError: (msg) => { toast.error(msg); setVoiceState('idle'); },
  });

  // Auto-send when voice transcript arrives
  useEffect(() => {
    if (pendingVoiceRef.current && input.trim() && !isStreaming) {
      pendingVoiceRef.current = false;
      setVoiceState('processing');
      // Trigger send on next tick so input state is settled
      const timer = setTimeout(() => {
        const userMsg: ChatMessage = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        handleStreamWithVoice(newMessages);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [input]);

  const handleStreamWithVoice = useCallback(async (chatMessages: ChatMessage[]) => {
    if (isStreaming) return;
    setIsStreaming(true);
    setLastAssistantContent('');
    const controller = new AbortController();
    abortRef.current = controller;
    let accumulated = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    await streamChat({
      messages: chatMessages,
      lessonContext,
      mode,
      courseId,
      signal: controller.signal,
      onDelta: (text) => {
        accumulated += text;
        setLastAssistantContent(accumulated);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: accumulated };
          return updated;
        });
      },
      onDone: () => {
        setIsStreaming(false);
        abortRef.current = null;
        // Speak the result if this was a voice request
        if (accumulated && synthesis.isSupported) {
          setVoiceState('speaking');
          synthesis.speak(accumulated);
        } else {
          setVoiceState('idle');
        }
      },
      onError: (error) => {
        setIsStreaming(false);
        abortRef.current = null;
        setVoiceState('idle');
        toast.error(error);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `⚠️ ${error}` };
          return updated;
        });
      },
    });
  }, [isStreaming, lessonContext, mode, courseId, synthesis]);

  const handleMicClick = useCallback(() => {
    if (voiceState === 'listening') {
      recognition.stopListening();
      setVoiceState('idle');
    } else {
      synthesis.stop();
      setVoiceState('idle');
      recognition.startListening();
      setVoiceState('listening');
    }
  }, [voiceState, recognition, synthesis]);

  const handleStopSpeaking = useCallback(() => {
    synthesis.stop();
    setVoiceState('idle');
  }, [synthesis]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleStream = useCallback(async (chatMessages: ChatMessage[], action?: string) => {
    if (isStreaming) return;
    setIsStreaming(true);
    setLastAssistantContent('');
    const controller = new AbortController();
    abortRef.current = controller;
    let accumulated = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    await streamChat({
      messages: chatMessages,
      lessonContext,
      mode,
      action,
      courseId,
      signal: controller.signal,
      onDelta: (text) => {
        accumulated += text;
        setLastAssistantContent(accumulated);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: accumulated };
          return updated;
        });
      },
      onDone: () => { setIsStreaming(false); abortRef.current = null; },
      onError: (error) => {
        setIsStreaming(false);
        abortRef.current = null;
        toast.error(error);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `⚠️ ${error}` };
          return updated;
        });
      },
    });
  }, [isStreaming, lessonContext, mode, courseId]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    await handleStream(newMessages);
  }, [input, isStreaming, messages, handleStream]);

  const handleAction = useCallback(async (actionId: string) => {
    if (isStreaming) return;
    const actionLabel = actions.find(a => a.id === actionId)?.label || actionId;
    const userMsg: ChatMessage = { role: 'user', content: `[Action: ${actionLabel}]` };
    setMessages(prev => [...prev, userMsg]);
    await handleStream([userMsg], actionId);
  }, [isStreaming, actions, handleStream]);

  const handleStop = () => { abortRef.current?.abort(); setIsStreaming(false); };
  const handleClearChat = () => { setMessages([{ role: 'assistant', content: welcomeMsg }]); setLastAssistantContent(''); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const showInlineActions = mode === 'instructor' && lastAssistantContent && !isStreaming;

  return (
    <Card className="h-full flex flex-col border-l rounded-none bg-card/95 backdrop-blur-md">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b space-y-0">
        <div className="flex items-center gap-2">
          <AppLogo size="sm" showText={false} />
          <CardTitle className="text-base">AI Assistant</CardTitle>
          <Badge variant="outline" className="text-xs capitalize">{mode}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClearChat} title="Clear chat">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Smart Actions */}
      <div className="px-3 py-2 border-b bg-muted/30">
        <div className="flex flex-wrap gap-1.5">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 px-2 rounded-lg hover:shadow-[0_0_10px_hsl(var(--primary)/0.2)] transition-all"
              onClick={() => handleAction(action.id)}
              disabled={isStreaming}
              title={action.description}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 mt-0.5">
                    <AppLogo size="sm" showText={false} />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'gradient-primary text-primary-foreground shadow-md'
                    : 'glass'
                }`}>
                  {msg.content ? (
                    <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'dark:prose-invert'}`}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {showInlineActions && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-1.5 pl-9"
            >
              {onInsertContent && (
                <Button variant="outline" size="sm" className="h-6 text-xs gap-1 rounded-lg" onClick={() => onInsertContent(lastAssistantContent)}>
                  <ClipboardCopy className="w-3 h-3" /> Insert
                </Button>
              )}
              {onReplaceContent && (
                <Button variant="outline" size="sm" className="h-6 text-xs gap-1 rounded-lg" onClick={() => onReplaceContent(lastAssistantContent)}>
                  <Replace className="w-3 h-3" /> Replace
                </Button>
              )}
              {onAppendContent && (
                <Button variant="outline" size="sm" className="h-6 text-xs gap-1 rounded-lg" onClick={() => onAppendContent(lastAssistantContent)}>
                  <Plus className="w-3 h-3" /> Append
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-card/80 backdrop-blur-sm">
        {voiceState === 'listening' && (
          <div className="text-xs text-primary mb-1.5 flex items-center gap-1.5 px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {recognition.transcript || 'Listening...'}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'instructor' ? 'Ask AI Buddy to create content...' : 'Ask your Buddy about this lesson...'}
            disabled={isStreaming || voiceState === 'listening'}
            className="text-sm rounded-xl bg-background/60 focus:bg-background transition-colors"
          />
          {isStreaming ? (
            <Button size="icon" variant="destructive" onClick={handleStop} className="flex-shrink-0 rounded-xl">
              <X className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="icon" onClick={sendMessage} disabled={!input.trim()} className="gradient-primary hover:opacity-90 flex-shrink-0 rounded-xl hover:shadow-[0_0_15px_hsl(var(--primary)/0.4)] transition-all">
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
