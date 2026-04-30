import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from '@/contexts/DemoContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AICopilotPanel } from '@/components/copilot/AICopilotPanel';
import { ArrowLeft, CheckCircle, Circle, BookOpen, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import type { Lesson, Progress as ProgressType } from '@/types/database';

export default function CourseLearning() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const userId = DEMO_USER_ID;
  const queryClient = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').eq('id', courseId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: lessons, isLoading: loadingLessons } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !!courseId,
  });

  const { data: progress } = useQuery({
    queryKey: ['progress', courseId, userId],
    queryFn: async () => {
      const lessonIds = lessons?.map((l) => l.id) || [];
      const { data, error } = await supabase.from('progress').select('*').eq('user_id', userId).in('lesson_id', lessonIds);
      if (error) throw error;
      return data as ProgressType[];
    },
    enabled: !!courseId && !!lessons,
  });

  useEffect(() => {
    if (lessons?.length && !selectedLessonId) {
      const incompleteLesson = lessons.find((l) => !progress?.find((p) => p.lesson_id === l.id && p.completed));
      setSelectedLessonId(incompleteLesson?.id || lessons[0].id);
    }
  }, [lessons, progress, selectedLessonId]);

  const markCompleteMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const existingProgress = progress?.find((p) => p.lesson_id === lessonId);
      if (existingProgress) {
        const { error } = await supabase.from('progress').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', existingProgress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('progress').insert({ user_id: userId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', courseId] });
      toast.success('Lesson marked as complete!');
    },
    onError: () => { toast.error('Failed to update progress'); },
  });

  const selectedLesson = lessons?.find((l) => l.id === selectedLessonId);
  const isLessonComplete = progress?.find((p) => p.lesson_id === selectedLessonId && p.completed);
  const completedCount = progress?.filter((p) => p.completed).length || 0;
  const totalLessons = lessons?.length || 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const copilotContext = {
    title: selectedLesson?.title || '',
    content: selectedLesson?.content || '',
    summary: selectedLesson?.summary || '',
    courseTitle: course?.title || '',
    courseDescription: course?.description || '',
  };

  if (loadingCourse || loadingLessons) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-3"><Skeleton className="h-96 w-full" /></div>
            <div className="col-span-9"><Skeleton className="h-96 w-full" /></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Main content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/student-dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{course?.title}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-1 max-w-xs"><Progress value={progressPercent} className="h-2" /></div>
                  <span className="text-sm text-muted-foreground">{completedCount}/{totalLessons} lessons complete</span>
                </div>
              </div>
              <Button variant="outline" onClick={() => setIsCopilotOpen(!isCopilotOpen)} className={isCopilotOpen ? 'bg-accent' : ''}>
                <MessageSquare className="w-4 h-4 mr-2" />AI Copilot
              </Button>
            </div>

            <div className="grid grid-cols-12 gap-6">
              {/* Sidebar */}
              <div className="col-span-12 md:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="w-5 h-5" />Lessons</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[60vh]">
                      <div className="space-y-1 p-4 pt-0">
                        {lessons?.map((lesson, index) => {
                          const isComplete = progress?.find((p) => p.lesson_id === lesson.id && p.completed);
                          const isSelected = selectedLessonId === lesson.id;
                          return (
                            <button key={lesson.id} onClick={() => setSelectedLessonId(lesson.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                              <div className="flex-shrink-0">
                                {isComplete ? <CheckCircle className={`w-5 h-5 ${isSelected ? 'text-primary-foreground' : 'text-success'}`} />
                                  : <Circle className={`w-5 h-5 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{index + 1}. {lesson.title}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content */}
              <div className="col-span-12 md:col-span-9">
                {selectedLesson ? (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{selectedLesson.title}</CardTitle>
                          {selectedLesson.summary && <p className="text-muted-foreground mt-2">{selectedLesson.summary}</p>}
                        </div>
                        {isLessonComplete ? (
                          <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Complete</Badge>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {selectedLesson.content ? <ReactMarkdown>{selectedLesson.content}</ReactMarkdown> : <p className="text-muted-foreground italic">No content available yet.</p>}
                      </div>
                      <div className="mt-8 pt-6 border-t flex justify-between items-center">
                        <Button variant="outline"
                          disabled={lessons?.findIndex((l) => l.id === selectedLessonId) === 0}
                          onClick={() => {
                            const i = lessons?.findIndex((l) => l.id === selectedLessonId) || 0;
                            if (i > 0) setSelectedLessonId(lessons?.[i - 1].id || null);
                          }}>Previous Lesson</Button>
                        {!isLessonComplete && (
                          <Button className="gradient-primary hover:opacity-90" onClick={() => markCompleteMutation.mutate(selectedLessonId!)} disabled={markCompleteMutation.isPending}>
                            <CheckCircle className="w-4 h-4 mr-2" />Mark as Complete
                          </Button>
                        )}
                        <Button
                          disabled={lessons?.findIndex((l) => l.id === selectedLessonId) === (lessons?.length || 0) - 1}
                          onClick={() => {
                            const i = lessons?.findIndex((l) => l.id === selectedLessonId) || 0;
                            if (i < (lessons?.length || 0) - 1) setSelectedLessonId(lessons?.[i + 1].id || null);
                          }}>Next Lesson</Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="text-center py-12">
                    <CardContent><p className="text-muted-foreground">Select a lesson to start learning.</p></CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Copilot Panel */}
        {isCopilotOpen && (
          <div className="w-[400px] flex-shrink-0 h-full">
            <AICopilotPanel
              lessonContext={copilotContext}
              mode="student"
              courseId={courseId}
              onClose={() => setIsCopilotOpen(false)}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
