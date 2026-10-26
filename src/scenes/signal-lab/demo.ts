import { createStaticProgram, type ProgramHandle } from "@/engine/program";
import * as F from "./feed.ts";

/**
 * The finished Signal Lab program, written in plain JS (a port of the reference Python solution)
 * so the landing page can run the whole console without loading Python.
 */
export function signalLabDemoProgram(): ProgramHandle {
  return createStaticProgram({
    stdout: F.formatReport(F.summarize(Array.from({ length: 9 }, (_, i) => F.transmissionAt(i).raw))),
    hooks: {
      read_stamp: (raw: string) => ({ date: raw.slice(0, 10), time: raw.slice(11, 19), hour: Number(raw.slice(11, 13)) }),
      scrub: F.scrub,
      margins: F.margins,
      split_message: F.splitMessage,
      is_beacon: (m: string) => /beacon/i.test(m),
      first_tag: F.firstTag,
      checksum: F.checksumOf,
      readout: F.readout,
      hz_text: F.hzText,
      pretty_stamp: F.prettyStamp,
      valid_call: F.validCall,
      find_numbers: F.findNumbers,
      starts_with_stamp: F.startsWithStamp,
      has_checksum: F.hasChecksum,
      parse_fields: F.parseFields,
      message_kind: F.messageKind,
      tag_spans: F.tagSpans,
      redact_callsigns: F.redactCallsigns,
      tidy_units: F.tidyUnits,
      parse_line: F.parseLine,
      search: F.search,
      parse_record: F.parseRecord,
      sky_points: (records: (F.Rec | F.Failure)[], min: number) => F.skyPoints(records, min),
      strongest: (records: (F.Rec | F.Failure)[], n: number) => F.strongest(records, n),
      top_senders: (records: (F.Rec | F.Failure)[], n: number) => F.topSenders(records, n),
      average_snr: (records: (F.Rec | F.Failure)[]) => F.averageSnr(records),
      hot_words: (records: (F.Rec | F.Failure)[], n: number) => F.hotWords(records, n),
      summarize: (lines: string[]) => F.summarize(lines),
      format_report: (s: F.Summary) => F.formatReport(s),
    },
  });
}
