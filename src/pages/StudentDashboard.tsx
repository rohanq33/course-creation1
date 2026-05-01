import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from '@/contexts/DemoContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BookOpen, GraduationCap, Clock, Play, CheckCircle, Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { Lesson, Progress as ProgressType } from '@/types/database';

export default function StudentDashboard() {
  const userId = DEMO_USER_ID;
  const { data: enrolledCourses, isLoading: loadingEnrolled } = useQuery({
    queryKey: ['enrolled-courses', userId],
    queryFn: async () => {
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select(`*, course:courses(*, lessons(*))`)
        .eq('user_id', userId);
      if (enrollError) throw enrollError;

      const instructorIds = enrollments?.map(e => (e.course as any)?.instructor_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', instructorIds);

      const lessonIds = enrollments?.flatMap(e =>
        (e.course as any)?.lessons?.map((l: Lesson) => l.id) || []
      ) || [];
      const { data: progress } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds);

      return enrollments?.map(e => {
        const course = e.course as any;
        const instructorProfile = profiles?.find(p => p.user_id === course?.instructor_id);
        return {
          ...e,
          course: { ...course, instructor_name: instructorProfile?.full_name || 'Instructor' },
          progress: progress?.filter(p => course?.lessons?.some((l: Lesson) => l.id === p.lesson_id)) || [],
        };
      }) || [];
    },
  });

  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(true);

  useEffect(() => {
    const loadAvailableCourses = async () => {
      setLoadingAvailable(true);

      try {
        const response = await fetch(`${API_BASE_URL}/api/courses`);
        const data = await response.json();
        console.log('Fetched courses:', data);

        if (!response.ok) {
          throw new Error(data?.error || data?.message || `${response.status} ${response.statusText}`);
        }

        const enrolledIds = enrolledCourses?.map((e: any) => e.course_id) || [];
        const filtered = Array.isArray(data)
          ? data.filter((course: any) => !enrolledIds.includes(course.id))
          : [];

        console.log('Student courses:', filtered);
        setAvailableCourses(filtered);
      } catch (error) {
        console.error('Failed to load available courses:', error);
        setAvailableCourses([]);
      } finally {
        setLoadingAvailable(false);
      }
    };

    loadAvailableCourses();
  }, [enrolledCourses]);

  const getProgress = (enrollment: any) => {
    const totalLessons = enrollment.course?.lessons?.length || 0;
    const completedLessons = enrollment.progress?.filter((p: ProgressType) => p.completed).length || 0;
    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">My Learning</h1>
          <p className="text-muted-foreground">Continue learning or explore student tools</p>
        </div>

        {/* Student Tools */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow hover:border-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{enrolledCourses?.length || 0}</div>
                  <div className="text-muted-foreground text-sm">Enrolled Courses</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow hover:border-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {enrolledCourses?.filter((e: any) => e.completed_at).length || 0}
                  </div>
                  <div className="text-muted-foreground text-sm">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Link to="/exam-time">
            <Card className="hover:shadow-lg transition-shadow hover:border-primary/50 cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-lg font-bold">Exam Time</div>
                    <div className="text-muted-foreground text-sm">AI Exam Prep</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/student-time">
            <Card className="hover:shadow-lg transition-shadow hover:border-primary/50 cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-lg font-bold">Student Time</div>
                    <div className="text-muted-foreground text-sm">Topic Resources</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Tabs defaultValue="enrolled" className="w-full">
          <TabsList>
            <TabsTrigger value="enrolled">My Courses</TabsTrigger>
            <TabsTrigger value="browse">Browse Courses</TabsTrigger>
          </TabsList>

          <TabsContent value="enrolled" className="mt-6">
            {loadingEnrolled ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader><CardContent><Skeleton className="h-4 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : enrolledCourses?.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground mb-4">Browse available courses and start learning today!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses?.map((enrollment: any) => {
                  const progress = getProgress(enrollment);
                  return (
                    <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{enrollment.course?.title}</CardTitle>
                            <CardDescription className="line-clamp-2 mt-1">by {enrollment.course?.instructor_name}</CardDescription>
                          </div>
                          {progress === 100 && (
                            <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Complete</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{enrollment.course?.lessons?.length || 0} lessons</span>
                          </div>
                          <Button className="w-full" asChild>
                            <Link to={`/course/${enrollment.course?.id}`}>
                              <Play className="w-4 h-4 mr-2" />{progress > 0 ? 'Continue Learning' : 'Start Learning'}
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="browse" className="mt-6">
            {loadingAvailable ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : availableCourses?.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No courses available</h3>
                  <p className="text-muted-foreground">Check back later for new courses!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCourses?.map((course: any) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg truncate">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2">by {course.instructor_name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm line-clamp-3 mb-4">{course.description || 'No description available'}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{course.lessons?.[0]?.count || 0} lessons</span>
                      </div>
                      <Button className="w-full gradient-primary hover:opacity-90" asChild>
                        <Link to={`/course/${course.id}`}>Open Course</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
