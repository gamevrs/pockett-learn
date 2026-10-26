import type { Project } from "@/engine/types";
import { chapter1 } from "./signal-lab/ch1.ts";
import { chapter2 } from "./signal-lab/ch2.ts";
import { chapter3 } from "./signal-lab/ch3.ts";
import { chapter4 } from "./signal-lab/ch4.ts";

/**
 * Signal Lab: decode a deep-space radio feed with strings, regular expressions, parsing,
 * comprehensions, sorting and counting. One growing Python file powers a live radio console.
 *
 * The scene feeds its own raw transmissions through the learner's functions. It looks for these
 * hooks (each only once its lesson is passed):
 *   read_stamp, scrub, margins, split_message, is_beacon, first_tag, checksum, readout, hz_text,
 *   pretty_stamp, valid_call, find_numbers, starts_with_stamp, has_checksum, parse_fields,
 *   message_kind, tag_spans, redact_callsigns, tidy_units, parse_line, tags, search, parse_record,
 *   sky_points, strongest, top_senders, average_snr, hot_words, summarize, format_report
 *
 * Raw line: <20-char UTC stamp><noise> call @ freq az= el= snr= "message" #checksum <noise>
 * Checksum: sum(ord(c) for c in message) % 256, as two hex digits.
 */
export const signalLab: Project = {
  slug: "signal-lab",
  title: "Signal Lab",
  tagline: "Decode noisy radio messages with strings, regex and parsing.",
  pitch:
    "Run a deep-space radio observatory. Raw transmissions arrive as messy text, wrapped in noise, in every capitalisation, with half the fields in odd places. Lesson by lesson you build the decoder, and a live console turns the static into a clean, searchable dashboard with a sky map and a leaderboard.",
  emoji: "📡",
  difficulty: "Intermediate",
  hours: 7,
  sceneId: "signal-lab",
  prerequisites: ["garage"],
  accent: { from: "#38bdf8", to: "#6366f1" },
  controls: ["Pause or resume the stream", "Type a pattern in the search box", "Transmit your own line", "Drag the SNR slider on the sky map"],
  skills: ["slicing", "string methods", "f-strings", "regular expressions", "parsing", "comprehensions", "sorting", "Counter & defaultdict"],
  features: [
    { id: "sl-stream", title: "Incoming stream", blurb: "The console powers on and your slicing reads every stamp.", emoji: "📡" },
    { id: "sl-scrub", title: "Noise filter", blurb: "A clean column appears beside the raw static.", emoji: "🧹" },
    { id: "sl-decode", title: "Message decoder", blurb: "Call sign, message and checksum cut out of each line.", emoji: "🔎" },
    { id: "sl-readout", title: "Readout & checksum", blurb: "Aligned readouts, and corrupted messages get flagged.", emoji: "🧮" },
    { id: "sl-scanner", title: "Pattern scanner", blurb: "Regex detectors highlight numbers and grade each line's health.", emoji: "🔬" },
    { id: "sl-fields", title: "Field extractor", blurb: "Capture groups colour every field of the line.", emoji: "🖍️" },
    { id: "sl-release", title: "Release copy", blurb: "Call signs redacted and units tidied by re.sub.", emoji: "🕶️" },
    { id: "sl-records", title: "Parsed records", blurb: "One master pattern turns raw lines into records.", emoji: "🗂️" },
    { id: "sl-search", title: "Search console", blurb: "Your regex-powered filter runs live on the stream.", emoji: "🔍" },
    { id: "sl-alerts", title: "Alert board", blurb: "Malformed and corrupted messages raise alerts with your error text.", emoji: "🚨" },
    { id: "sl-skymap", title: "Sky map", blurb: "Your comprehensions plot every source by bearing and strength.", emoji: "🌌" },
    { id: "sl-ranking", title: "Strongest signals", blurb: "A key-sorted ranking of the loudest transmissions.", emoji: "📶" },
    { id: "sl-leaderboard", title: "Top senders", blurb: "Counter and defaultdict power the leaderboard.", emoji: "🏆" },
    { id: "sl-report", title: "Mission report", blurb: "The whole pipeline summarised in one printable report.", emoji: "📋" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
