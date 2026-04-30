-- Create role enum
CREATE TYPE public.app_role AS ENUM ('instructor', 'student', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Create courses table
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create lessons table
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create enrollments table
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (user_id, course_id)
);

-- Create progress table
CREATE TABLE public.progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, lesson_id)
);

-- Create quizzes table
CREATE TABLE public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    correct_answer INTEGER NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Courses policies
CREATE POLICY "Anyone can view published courses"
ON public.courses FOR SELECT
TO authenticated
USING (status = 'published' OR instructor_id = auth.uid());

CREATE POLICY "Instructors can create courses"
ON public.courses FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'instructor') AND instructor_id = auth.uid());

CREATE POLICY "Instructors can update their courses"
ON public.courses FOR UPDATE
TO authenticated
USING (instructor_id = auth.uid());

CREATE POLICY "Instructors can delete their courses"
ON public.courses FOR DELETE
TO authenticated
USING (instructor_id = auth.uid());

-- Lessons policies
CREATE POLICY "Users can view lessons of published courses"
ON public.lessons FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = lessons.course_id
        AND (courses.status = 'published' OR courses.instructor_id = auth.uid())
    )
);

CREATE POLICY "Instructors can create lessons for their courses"
ON public.lessons FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = lessons.course_id
        AND courses.instructor_id = auth.uid()
    )
);

CREATE POLICY "Instructors can update lessons for their courses"
ON public.lessons FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = lessons.course_id
        AND courses.instructor_id = auth.uid()
    )
);

CREATE POLICY "Instructors can delete lessons for their courses"
ON public.lessons FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = lessons.course_id
        AND courses.instructor_id = auth.uid()
    )
);

-- Enrollments policies
CREATE POLICY "Students can view their enrollments"
ON public.enrollments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Instructors can view enrollments for their courses"
ON public.enrollments FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = enrollments.course_id
        AND courses.instructor_id = auth.uid()
    )
);

CREATE POLICY "Students can enroll in courses"
ON public.enrollments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can unenroll"
ON public.enrollments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Progress policies
CREATE POLICY "Students can view their progress"
ON public.progress FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Students can insert their progress"
ON public.progress FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can update their progress"
ON public.progress FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Quizzes policies
CREATE POLICY "Users can view quizzes of accessible lessons"
ON public.quizzes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.lessons
        JOIN public.courses ON courses.id = lessons.course_id
        WHERE lessons.id = quizzes.lesson_id
        AND (courses.status = 'published' OR courses.instructor_id = auth.uid())
    )
);

CREATE POLICY "Instructors can create quizzes for their lessons"
ON public.quizzes FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.lessons
        JOIN public.courses ON courses.id = lessons.course_id
        WHERE lessons.id = quizzes.lesson_id
        AND courses.instructor_id = auth.uid()
    )
);

CREATE POLICY "Instructors can update quizzes for their lessons"
ON public.quizzes FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.lessons
        JOIN public.courses ON courses.id = lessons.course_id
        WHERE lessons.id = quizzes.lesson_id
        AND courses.instructor_id = auth.uid()
    )
);

CREATE POLICY "Instructors can delete quizzes for their lessons"
ON public.quizzes FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.lessons
        JOIN public.courses ON courses.id = lessons.course_id
        WHERE lessons.id = quizzes.lesson_id
        AND courses.instructor_id = auth.uid()
    )
);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON public.lessons
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();