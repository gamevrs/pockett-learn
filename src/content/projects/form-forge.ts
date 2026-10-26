import type { Project } from "@/engine/types";
import { chapter1 } from "../form-forge/chapter1.ts";
import { chapter2 } from "../form-forge/chapter2.ts";
import { chapter3 } from "../form-forge/chapter3.ts";
import { chapter4 } from "../form-forge/chapter4.ts";

/**
 * Form Forge: the form engine behind a sign-up and checkout flow.
 * Intermediate JavaScript: arrays, objects, strings, regex, errors, JSON and validation.
 *
 * The scene (src/scenes/form-forge) calls these learner functions, each only once the lesson that
 * writes it is passed (see FEATURES below). Scene-side names are camelCase, as the learner writes them:
 *   requiredFields(fields), findField, hasType, allFilled(names, values), lastRequired   L1
 *   orderTotal(items), sortByPrice, allSkus, countByType(fields), luhnCheck(digits)       L2
 *   summarize(customer), withDefaults(values), compact(values), withoutSecrets(values)    L3
 *   cleanText, titleCase, digitsOnly, formatCardNumber, maskCard, formatMoney            L4
 *   isEmail, isUsername, isCvc, isCardNumber                                              L5
 *   formatPhone, normalizePostcode(country, raw), parseExpiry, redactCards                L6
 *   passwordRules, passwordScore, containsBanned(text, words)                             L7
 *   checkExpiry(text, today), attemptStats()                                              L8
 *   loadDraft(text) -> { ok, value | error }                                              L9
 *   buildPayload(values, items, submittedAt) -> JSON text                                 L10
 *   checkField(name, values) -> [{ id, ok, message }], fieldErrors, validateAll           L11
 *   (more rules on confirm / country / note)                                              L12
 *   escapeHtml, sanitizeValues, handleSubmit(bodyText) -> { status, errors }              L13
 *   submitForm(values, items, submittedAt) -> { ok, status, errors | body }               L14
 */

export const formForge: Project = {
  slug: "form-forge",
  language: "javascript",
  prerequisites: ["garage-js"],
  title: "Form Forge",
  tagline: "Build the form engine behind a sign-up and checkout flow.",
  pitch:
    "Every web app lives or dies by what it does with text people type. You build the engine behind a sign-up and checkout form: parse and tidy messy input, check it with regular expressions, report every problem clearly, and send clean JSON to a server that does not trust you. Your functions drive a live form, and a fuzz button hurls hostile input at them.",
  emoji: "🧾",
  difficulty: "Intermediate",
  hours: 8,
  sceneId: "form-forge",
  accent: { from: "#fbbf24", to: "#d97706" },
  controls: ["Type in the form", "Fill example", "Fuzz it", "Send to the server"],
  skills: [
    "array methods",
    "destructuring & spread",
    "optional chaining & ??",
    "strings & Unicode",
    "regular expressions",
    "errors & finally",
    "JSON",
    "validation design",
    "sanitizing & trust",
  ],
  features: [
    { id: "ff-form", title: "Live form", blurb: "The checkout form comes alive and knows which fields are required.", emoji: "🧾" },
    { id: "ff-order", title: "Order summary", blurb: "The basket is sorted, totalled and itemised by your array code.", emoji: "🛒" },
    { id: "ff-state", title: "State inspector", blurb: "See the values your code keeps, with secrets stripped.", emoji: "🔍" },
    { id: "ff-clean", title: "Tidy inputs", blurb: "Names, cities, card numbers and money are cleaned and formatted live.", emoji: "🧼" },
    { id: "ff-patterns", title: "Pattern checks", blurb: "Emails, usernames, CVCs and card numbers are checked with regular expressions.", emoji: "🎯" },
    { id: "ff-format", title: "Smart formatting", blurb: "Phone numbers, postcodes and expiry dates are parsed and normalized.", emoji: "📞" },
    { id: "ff-password", title: "Password meter", blurb: "A strength meter and a rule checklist, built from lookaheads.", emoji: "🔐" },
    { id: "ff-errors", title: "Error console", blurb: "Errors with names, causes and a counter that survives failures.", emoji: "🚨" },
    { id: "ff-draft", title: "Draft restore", blurb: "Saved drafts are parsed safely, even when the JSON is broken.", emoji: "💾" },
    { id: "ff-payload", title: "JSON payload", blurb: "Submit turns the form into clean, secret-free JSON.", emoji: "📦" },
    { id: "ff-rules", title: "Rule engine", blurb: "Every rule is data, and every problem is reported at once.", emoji: "📋" },
    { id: "ff-compose", title: "Composed rules", blurb: "Small validator factories snap together into richer rules.", emoji: "🧩" },
    { id: "ff-secure", title: "Server checkpoint", blurb: "A server that re-validates everything, however the request was made.", emoji: "🛡️" },
    { id: "ff-schema", title: "Schema pipeline", blurb: "One schema drives sanitizing, validating, the payload and the server.", emoji: "📐" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
