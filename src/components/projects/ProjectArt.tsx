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
            <path d="M-7 28 Q 0 64 7 28 Z" fill="#effbe0" />
            <path d="M-4 28 Q 0 50 4 28 Z" fill="#e0f6c1" />
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
      {slug === "graphql-gateway" && (
        <g>
          {/* a query on the left, the graph it walks on the right */}
          <rect x="34" y="40" width="130" height="140" rx="8" fill="#101010" stroke="#ffffff" strokeOpacity=".1" />
          <rect x="34" y="40" width="130" height="20" rx="8" fill="#1b1b1b" />
          <rect x="44" y="46" width="24" height="8" rx="4" fill="url(#g-graphql-gateway)" />
          {[
            [0, 36],
            [12, 54],
            [12, 40],
            [24, 62],
            [24, 30],
            [12, 24],
            [0, 14],
          ].map(([indent, w], i) => (
            <rect key={i} x={46 + indent} y={74 + i * 14} width={w} height="5" rx="2.5" fill={i === 3 || i === 4 ? "url(#g-graphql-gateway)" : "#ffffff"} opacity={i === 3 || i === 4 ? 0.95 : 0.2} />
          ))}
          <g stroke="#ffffff" strokeOpacity=".18" strokeWidth="1.5" fill="none">
            <path d="M262 62 L218 112 M262 62 L316 108 M218 112 L236 164 M316 108 L336 160 M218 112 L316 108 M316 108 L270 150" />
          </g>
          <path d="M262 62 L218 112 L236 164" stroke="url(#g-graphql-gateway)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M164 110 H196" stroke="url(#g-graphql-gateway)" strokeWidth="2" strokeDasharray="4 4" />
          {[
            [262, 62, 11, true],
            [218, 112, 9, true],
            [316, 108, 9, false],
            [236, 164, 8, true],
            [336, 160, 8, false],
            [270, 150, 7, false],
          ].map(([cx, cy, r, on], i) => (
            <circle key={i} cx={cx as number} cy={cy as number} r={r as number} fill={on ? "url(#g-graphql-gateway)" : "#151515"} stroke="#ffffff" strokeOpacity={on ? 0 : 0.25} />
          ))}
        </g>
      )}
      {slug === "csharp-basics" && (
        <g>
          {/* a console on the left, the warehouse floor with its patrol lane on the right */}
          <rect x="30" y="38" width="150" height="144" rx="8" fill="#101010" stroke="#ffffff" strokeOpacity=".1" />
          <rect x="30" y="38" width="150" height="20" rx="8" fill="#1b1b1b" />
          <rect x="40" y="44" width="26" height="8" rx="4" fill="url(#g-csharp-basics)" />
          {[
            [0, 92, true],
            [0, 60, false],
            [10, 78, false],
            [10, 44, false],
            [0, 100, true],
            [0, 52, false],
            [10, 70, false],
            [0, 30, false],
          ].map(([indent, w, on], i) => (
            <rect key={i} x={42 + (indent as number)} y={70 + i * 13} width={w as number} height="5" rx="2.5" fill={on ? "url(#g-csharp-basics)" : "#ffffff"} opacity={on ? 0.95 : 0.2} />
          ))}
          {Array.from({ length: 40 }).map((_, i) => {
            const x = i % 8;
            const y = Math.floor(i / 8);
            const lane = x === 0 || x === 7 || y === 0 || y === 4;
            return (
              <rect
                key={i}
                x={212 + x * 20}
                y={52 + y * 20}
                width="17"
                height="17"
                rx="3"
                fill={lane ? "url(#g-csharp-basics)" : "#ffffff"}
                opacity={lane ? 0.35 : 0.07}
              />
            );
          })}
          <circle cx={212 + 5 * 20 + 8.5} cy={52 + 8.5} r="8" fill="url(#g-csharp-basics)" />
          <circle cx={212 + 4 * 20 + 8.5} cy={52 + 8.5} r="5" fill="url(#g-csharp-basics)" opacity=".5" />
          <circle cx={212 + 3 * 20 + 8.5} cy={52 + 8.5} r="3.5" fill="url(#g-csharp-basics)" opacity=".28" />
          <rect x="212" y="162" width="156" height="6" rx="3" fill="#ffffff" opacity=".12" />
          <rect x="212" y="162" width="104" height="6" rx="3" fill="url(#g-csharp-basics)" />
        </g>
      )}
      {slug === "form-forge" && (
        <g>
          {/* a checkout form on the left, the clean JSON it produces on the right */}
          <rect x="30" y="34" width="170" height="152" rx="10" fill="#101010" stroke="#ffffff" strokeOpacity=".1" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x="42" y={48 + i * 33} width={[44, 30, 52, 36][i]} height="4" rx="2" fill="#ffffff" opacity=".32" />
              <rect
                x="42"
                y={57 + i * 33}
                width="146"
                height="17"
                rx="4"
                fill="#1b1b1b"
                stroke={i === 0 ? "url(#g-form-forge)" : "#ffffff"}
                strokeOpacity={i === 0 ? 1 : 0.14}
                strokeDasharray={i === 3 ? "3 3" : undefined}
              />
              <rect x="49" y={63 + i * 33} width={[84, 62, 96, 28][i]} height="5" rx="2.5" fill={i < 3 ? "url(#g-form-forge)" : "#ffffff"} opacity={i === 0 ? 0.95 : i < 3 ? 0.55 : 0.2} />
            </g>
          ))}
          <circle cx="177" cy="65" r="5" fill="url(#g-form-forge)" />
          <path d="M174.5 65 l1.8 1.8 l3.2 -3.4" fill="none" stroke="#0c0d0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M205 110 H223" stroke="url(#g-form-forge)" strokeWidth="2" strokeLinecap="round" />
          <path d="M220 104 l8 6 l-8 6" fill="none" stroke="url(#g-form-forge)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="234" y="34" width="140" height="152" rx="10" fill="#101010" stroke="#ffffff" strokeOpacity=".1" />
          <rect x="246" y="46" width="30" height="12" rx="6" fill="url(#g-form-forge)" />
          {(
            [
              [0, 54, 1],
              [12, 40, 0],
              [12, 62, 0],
              [12, 34, 1],
              [24, 54, 0],
              [24, 44, 0],
              [12, 48, 1],
              [24, 66, 0],
              [0, 20, 0],
            ] as [number, number, number][]
          ).map(([indent, w, on], i) => (
            <rect key={i} x={248 + indent} y={72 + i * 12.5} width={w} height="5" rx="2.5" fill={on ? "url(#g-form-forge)" : "#ffffff"} opacity={on ? 0.9 : 0.2} />
          ))}
        </g>
      )}
      {slug === "event-arena" && (
        <g>
          {/* one emitter fanning events out to three listeners, and a request waterfall underneath */}
          <circle cx="78" cy="96" r="44" fill="url(#glow-event-arena)" />
          <circle cx="78" cy="96" r="22" fill="#121212" stroke="url(#g-event-arena)" strokeWidth="3" />
          <circle cx="78" cy="96" r="7" fill="url(#g-event-arena)" />
          <circle cx="78" cy="96" r="34" fill="none" stroke="url(#g-event-arena)" strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="3 5" />
          {[44, 96, 148].map((y, i) => (
            <g key={y}>
              <path d={`M100 96 C 160 96, 170 ${y}, 236 ${y}`} fill="none" stroke={i === 1 ? "url(#g-event-arena)" : "#ffffff"} strokeOpacity={i === 1 ? 0.9 : 0.18} strokeWidth="2" />
              <circle cx={150} cy={96 + (y - 96) * 0.36} r="3.5" fill={i === 1 ? "url(#g-event-arena)" : "#ffffff"} opacity={i === 1 ? 1 : 0.35} />
              <circle cx={196} cy={96 + (y - 96) * 0.86} r="3" fill={i === 1 ? "url(#g-event-arena)" : "#ffffff"} opacity={i === 1 ? 0.7 : 0.2} />
              <rect x="236" y={y - 20} width="130" height="40" rx="8" fill="#101010" stroke={i === 1 ? "url(#g-event-arena)" : "#ffffff"} strokeOpacity={i === 1 ? 1 : 0.14} />
              <rect x="248" y={y - 8} width={[46, 70, 38][i]} height="5" rx="2.5" fill="#ffffff" opacity=".35" />
              <rect x="248" y={y + 4} width={[78, 52, 62][i]} height="5" rx="2.5" fill={i === 1 ? "url(#g-event-arena)" : "#ffffff"} opacity={i === 1 ? 0.9 : 0.18} />
              <rect x="338" y={y - 8} width="16" height="16" rx="8" fill={i === 1 ? "url(#g-event-arena)" : "#ffffff"} opacity={i === 1 ? 0.95 : 0.12} />
            </g>
          ))}
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={54 + [0, 34, 34, 120][i]} y={186 + i * 7} width={[84, 130, 60, 70][i]} height="4" rx="2" fill={i === 1 ? "url(#g-event-arena)" : "#ffffff"} opacity={i === 1 ? 0.95 : 0.16} />
          ))}
        </g>
      )}
      {slug === "season-analytics" && (
        <g>
          {/* a points-progression chart on the left, a standings table with move arrows on the right */}
          <rect x="34" y="38" width="216" height="144" rx="8" fill="#101010" stroke="#ffffff" strokeOpacity=".08" />
          {[70, 102, 134].map((y) => (
            <path key={y} d={`M46 ${y} H238`} stroke="#ffffff" strokeOpacity=".07" />
          ))}
          {[
            "M46 168 L86 164 L126 158 L166 150 L206 138 L238 130",
            "M46 170 L86 160 L126 152 L166 140 L206 132 L238 118",
            "M46 166 L86 162 L126 150 L166 146 L206 126 L238 104",
            "M46 172 L86 168 L126 164 L166 160 L206 154 L238 148",
          ].map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#ffffff" strokeOpacity={0.14 + i * 0.05} strokeWidth="1.5" strokeLinejoin="round" />
          ))}
          <path d="M46 168 L86 150 L126 130 L166 112 L206 82 L238 58" fill="none" stroke="url(#g-season-analytics)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          {[86, 126, 166, 206].map((x, i) => (
            <circle key={x} cx={x} cy={[150, 130, 112, 82][i]} r="2.5" fill="url(#g-season-analytics)" />
          ))}
          <circle cx="238" cy="58" r="5" fill="url(#g-season-analytics)" />
          <circle cx="238" cy="58" r="12" fill="url(#glow-season-analytics)" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <path d={i === 0 || i === 2 ? `M276 ${68 + i * 30} l5 -8 l5 8 z` : `M276 ${60 + i * 30} l5 8 l5 -8 z`} fill={i === 0 || i === 2 ? "url(#g-season-analytics)" : "#ffffff"} opacity={i === 0 || i === 2 ? 1 : 0.28} />
              <rect x="296" y={60 + i * 30} width={[44, 38, 48, 30][i]} height="6" rx="3" fill="#ffffff" opacity={i === 0 ? 0.75 : 0.3} />
              <rect x="296" y={72 + i * 30} width={[50, 44, 40, 32][i]} height="4" rx="2" fill={i === 0 ? "url(#g-season-analytics)" : "#ffffff"} opacity={i === 0 ? 1 : 0.16} />
              <text x="372" y={69 + i * 30} textAnchor="end" fontSize="10" fontFamily="var(--font-mono)" fill="#ffffff" opacity={i === 0 ? 0.9 : 0.4}>{[141, 138, 132, 132][i]}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
