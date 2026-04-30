-- Add RLS policies to allow public access for demo mode
-- Allow anyone to view all courses (for demo)
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
CREATE POLICY "Anyone can view all courses for demo"
ON public.courses
FOR SELECT
USING (true);

-- Allow anyone to insert courses (for demo)
DROP POLICY IF EXISTS "Instructors can create courses" ON public.courses;
CREATE POLICY "Anyone can create courses for demo"
ON public.courses
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update courses (for demo)
DROP POLICY IF EXISTS "Instructors can update their courses" ON public.courses;
CREATE POLICY "Anyone can update courses for demo"
ON public.courses
FOR UPDATE
USING (true);

-- Allow anyone to delete courses (for demo)
DROP POLICY IF EXISTS "Instructors can delete their courses" ON public.courses;
CREATE POLICY "Anyone can delete courses for demo"
ON public.courses
FOR DELETE
USING (true);

-- Allow anyone to view all lessons
DROP POLICY IF EXISTS "Users can view lessons of published courses" ON public.lessons;
CREATE POLICY "Anyone can view lessons for demo"
ON public.lessons
FOR SELECT
USING (true);

-- Allow anyone to create lessons
DROP POLICY IF EXISTS "Instructors can create lessons for their courses" ON public.lessons;
CREATE POLICY "Anyone can create lessons for demo"
ON public.lessons
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update lessons
DROP POLICY IF EXISTS "Instructors can update lessons for their courses" ON public.lessons;
CREATE POLICY "Anyone can update lessons for demo"
ON public.lessons
FOR UPDATE
USING (true);

-- Allow anyone to delete lessons
DROP POLICY IF EXISTS "Instructors can delete lessons for their courses" ON public.lessons;
CREATE POLICY "Anyone can delete lessons for demo"
ON public.lessons
FOR DELETE
USING (true);

-- Allow anyone to view enrollments
DROP POLICY IF EXISTS "Students can view their enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Instructors can view enrollments for their courses" ON public.enrollments;
CREATE POLICY "Anyone can view enrollments for demo"
ON public.enrollments
FOR SELECT
USING (true);

-- Allow anyone to create enrollments
DROP POLICY IF EXISTS "Students can enroll in courses" ON public.enrollments;
CREATE POLICY "Anyone can enroll for demo"
ON public.enrollments
FOR INSERT
WITH CHECK (true);

-- Allow anyone to delete enrollments
DROP POLICY IF EXISTS "Students can unenroll" ON public.enrollments;
CREATE POLICY "Anyone can unenroll for demo"
ON public.enrollments
FOR DELETE
USING (true);

-- Allow anyone to view progress
DROP POLICY IF EXISTS "Students can view their progress" ON public.progress;
CREATE POLICY "Anyone can view progress for demo"
ON public.progress
FOR SELECT
USING (true);

-- Allow anyone to insert progress
DROP POLICY IF EXISTS "Students can insert their progress" ON public.progress;
CREATE POLICY "Anyone can insert progress for demo"
ON public.progress
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update progress
DROP POLICY IF EXISTS "Students can update their progress" ON public.progress;
CREATE POLICY "Anyone can update progress for demo"
ON public.progress
FOR UPDATE
USING (true);

-- Allow anyone to view quizzes
DROP POLICY IF EXISTS "Users can view quizzes of accessible lessons" ON public.quizzes;
CREATE POLICY "Anyone can view quizzes for demo"
ON public.quizzes
FOR SELECT
USING (true);

-- Allow anyone to create quizzes
DROP POLICY IF EXISTS "Instructors can create quizzes for their lessons" ON public.quizzes;
CREATE POLICY "Anyone can create quizzes for demo"
ON public.quizzes
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update quizzes
DROP POLICY IF EXISTS "Instructors can update quizzes for their lessons" ON public.quizzes;
CREATE POLICY "Anyone can update quizzes for demo"
ON public.quizzes
FOR UPDATE
USING (true);

-- Allow anyone to delete quizzes
DROP POLICY IF EXISTS "Instructors can delete quizzes for their lessons" ON public.quizzes;
CREATE POLICY "Anyone can delete quizzes for demo"
ON public.quizzes
FOR DELETE
USING (true);

-- Allow anyone to view profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles for demo"
ON public.profiles
FOR SELECT
USING (true);

-- Allow anyone to insert profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Anyone can insert profiles for demo"
ON public.profiles
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Anyone can update profiles for demo"
ON public.profiles
FOR UPDATE
USING (true);