import type { LanguageId } from "@/engine/types";

/** How each language prints, so the empty Console tells the learner what to write. */
const PRINT: Record<LanguageId, string> = {
  python: "print()",
  javascript: "console.log()",
  csharp: "Console.WriteLine()",
  cpp: "std::cout",
  go: "fmt.Println()",
  rust: "println!()",
  sql: "SELECT",
};

/** The Turbo Garage scene (Python and JavaScript versions) is the only one that shows the printed lines on a car dashboard. */
const DASHBOARD_SCENES = new Set(["garage"]);

/**
 * Text for the Console tab when there is nothing to show: before the first run, and after a run that
 * produced no output. It names the language's own way of printing and only mentions a dashboard for
 * the project that has one.
 */
export function consoleEmptyText(language: LanguageId, sceneId: string, ranOnce: boolean): string {
  if (language === "sql") {
    return ranOnce
      ? "Your SQL ran and returned no rows. Add a SELECT to see results here."
      : "Nothing run yet. Query results show up here when you Run a SELECT.";
  }
  const print = PRINT[language];
  if (ranOnce) return `Your program ran and printed nothing. Add a ${print} line to see output here.`;
  const dashboard = DASHBOARD_SCENES.has(sceneId) ? " (and on the car's dashboard)" : "";
  return `Nothing printed yet. ${print} output shows up here${dashboard}.`;
}
