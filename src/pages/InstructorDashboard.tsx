import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL, backendPost } from '@/lib/api';
import type { StoredCourse } from '@/lib/courseStorage';
import { DEMO_USER_ID } from '@/contexts/DemoContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, BookOpen, Users, Sparkles, Edit, Trash2, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Course } from '@/types/database';

export default function InstructorDashboard() {
  const userId = DEMO_USER_ID;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDescription, setNewCourseDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { data: courses = [], isLoading, error } = useQuery<StoredCourse[]>({
    queryKey: ['instructor-courses', userId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/instructor/courses/${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || data?.message || `${response.status} ${response.statusText}`);
      }

      console.log('Instructor courses:', data);
      return Array.isArray(data) ? data : [];
    },
    onError: (error) => {
      console.error('InstructorDashboard load error:', error);
      setLoadError(error?.message || String(error));
    },
  });

  const courseList = Array.isArray(courses) ? courses : [];

  const addCourseToList = (course: StoredCourse) => {
    queryClient.setQueryData(['instructor-courses', userId], (oldData: any) => {
      const existing = Array.isArray(oldData) ? oldData : [];
      return [course, ...existing.filter((item) => item?.id !== course.id)];
    });
  };

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `${response.status} ${response.statusText}`);
      }
      return courseId;
    },
    onSuccess: (courseId: string) => {
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      toast.success('Course deleted');
    },
    onError: () => {
      toast.error('Failed to delete course');
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ courseId, status }: { courseId: string; status: string }) => {
      const newStatus = status === 'published' ? 'draft' : 'published';
      const updatedCourse = await backendPost(`/api/courses/${courseId}`, {
        published: newStatus === 'published',
      }, 'PATCH');
      return updatedCourse;
    },
    onSuccess: (updatedCourse: any) => {
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      toast.success(updatedCourse.status === 'published' ? 'Course published!' : 'Course unpublished');
    },
    onError: () => {
      toast.error('Failed to update course status');
    },
  });

  const handleCreateCourse = async () => {
    if (!newCourseTitle.trim()) {
      toast.error('Please enter a course title');
      return;
    }

    const payload = {
      title: newCourseTitle.trim(),
      description: newCourseDescription.trim() || null,
      instructor_id: userId,
      generatedWithAI: false,
    };
    console.log('Creating course:', payload);

    try {
      const course = await backendPost('/api/courses', payload, 'POST');
      console.log('Course created:', course);
      addCourseToList(course);
      setIsCreateOpen(false);
      setNewCourseTitle('');
      setNewCourseDescription('');
      toast.success('Course created!');
    } catch (error: any) {
      console.error('Course creation error:', error);
      toast.error(error.message || 'Failed to create course. Please try again.');
    }
  };

  const handleGenerateWithAI = async () => {
    if (!newCourseTitle.trim()) {
      toast.error('Please enter a course topic');
      return;
    }

    const payload = {
      title: newCourseTitle.trim(),
      description: newCourseDescription.trim() || null,
      instructor_id: userId,
      generatedWithAI: true,
    };
    console.log('Creating course:', payload);

    setIsGenerating(true);
    try {
      const course = await backendPost('/api/courses', payload, 'POST');
      console.log('Course created:', course);
      addCourseToList(course);
      setIsCreateOpen(false);
      setNewCourseTitle('');
      setNewCourseDescription('');
      toast.success('Course generated and saved!');
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error(error.message || 'Failed to generate course. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Courses</h1>
            <p className="text-muted-foreground">Create and manage your courses</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
                <DialogDescription>
                  Enter your course topic and let AI generate the content, or create manually.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Course Topic / Title</label>
                  <Input
                    placeholder="e.g., Introduction to Machine Learning"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description (optional)</label>
                  <Textarea
                    placeholder="Describe what students will learn..."
                    value={newCourseDescription}
                    onChange={(e) => setNewCourseDescription(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleGenerateWithAI}
                    disabled={isGenerating}
                    className="flex-1 gradient-primary hover:opacity-90"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate with AI
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCreateCourse}
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    Create Manually
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{courses?.length || 0}</div>
                  <div className="text-muted-foreground text-sm">Total Courses</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {courses?.filter((c) => c.status === 'published').length || 0}
                  </div>
                  <div className="text-muted-foreground text-sm">Published</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {courses?.reduce((acc, c) => acc + (c.enrollments?.[0]?.count || 0), 0) || 0}
                  </div>
                  <div className="text-muted-foreground text-sm">Total Students</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courseList.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first course and let AI help you build amazing content.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Course
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses?.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {course.description || 'No description'}
                      </CardDescription>
                    </div>
                    <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                      {course.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {course.lessons?.[0]?.count || 0} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {course.enrollments?.[0]?.count || 0} students
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link to={`/instructor/course/${course.id}`}>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublishMutation.mutate({ courseId: course.id, status: course.status })}
                    >
                      {course.status === 'published' ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCourseMutation.mutate(course.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
