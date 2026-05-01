import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Plus, BookOpen, ArrowRight } from 'lucide-react';
import { loadStoredCourses, StoredCourse } from '@/lib/courseStorage';

const Courses = () => {
  const [courses, setCourses] = useState<StoredCourse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setCourses(loadStoredCourses());
    } catch (error) {
      console.error('Courses page load error:', error);
      setLoadError(error?.message || String(error));
      setCourses([]);
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Courses</h1>
            <p className="text-muted-foreground">Your generated and saved course outlines are listed here.</p>
          </div>
          <Button asChild size="sm">
            <Link to="/instructor">
              <Plus className="w-4 h-4 mr-2" /> Manage Courses
            </Link>
          </Button>
        </div>
        {loadError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            <strong>Error loading saved courses:</strong> {loadError}
          </div>
        ) : null}

        {courses.length === 0 ? (
          <Card className="border-dashed border border-border py-16">
            <CardContent className="text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-primary" />
              <CardTitle>No courses yet</CardTitle>
              <CardDescription>Generate your first course from the AI assistant or instructor dashboard.</CardDescription>
              <div className="mt-6">
                <Button asChild>
                  <Link to="/instructor">Create a Course</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg truncate">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{course.description || 'No description available.'}</CardDescription>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs uppercase text-muted-foreground">{course.status}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {course.modules?.length || 0} modules · {course.modules?.flatMap((mod) => mod.lessons).length || 0} lessons
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Link to={`/instructor/course/${course.id}`} className="text-sm font-medium text-primary hover:underline">
                      Open course
                    </Link>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Courses;
