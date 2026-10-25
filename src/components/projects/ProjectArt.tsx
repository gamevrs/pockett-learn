import React from "react";
import { buildTrack } from "@/scenes/garage/sim";

/** The real Turbo Garage circuit, scaled into the card's 400x220 frame. */
const GARAGE_ART = (() => {
  const t = buildTrack(96);
  const sx = (x: number) => 50 + ((x - 95) / 810) * 300;
  const sy = (y: number) => 38 + ((y - 110) / 380) * 150;
  const d = "M" + t.pts.map((p) => `${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" L") + " Z";
  const i = 10;
  return { d, car: { x: sx(t.pts[i].x), y: sy(t.pts[i].y), deg: (t.tangent[i] * 180) / Math.PI } };
})();

/** Flat SVG key art per project: dark field, one accent colour, no glow. */
export function ProjectArt({ slug }: { slug: string }) {
  const defs = (
    <defs>
      <linearGradient id={`g-${slug}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--accent-from)" />
        <stop offset="1" stopColor="var(--accent-to)" />
      </linearGradient>
      <radialGradient id={`glow-${slug}`} cx="50%" cy="50%" r="60%">
        <stop offset="0" stopColor="var(--accent-from)" stopOpacity=".55" />
        <stop offset="1" stopColor="var(--accent-from)" stopOpacity="0" />
      </radialGradient>
    </defs>
  );

  return (
    <svg viewBox="0 0 400 220" className="h-full w-full" role="img" aria-label={`${slug} illustration`} preserveAspectRatio="xMidYMid slice">
      {defs}
      <rect width="400" height="220" fill="#0c0d0b" />
      <g stroke="#ffffff" strokeOpacity=".05">
        {Array.from({ length: 11 }).map((_, i) => (
          <path key={i} d={`M${i * 40} 0 V220`} />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <path key={i} d={`M0 ${i * 40 + 10} H400`} />
        ))}
      </g>
      {slug === "garage" && (
        <g>
          <path
            d={GARAGE_ART.d}
            fill="none"
            stroke="#272925"
            strokeWidth="28"
            strokeLinejoin="round"
          />
          <path
            d={GARAGE_ART.d}
            fill="none"
            stroke="#fff"
            strokeOpacity=".4"
            strokeWidth="2"
            strokeDasharray="10 12"
          />
          <g transform={`translate(${GARAGE_ART.car.x} ${GARAGE_ART.car.y}) rotate(${GARAGE_ART.car.deg}) scale(0.62)`}>
            <path d="M 18 -6 L 120 -30 L 120 30 L 18 6 Z" fill="#fff8c9" opacity=".16" />
            <rect x="-24" y="-12" width="48" height="24" rx="10" fill="url(#g-garage)" />
            <rect x="-9" y="-8" width="24" height="16" rx="5" fill="#0b0f18" />
            <rect x="-24" y="-1.5" width="48" height="3" fill="#fff" opacity=".25" />
          </g>
        </g>
      )}
      {slug === "launch" && (
        <g>
          {Array.from({ length: 26 }).map((_, i) => (
            <circle key={i} cx={(i * 97) % 400} cy={(i * 53) % 220} r={(i % 3) * 0.6 + 0.6} fill="#fff" opacity={0.3 + (i % 4) * 0.15} />
          ))}
          <circle cx="330" cy="50" r="30" fill="#e9eae4" opacity=".9" />
          <circle cx="320" cy="42" r="6" fill="#c8cbc2" />
          <circle cx="340" cy="60" r="4" fill="#c8cbc2" />
          <path d="M 90 200 C 120 120, 200 90, 300 60" fill="none" stroke="url(#g-launch)" strokeWidth="3" strokeDasharray="4 8" strokeLinecap="round" />
          <g transform="translate(190 110) rotate(32)">
            <path d="M0 -44 C 16 -26, 16 8, 11 28 L -11 28 C -16 8, -16 -26, 0 -44 Z" fill="#f8f8f7" />
            <circle cx="0" cy="-8" r="6" fill="#0b0f18" stroke="url(#g-launch)" strokeWidth="2.5" />
            <path d="M-11 12 L -26 34 L -11 28 Z M 11 12 L 26 34 L 11 28 Z" fill="url(#g-launch)" />
            <path d="M-7 28 Q 0 64 7 28 Z" fill="#ecfccb" />
            <path d="M-4 28 Q 0 50 4 28 Z" fill="#d9f99d" />
          </g>
        </g>
      )}
      {slug === "sqldesk" && (
        <g>
          {/* a results table on the left, a bar chart on the right */}
          <rect x="40" y="44" width="170" height="132" rx="8" fill="#151515" stroke="#ffffff" strokeOpacity=".08" />
          <rect x="40" y="44" width="170" height="24" rx="8" fill="#1f1f1f" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect x="54" y={80 + i * 19} width={56 - (i % 3) * 10} height="6" rx="3" fill="#ffffff" opacity={i === 0 ? 0.7 : 0.3} />
              <rect x="150" y={80 + i * 19} width="44" height="6" rx="3" fill={i === 0 ? "url(#g-sqldesk)" : "#ffffff"} opacity={i === 0 ? 1 : 0.18} />
            </g>
          ))}
          {[64, 92, 48, 110, 78, 124].map((h, i) => (
            <rect key={i} x={238 + i * 22} y={176 - h} width="14" height={h} rx="3" fill={i === 5 ? "url(#g-sqldesk)" : "#ffffff"} opacity={i === 5 ? 1 : 0.22} />
          ))}
          <path d="M232 176 H372" stroke="#ffffff" strokeOpacity=".15" />
        </g>
      )}
      {slug === "beatlab" && (
        <g>
          {Array.from({ length: 16 }).map((_, i) => {
            const h = 28 + ((i * 37) % 92);
            return (
              <rect
                key={i}
                x={42 + i * 21}
                y={170 - h}
                width="14"
                height={h}
                rx="3"
                fill="url(#g-beatlab)"
                opacity={i % 4 === 0 ? 1 : 0.65}
                style={{ transformOrigin: `${49 + i * 21}px 170px` }}
              />
            );
          })}
          <g fill="#fff" opacity=".9">
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={42 + i * 84} y="184" width="70" height="10" rx="4" opacity={i % 2 ? 0.25 : 0.9} />
            ))}
          </g>
        </g>
      )}
    </svg>
  );
}
