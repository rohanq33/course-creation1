export type AppRole = 'instructor' | 'student' | 'admin';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Course {
  id: string;
  instructor_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  status: 'draft' | 'published' | 'archived';
  published?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  summary: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
}

export interface Progress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string | null;
  created_at: string;
}

export interface CourseWithInstructor extends Course {
  profiles?: Profile;
  lessons?: Lesson[];
  enrollments?: { count: number }[];
}

export interface LessonWithProgress extends Lesson {
  progress?: Progress[];
  quizzes?: Quiz[];
}
