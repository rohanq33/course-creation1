import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from '@/contexts/DemoContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AICopilotPanel } from '@/components/copilot/AICopilotPanel';
import { ArrowLeft, Plus, GripVertical, Trash2, Edit, Save, Sparkles, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { Course, Lesson } from '@/types/database';

export default function CourseEditor() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const userId = DEMO_USER_ID;
  const queryClient = useQueryClient();

  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [isGeneratingLessons, setIsGeneratingLessons] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      if (error) throw error;
      return data as Course;
    },
    enabled: !!courseId,
  });

  const { data: lessons, isLoading: loadingLessons } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !!courseId,
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      const { error } = await supabase
        .from('courses')
        .update({ title, description })
        .eq('id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      toast.success('Course updated');
    },
    onError: () => {
      toast.error('Failed to update course');
    },
  });

  const addLessonMutation = useMutation({
    mutationFn: async (title: string) => {
      const orderIndex = (lessons?.length || 0);
      const { error } = await supabase
        .from('lessons')
        .insert({
          course_id: courseId,
          title,
          order_index: orderIndex,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      setIsAddingLesson(false);
      setNewLessonTitle('');
      toast.success('Lesson added');
    },
    onError: () => {
      toast.error('Failed to add lesson');
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ lessonId, title, content, summary }: { lessonId: string; title: string; content: string; summary: string }) => {
      const { error } = await supabase
        .from('lessons')
        .update({ title, content, summary })
        .eq('id', lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      setEditingLesson(null);
      toast.success('Lesson updated');
    },
    onError: () => {
      toast.error('Failed to update lesson');
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      toast.success('Lesson deleted');
    },
    onError: () => {
      toast.error('Failed to delete lesson');
    },
  });

  const handleGenerateLessons = async () => {
    if (!course?.title) return;
    setIsGeneratingLessons(true);
    try {
      const response = await supabase.functions.invoke('generate-lessons', {
        body: { courseId: course.id, topic: course.title, description: course.description },
      });
      if (response.error) throw response.error;
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      toast.success('Lessons generated with AI!');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate lessons. Please try again.');
    } finally {
      setIsGeneratingLessons(false);
    }
  };

  const startEditingLesson = (lesson: Lesson) => {
    setEditingLesson(lesson.id);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content || '');
    setLessonSummary(lesson.summary || '');
  };

  const saveLesson = () => {
    if (!editingLesson) return;
    updateLessonMutation.mutate({
      lessonId: editingLesson,
      title: lessonTitle,
      content: lessonContent,
      summary: lessonSummary,
    }, {
      onSuccess: () => {
        // Trigger embedding generation for updated lesson
        supabase.functions.invoke('generate-embeddings', {
          body: {
            courseId,
            lessonId: editingLesson,
            lessonTitle,
            lessonContent,
            lessonSummary,
            courseTitle: course?.title,
            courseDescription: course?.description,
          },
        }).catch(err => console.warn('Embedding generation failed:', err));
      },
    });
  };

  const editingLessonData = lessons?.find(l => l.id === editingLesson);

  const copilotContext = {
    title: editingLessonData?.title || '',
    content: editingLessonData?.content || lessonContent,
    summary: editingLessonData?.summary || lessonSummary,
    courseTitle: course?.title || '',
    courseDescription: course?.description || '',
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Main Editor Area */}
        <div className={`flex-1 overflow-y-auto p-6 ${isCopilotOpen ? '' : ''}`}>
          <div className="space-y-8 max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/instructor')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{course?.title}</h1>
                <p className="text-muted-foreground">{course?.description || 'No description'}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsCopilotOpen(!isCopilotOpen)}
                className={isCopilotOpen ? 'bg-accent' : ''}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                AI Copilot
              </Button>
              <Badge variant={course?.status === 'published' ? 'default' : 'secondary'}>
                {course?.status}
              </Badge>
            </div>

            {/* Lessons Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Lessons</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleGenerateLessons} disabled={isGeneratingLessons}>
                    {isGeneratingLessons ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Generate with AI
                  </Button>
                  <Dialog open={isAddingLesson} onOpenChange={setIsAddingLesson}>
                    <DialogTrigger asChild>
                      <Button><Plus className="w-4 h-4 mr-2" />Add Lesson</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add New Lesson</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Input placeholder="Lesson title" value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} />
                        <Button onClick={() => addLessonMutation.mutate(newLessonTitle)} disabled={!newLessonTitle.trim() || addLessonMutation.isPending} className="w-full">
                          Add Lesson
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {loadingLessons ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : lessons?.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <p className="text-muted-foreground mb-4">No lessons yet. Add your first lesson or generate with AI.</p>
                    <Button onClick={handleGenerateLessons} disabled={isGeneratingLessons}>
                      {isGeneratingLessons ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      Generate Lessons with AI
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {lessons?.map((lesson, index) => (
                    <Card key={lesson.id}>
                      {editingLesson === lesson.id ? (
                        <CardContent className="pt-6 space-y-4">
                          <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="Lesson title" />
                          <Textarea value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} placeholder="Lesson content (supports markdown)" rows={12} />
                          <Textarea value={lessonSummary} onChange={(e) => setLessonSummary(e.target.value)} placeholder="Lesson summary" rows={3} />
                          <div className="flex gap-2">
                            <Button onClick={saveLesson} disabled={updateLessonMutation.isPending}>
                              <Save className="w-4 h-4 mr-2" />Save
                            </Button>
                            <Button variant="outline" onClick={() => setEditingLesson(null)}>Cancel</Button>
                            {!isCopilotOpen && (
                              <Button variant="outline" onClick={() => setIsCopilotOpen(true)}>
                                <Sparkles className="w-4 h-4 mr-2" />AI Assist
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      ) : (
                        <CardHeader className="flex flex-row items-center gap-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GripVertical className="w-5 h-5" />
                            <span className="font-mono text-sm">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg">{lesson.title}</CardTitle>
                            {lesson.summary && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{lesson.summary}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => startEditingLesson(lesson)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteLessonMutation.mutate(lesson.id)} className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Copilot Panel */}
        {isCopilotOpen && (
          <div className="w-[400px] flex-shrink-0 border-l h-full">
            <AICopilotPanel
              lessonContext={copilotContext}
              mode="instructor"
              courseId={courseId}
              onClose={() => setIsCopilotOpen(false)}
              onInsertContent={(content) => {
                if (editingLesson) {
                  setLessonContent(prev => prev + '\n\n' + content);
                  toast.success('Content inserted into lesson');
                } else {
                  toast.info('Start editing a lesson first to insert content');
                }
              }}
              onReplaceContent={(content) => {
                if (editingLesson) {
                  setLessonContent(content);
                  toast.success('Lesson content replaced');
                } else {
                  toast.info('Start editing a lesson first to replace content');
                }
              }}
              onAppendContent={(content) => {
                if (editingLesson) {
                  setLessonContent(prev => prev + '\n\n' + content);
                  toast.success('Content appended to lesson');
                } else {
                  toast.info('Start editing a lesson first to append content');
                }
              }}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
