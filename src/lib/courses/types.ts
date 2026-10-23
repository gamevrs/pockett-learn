export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Pro";

export interface TestCase {
  id: string;
  description: string;
  hidden?: boolean;
  assertionCode: string; // Python code to evaluate, e.g. "assert add(2, 3) == 5"
  expectedOutput?: string;
}

export interface Hint {
  id: string;
  title: string;
  content: string;
}

export interface TaskItem {
  id: string;
  description: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  order: number;
  title: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  xpReward: number;
  concept: string; // Conceptual breakdown with code examples
  story: string; // The mission / real-world context
  tasks: TaskItem[];
  starterCode: string;
  solutionCode: string;
  solutionExplanation: string;
  hints: Hint[];
  testCases: TestCase[];
  tags: string[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  iconName: string;
  badge: string;
  level: string;
  estimatedHours: number;
  totalXp: number;
  colorAccent: string; // e.g. "emerald", "cyan", "violet"
  modules: Module[];
}

export interface TestResult {
  testId: string;
  description: string;
  passed: boolean;
  error?: string;
  receivedOutput?: string;
}

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  testResults: TestResult[];
  allPassed: boolean;
}

export interface UserStats {
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  completedLessons: string[]; // lesson ids
  savedCode: Record<string, string>; // lessonId -> code
  soundEnabled: boolean;
}
