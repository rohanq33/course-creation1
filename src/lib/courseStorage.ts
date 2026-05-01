import type { Course, Lesson } from '@/types/database';

const COURSE_STORAGE_KEY = 'ai_course_buddy_courses';
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface StoredLesson {
  id: string;
  title: string;
  content: string | null;
  summary?: string | null;
}

export interface StoredCourse extends Course {
  modules?: Array<{
    title: string;
    lessons: StoredLesson[];
  }>;
  enrollments?: { count: number }[];
  lessons?: { count: number }[];
}

function safeParseJSON(value: string | null): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function createLessonFromText(text: string, index = 1): StoredLesson {
  return {
    id: `local-lesson-${crypto.randomUUID()}`,
    title: `Lesson ${index}`,
    content: text || null,
    summary: null,
  };
}

function createModulesFromText(text: string): StoredCourse['modules'] {
  const snippet = String(text || '').trim();
  if (!snippet) {
    return [
      {
        title: 'Getting Started',
        lessons: [createLessonFromText('This course is ready to begin.')],
      },
    ];
  }

  const lines = snippet
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [
      {
        title: 'Getting Started',
        lessons: [createLessonFromText(snippet)],
      },
    ];
  }

  const moduleTitle = lines[0].length > 0 ? lines[0] : 'Course Overview';
  return [
    {
      title: moduleTitle,
      lessons: [createLessonFromText(snippet, 1)],
    },
  ];
}

export function loadStoredCourses(): StoredCourse[] {
  try {
    const value = window.localStorage.getItem(COURSE_STORAGE_KEY);
    if (!value) return [];

    const courses = safeParseJSON(value);
    if (!Array.isArray(courses)) {
      window.localStorage.removeItem(COURSE_STORAGE_KEY);
      return [];
    }

    return courses;
  } catch (error) {
    console.error('Failed to load stored courses:', error);
    window.localStorage.removeItem(COURSE_STORAGE_KEY);
    return [];
  }
}

export function saveStoredCourses(courses: StoredCourse[]) {
  window.localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(courses));
}

export function addStoredCourse(course: StoredCourse) {
  const existing = loadStoredCourses();
  const next = [course, ...existing.filter((item) => item.id !== course.id)];
  saveStoredCourses(next);
}

export function removeStoredCourse(courseId: string) {
  const next = loadStoredCourses().filter((course) => course.id !== courseId);
  saveStoredCourses(next);
}

export function getStoredCourseById(courseId: string | undefined | null): StoredCourse | null {
  if (!courseId) return null;
  return loadStoredCourses().find((course) => course.id === courseId) || null;
}

export function getStoredCourseLessons(courseId: string | undefined | null): StoredLesson[] | null {
  const course = getStoredCourseById(courseId);
  if (!course || !course.modules) return null;
  return course.modules.flatMap((module) => module.lessons);
}

function normalizeCourseObject(rawCourse: any, topic: string, description: string): StoredCourse {
  const rawModules = rawCourse?.modules || rawCourse?.lessons ? rawCourse.modules || [{ title: 'Course Content', lessons: rawCourse.lessons.map((lesson: any, index: number) => ({
      id: lesson.id || `local-lesson-${crypto.randomUUID()}`,
      title: lesson.title || `Lesson ${index + 1}`,
      content: lesson.content ?? lesson.summary ?? null,
      summary: lesson.summary ?? null,
    })) }] : undefined;

  const modules = Array.isArray(rawModules) && rawModules.length > 0
    ? rawModules.map((module: any) => ({
        title: module.title || 'Module',
        lessons: Array.isArray(module.lessons) && module.lessons.length > 0
          ? module.lessons.map((lesson: any, lessonIndex: number) => ({
              id: lesson.id || `local-lesson-${crypto.randomUUID()}`,
              title: lesson.title || `Lesson ${lessonIndex + 1}`,
              content: lesson.content ?? lesson.summary ?? null,
              summary: lesson.summary ?? null,
            }))
          : [createLessonFromText(module.summary || module.description || module.title || '', 1)],
      }))
    : createModulesFromText(rawCourse?.output || rawCourse?.description || rawCourse?.title || rawCourse?.response || rawCourse?.answer || '');

  return {
    id: rawCourse?.id || `local-${crypto.randomUUID()}`,
    instructor_id: rawCourse?.instructor_id || DEMO_USER_ID,
    title: rawCourse?.title || topic,
    description: rawCourse?.description ?? description ?? null,
    thumbnail_url: rawCourse?.thumbnail_url ?? null,
    status: rawCourse?.status === 'published' ? 'published' : 'draft',
    published: rawCourse?.published === true || rawCourse?.status === 'published',
    created_at: rawCourse?.created_at || new Date().toISOString(),
    updated_at: rawCourse?.updated_at || new Date().toISOString(),
    modules,
    enrollments: rawCourse?.enrollments ?? [{ count: 0 }],
    lessons: rawCourse?.lessons ? [{ count: rawCourse.lessons.length }] : [{ count: modules.flatMap((module) => module.lessons).length }],
  };
}

export function parseCourseResponse(response: any, topic: string, description?: string): StoredCourse {
  if (response?.course && typeof response.course === 'object') {
    return normalizeCourseObject(response.course, topic, description ?? '');
  }

  if (response?.output || response?.answer || response?.response) {
    return normalizeCourseObject({
      title: topic,
      description: description ?? '',
      output: response.output || response.answer || response.response,
    }, topic, description ?? '');
  }

  return normalizeCourseObject({
    title: topic,
    description: description ?? '',
    output: `Generated course for ${topic}.`,
  }, topic, description ?? '');
}

export function createLocalCourse(title: string, description?: string): StoredCourse {
  return normalizeCourseObject({
    title,
    description: description || '',
    output: description || `A new course on ${title}`,
  }, title, description || '');
}
