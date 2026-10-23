import { Course, Lesson } from "./types";
import { pythonCourse, coursesCatalog } from "./python";

// Master Course Registry
const coursesMap = new Map<string, Course>();

// Register core languages
coursesMap.set("python", pythonCourse);

/**
 * Register a new course into the learning engine
 */
export function registerCourse(course: Course): void {
  coursesMap.set(course.slug.toLowerCase(), course);
}

/**
 * Retrieve a course by slug (e.g. "python", "typescript", "rust")
 */
export function getCourse(slug: string): Course | undefined {
  return coursesMap.get(slug.toLowerCase());
}

/**
 * Retrieve all registered active & upcoming courses
 */
export function getAllCourses(): Course[] {
  return coursesCatalog;
}

/**
 * Retrieve a specific lesson along with navigation metadata
 */
export function getLessonContext(
  courseSlug: string,
  lessonId: string
):
  | {
      course: Course;
      lesson: Lesson;
      prevLesson: Lesson | null;
      nextLesson: Lesson | null;
      currentIndex: number;
      totalLessons: number;
    }
  | undefined {
  const course = getCourse(courseSlug);
  if (!course) return undefined;

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  if (currentIndex === -1) return undefined;

  const lesson = allLessons[currentIndex];
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return {
    course,
    lesson,
    prevLesson,
    nextLesson,
    currentIndex,
    totalLessons: allLessons.length,
  };
}

/**
 * Generate all static lesson parameters for prerendering
 */
export function getAllStaticLessonParams(): {
  courseSlug: string;
  lessonId: string;
}[] {
  const params: { courseSlug: string; lessonId: string }[] = [];

  for (const [slug, course] of coursesMap.entries()) {
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        params.push({
          courseSlug: slug,
          lessonId: lesson.id,
        });
      }
    }
  }

  return params;
}
