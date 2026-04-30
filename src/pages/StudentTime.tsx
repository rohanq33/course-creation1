import { useState, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, Send, Loader2, ListChecks, FileText, Mic, Video,
  BookOpen, HelpCircle, GraduationCap, ArrowLeft,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

type ResourceType = 'quiz' | 'homework' | 'speech' | 'videos' | 'research' | 'qa';

interface ResourceOption {
  key: ResourceType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const RESOURCE_OPTIONS: ResourceOption[] = [
  { key: 'quiz', label: 'Quiz', icon: <ListChecks className="w-5 h-5" />, color: 'bg-primary/10 text-primary' },
  { key: 'homework', label: 'Homework', icon: <FileText className="w-5 h-5" />, color: 'bg-accent text-accent-foreground' },
  { key: 'speech', label: 'Speech', icon: <Mic className="w-5 h-5" />, color: 'bg-primary/10 text-primary' },
  { key: 'videos', label: 'Videos', icon: <Video className="w-5 h-5" />, color: 'bg-accent text-accent-foreground' },
  { key: 'research', label: 'Research Papers', icon: <BookOpen className="w-5 h-5" />, color: 'bg-primary/10 text-primary' },
  { key: 'qa', label: 'Q&A', icon: <HelpCircle className="w-5 h-5" />, color: 'bg-accent text-accent-foreground' },
];

export default function StudentTime() {
  const [topic, setTopic] = useState('');
  const [submittedTopic, setSubmittedTopic] = useState('');
  const [selectedResource, setSelectedResource] = useState<ResourceType | null>(null);
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmitTopic = useCallback(() => {
    if (!topic.trim()) return;
    setSubmittedTopic(topic.trim());
    setSelectedResource(null);
    setGeneratedContent({});
  }, [topic]);

  const handleSelectResource = useCallback(async (resourceType: ResourceType) => {
    setSelectedResource(resourceType);

    const cacheKey = `${submittedTopic}__${resourceType}`;
    if (generatedContent[cacheKey]) return;

    setIsLoading(true);
    const payload = { topic: submittedTopic, resourceType };

    try {
      console.log('Student Time: selected resourceType', resourceType);
      console.log('Student Time: topic length', submittedTopic.length);
      console.log('Student Time: request payload', payload);

      const response = await fetch(`${API_BASE_URL}/api/student-time-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Student Time: backend response status', response.status);
      const data = await response.json();
      console.log('Student Time: backend response data', data);

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to generate content');
      }

      if (!data?.result) {
        throw new Error('No content received from AI service');
      }

      setGeneratedContent(prev => ({ ...prev, [cacheKey]: data.result }));
    } catch (err: any) {
      console.error('Student Time generation failed:', err);
      toast.error(`Failed to generate: ${err?.message || 'Unknown error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  }, [submittedTopic, generatedContent]);

  const currentContent = selectedResource ? generatedContent[`${submittedTopic}__${selectedResource}`] : null;

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] -my-4">
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Student Time</h2>
              <p className="text-xs text-muted-foreground">Search any topic and get study resources</p>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="max-w-3xl mx-auto px-6 py-8">
              {!submittedTopic ? (
                /* Initial state - topic input */
                <div className="flex flex-col items-center justify-center py-20 gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-10 h-10 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-xl mb-2">What do you want to study?</h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                      Enter any topic and get quizzes, homework, explanations, videos, research papers, and Q&A.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Machine Learning', 'Python Loops', 'Neural Networks', 'Edge Computing'].map(t => (
                      <Button key={t} variant="outline" size="sm" onClick={() => { setTopic(t); setSubmittedTopic(t); }}>
                        <Sparkles className="w-3 h-3 mr-1" />{t}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : !selectedResource ? (
                /* Resource type selection */
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => { setSubmittedTopic(''); setTopic(''); }}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                      <h3 className="font-semibold text-lg">Topic: <span className="gradient-text">{submittedTopic}</span></h3>
                      <p className="text-sm text-muted-foreground">Choose what you'd like to generate</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {RESOURCE_OPTIONS.map(opt => (
                      <Card
                        key={opt.key}
                        className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group"
                        onClick={() => handleSelectResource(opt.key)}
                      >
                        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
                          <div className={`w-12 h-12 rounded-xl ${opt.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            {opt.icon}
                          </div>
                          <span className="font-medium text-sm">{opt.label}</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                /* Generated content */
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedResource(null)}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Badge className="gradient-primary text-primary-foreground">
                        {RESOURCE_OPTIONS.find(o => o.key === selectedResource)?.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">for "{submittedTopic}"</span>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      <p className="text-muted-foreground text-sm">
                        Generating {RESOURCE_OPTIONS.find(o => o.key === selectedResource)?.label}...
                      </p>
                    </div>
                  ) : currentContent ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert break-words">
                      <ReactMarkdown
                        components={{
                          a: ({ node, ...props }) => (
                            <a {...props} target="_blank" rel="noreferrer" className="text-primary underline" />
                          ),
                        }}
                      >
                        {currentContent}
                      </ReactMarkdown>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-4 bg-card">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Enter a topic to study... e.g. Machine Learning"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitTopic()}
                className="h-12 text-sm"
              />
              <Button onClick={handleSubmitTopic} disabled={!topic.trim()} className="h-12 px-5 gradient-primary hover:opacity-90">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
