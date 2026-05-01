import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Sparkles, Loader2, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AICopilotProps {
  lessonContent: string;
  lessonTitle: string;
  onClose: () => void;
}

export function AICopilot({ lessonContent, lessonTitle, onClose }: AICopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `👋 Hi! I'm your AI learning assistant. I'm here to help you understand "${lessonTitle}". You can ask me to:\n\n• Explain concepts in simpler terms\n• Give examples\n• Create a practice quiz\n• Summarize the lesson\n\nWhat would you like help with?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const history = [...messages, userMessage];
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const payload = {
        message: input.trim(),
        conversationHistory: history,
        courseId: null,
      };
      console.log('AICopilot: sending chat payload', payload);

      const response = await fetch(`${API_BASE_URL}/api/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = "Failed to get AI response";
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorData.error || errorMsg;
          console.error("AI chat failed:", errorData);
        } catch (parseErr) {
          console.error("AI chat failed:", response.status, response.statusText);
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log('AICopilot: chat response', data);

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer || data.response || 'Sorry, I could not get an answer.',
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI chat failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { label: 'Explain simply', prompt: 'Can you explain this lesson in simpler terms?' },
    { label: 'Give examples', prompt: 'Can you give me some examples to understand this better?' },
    { label: 'Quiz me', prompt: 'Create a short practice quiz about this lesson.' },
  ];

  return (
    <Card className="h-[70vh] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Copilot
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className={`prose prose-sm max-w-none ${message.role === 'user' ? 'prose-invert' : 'dark:prose-invert'}`}>
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-3">
        {/* Quick Actions */}
        {messages.length <= 2 && (
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  setInput(action.prompt);
                }}
                className="text-xs"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything about this lesson..."
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="gradient-primary hover:opacity-90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
