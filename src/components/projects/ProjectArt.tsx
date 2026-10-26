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
      {slug === "signal-lab" && (
        <g>
          {/* a sky map with a few sources on the left, noisy text lines turning clean on the right */}
          <circle cx="112" cy="110" r="66" fill="#151515" stroke="#ffffff" strokeOpacity=".1" />
          <circle cx="112" cy="110" r="44" fill="none" stroke="#ffffff" strokeOpacity=".08" strokeDasharray="2 4" />
          <circle cx="112" cy="110" r="22" fill="none" stroke="#ffffff" strokeOpacity=".08" strokeDasharray="2 4" />
          <path d="M112 44 V176 M46 110 H178" stroke="#ffffff" strokeOpacity=".07" />
          <path d="M112 110 L112 44 A66 66 0 0 1 150 56 Z" fill="#ffffff" opacity=".05" />
          {[
            [140, 82, 5],
            [86, 128, 3.5],
            [128, 140, 4.2],
            [92, 76, 3],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={i === 0 ? "url(#g-signal-lab)" : "#ffffff"} opacity={i === 0 ? 1 : 0.3} />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <path
                d={`M214 ${64 + i * 24} l5 -5 l4 8 l5 -6 l5 4 l4 -3 l5 5 l4 -6 l5 3`}
                fill="none"
                stroke="#ffffff"
                strokeOpacity=".25"
                strokeWidth="1.4"
              />
              <rect x="272" y={60 + i * 24} width={96 - (i % 3) * 18} height="7" rx="3.5" fill={i === 1 ? "url(#g-signal-lab)" : "#ffffff"} opacity={i === 1 ? 1 : 0.28} />
            </g>
          ))}
        </g>
      )}
      {slug === "cargo-control" && (
        <g>
          {/* a belt with crates passing a scanner, and three bays waiting at the end */}
          <rect x="34" y="132" width="332" height="14" rx="3" fill="#151515" stroke="#ffffff" strokeOpacity=".1" />
          {Array.from({ length: 17 }).map((_, i) => (
            <path key={i} d={`M${44 + i * 19.5} 134 v10`} stroke="#ffffff" strokeOpacity=".1" />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={44 + i * 52} y="102" width="38" height="30" rx="4" fill="#1b1b1b" stroke="#ffffff" strokeOpacity={i === 2 ? 0 : 0.18} />
          ))}
          <rect x="148" y="102" width="38" height="30" rx="4" fill="url(#g-cargo-control)" opacity=".92" />
          <path d="M167 52 V148" stroke="#ffffff" strokeOpacity=".5" strokeDasharray="3 4" />
          <path d="M167 52 L224 74 V132 H110 V74 Z" fill="url(#glow-cargo-control)" opacity=".28" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={236 + i * 44} y="68" width="36" height="42" rx="6" fill="#151515" stroke="#ffffff" strokeOpacity=".1" />
              <rect x={244 + i * 44} y="78" width="20" height="5" rx="2.5" fill={i === 0 ? "url(#g-cargo-control)" : "#ffffff"} opacity={i === 0 ? 1 : 0.22} />
              <rect x={244 + i * 44} y="90" width="14" height="5" rx="2.5" fill="#ffffff" opacity=".14" />
            </g>
          ))}
          <path d="M34 168 H366" stroke="#ffffff" strokeOpacity=".12" />
          {[34, 60, 88, 112, 150].map((x, i) => (
            <rect key={x} x={x + 8} y="176" width={[18, 24, 14, 30, 20][i]} height="6" rx="3" fill="#ffffff" opacity={i === 3 ? 0.5 : 0.16} />
          ))}
        </g>
      )}
      {slug === "store-api" && (
        <g>
          {/* a shop grid on the left, a request / response console on the right */}
          {[0, 1, 2, 3].map((i) => {
            const x = 40 + (i % 2) * 74;
            const y = 46 + Math.floor(i / 2) * 76;
            return (
              <g key={i}>
                <rect x={x} y={y} width="66" height="68" rx="7" fill="#151515" stroke="#ffffff" strokeOpacity=".09" />
                <rect x={x + 6} y={y + 6} width="54" height="32" rx="4" fill={i === 1 ? "url(#g-store-api)" : "#ffffff"} opacity={i === 1 ? 0.9 : 0.07} />
                <rect x={x + 6} y={y + 46} width={36 - (i % 3) * 6} height="5" rx="2.5" fill="#ffffff" opacity=".4" />
                <rect x={x + 6} y={y + 56} width="20" height="5" rx="2.5" fill={i === 1 ? "url(#g-store-api)" : "#ffffff"} opacity={i === 1 ? 1 : 0.2} />
              </g>
            );
          })}
          <rect x="196" y="46" width="164" height="144" rx="8" fill="#101010" stroke="#ffffff" strokeOpacity=".1" />
          <rect x="196" y="46" width="164" height="22" rx="8" fill="#1b1b1b" />
          <rect x="206" y="52" width="26" height="10" rx="5" fill="url(#g-store-api)" />
          <rect x="238" y="55" width="70" height="4" rx="2" fill="#ffffff" opacity=".35" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="206" y={80 + i * 20} width={[54, 40, 62][i]} height="5" rx="2.5" fill="#ffffff" opacity=".22" />
              <rect x={206 + [54, 40, 62][i] + 8} y={80 + i * 20} width={[34, 48, 26][i]} height="5" rx="2.5" fill={i === 1 ? "url(#g-store-api)" : "#ffffff"} opacity={i === 1 ? 0.9 : 0.14} />
            </g>
          ))}
          {[
            ["200", true],
            ["404", false],
            ["201", true],
          ].map(([code, ok], i) => (
            <g key={String(code)}>
              <rect x={206 + i * 48} y="146" width="40" height="16" rx="8" fill={ok ? "url(#g-store-api)" : "#ffffff"} opacity={ok ? 0.95 : 0.12} />
              <rect x={216 + i * 48} y="152" width="20" height="4" rx="2" fill={ok ? "#0b0f18" : "#ffffff"} opacity={ok ? 0.55 : 0.4} />
            </g>
          ))}
          <path d="M206 176 H350" stroke="#ffffff" strokeOpacity=".12" />
        </g>
      )}
      {slug === "smart-home" && (
        <g>
          {/* a floor plan: four rooms, one lit lamp, a lock, and a motion ping */}
          <rect x="70" y="36" width="260" height="150" rx="6" fill="#121212" stroke="#ffffff" strokeOpacity=".3" strokeWidth="3" />
          <path d="M160 36 V84 M160 112 V186 M70 112 H128 M152 112 H330 M215 112 V138 M215 160 V186" stroke="#ffffff" strokeOpacity=".2" strokeWidth="2" fill="none" />
          <circle cx="116" cy="74" r="38" fill="url(#glow-smart-home)" />
          <circle cx="116" cy="74" r="7" fill="url(#g-smart-home)" />
          <circle cx="250" cy="148" r="6" fill="#151515" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1.5" />
          <circle cx="250" cy="74" r="6" fill="#151515" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1.5" />
          <circle cx="100" cy="150" r="14" fill="none" stroke="url(#g-smart-home)" strokeWidth="2" />
          <circle cx="100" cy="150" r="5" fill="url(#g-smart-home)" />
          <circle cx="100" cy="150" r="24" fill="none" stroke="url(#g-smart-home)" strokeOpacity=".4" strokeWidth="1.5" />
          <rect x="290" y="132" width="20" height="30" rx="5" fill="#151515" stroke="#ffffff" strokeOpacity=".3" />
          <rect x="296" y="142" width="8" height="6" rx="1.5" fill="url(#g-smart-home)" />
          <path d="M96 186 H124" stroke="#ffffff" strokeOpacity=".7" strokeWidth="4" strokeLinecap="round" />
          <circle cx="205" cy="132" r="5" fill="#ffffff" opacity=".85" />
          <path d="M90 214 H310" stroke="#ffffff" strokeOpacity=".08" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={86 + i * 46} y="200" width={[26, 34, 20, 40, 28][i]} height="5" rx="2.5" fill={i === 1 ? "url(#g-smart-home)" : "#ffffff"} opacity={i === 1 ? 1 : 0.16} />
          ))}
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
