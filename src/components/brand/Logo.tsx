import React, { useId } from "react";

/*
  The pockett mark: a square envelope with the command-line prompt `>_` in its body.
  No outlines; tone does all the work. The body is the brand lime (`--primary`).
  The closed flap is a short V whose fill is a green radial gradient: deepest olive
  at the fold (the V tip), fading out to exactly the body colour toward the top
  corners so it melts into the envelope with no seam. The prompt is `--primary-ink`.

  The artwork is drawn on a 32 x 32 grid and is centred on it, so the box centre is
  the mark's centre and it stays on the same axis as text in a flex row.

  Below 40px the gradient is deeper and the prompt heavier so the fold and the prompt
  survive at 16px. The gradient end colour (#c5ee8a) is the body lime; the gradient
  needs literal colours, so if --primary ever changes, update GRADIENT here and the
  static src/app/icon.svg (which is the same artwork with the colours baked in).
*/

const BODY = "#c5ee8a";
const GRADIENT = {
  full: { deep: "#4a771d", mid: "#7eaa45", midAt: 0.4, endAt: 0.82, squash: 0.62 },
  min: { deep: "#3f6a16", mid: "#5f8d2c", midAt: 0.5, endAt: 0.92, squash: 0.7 },
} as const;

export function LogoMark({
  size = 24,
  detail,
  className = "",
}: {
  size?: number;
  detail?: "full" | "min";
  className?: string;
}) {
  // useId output contains characters that are awkward inside url(#...), so keep it plain.
  const id = `pk${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const mode = detail ?? (size >= 40 ? "full" : "min");
  const g = GRADIENT[mode];
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={`block shrink-0 ${className}`}
    >
      <defs>
        <radialGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          cx="16"
          cy="12.2"
          r="18"
          gradientTransform={`translate(0 12.2) scale(1 ${g.squash}) translate(0 -12.2)`}
        >
          <stop offset="0" stopColor={g.deep} />
          <stop offset={g.midAt} stopColor={g.mid} />
          <stop offset={g.endAt} stopColor={BODY} />
        </radialGradient>
      </defs>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="var(--primary)" />
      <path d="M3.5 6.6A6 6 0 0 1 9 3H23A6 6 0 0 1 28.5 6.6L17.64 11.46Q16 12.6 14.36 11.46Z" fill={`url(#${id})`} />
      <g fill="none" stroke="var(--primary-ink)" strokeWidth={mode === "min" ? 3 : 2.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.8 15.4 15 19.5 9.8 23.6" />
        <path d="M17.4 23.8H22.6" />
      </g>
    </svg>
  );
}

/** Mark + wordmark. A flex row centred on one axis; wrap it in a flex/inline-flex parent link. */
export function Logo({ className = "", size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span className="text-[1.05rem] font-semibold leading-none tracking-[-0.02em]">pockett</span>
    </span>
  );
}
