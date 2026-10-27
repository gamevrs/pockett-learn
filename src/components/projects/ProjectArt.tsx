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
      {slug === "csharp-api" && (
        <g>
          {/* a request passes through four middleware lanes; one request is stopped, one reaches the route table */}
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={118 + i * 34} y="34" width="22" height="150" rx="6" fill="#101010" stroke="#ffffff" strokeOpacity=".12" />
          ))}
          <rect x="30" y="92" width="50" height="34" rx="6" fill="#101010" stroke="#ffffff" strokeOpacity=".16" />
          <path d="M38 100 L55 112 L72 100" fill="none" stroke="url(#g-csharp-api)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M82 109 H112" stroke="url(#g-csharp-api)" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 5" />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={122 + i * 34} y={104} width="14" height="10" rx="3" fill="url(#g-csharp-api)" opacity={0.95 - i * 0.18} />
          ))}
          <path d="M82 66 H146" stroke="#ffffff" strokeOpacity=".28" strokeWidth="3" strokeLinecap="round" />
          <circle cx="148" cy="66" r="6" fill="none" stroke="#f87171" strokeWidth="3" />
          <path d="M82 152 H228" stroke="#ffffff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 6" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect x="278" y={44 + i * 28} width="86" height="20" rx="5" fill="#101010" stroke="#ffffff" strokeOpacity=".1" />
              <rect x="286" y={51 + i * 28} width={[34, 52, 26, 44, 38][i]} height="6" rx="3" fill={i === 1 ? "url(#g-csharp-api)" : "#ffffff"} opacity={i === 1 ? 1 : 0.22} />
              <rect x="342" y={50 + i * 28} width="16" height="8" rx="4" fill={i === 1 ? "url(#g-csharp-api)" : "#ffffff"} opacity={i === 1 ? 0.9 : 0.14} />
            </g>
          ))}
          <path d="M232 109 H272" stroke="url(#g-csharp-api)" strokeWidth="3" strokeLinecap="round" />
          <path d="M268 103 L276 109 L268 115" fill="none" stroke="url(#g-csharp-api)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {slug === "go-basics" && (
        <g>
          {/* a top-down sorting floor: an intake belt of crates, four chutes dropping into vans, and a reject bin */}
          <rect x="24" y="30" width="276" height="26" rx="6" fill="#ffffff" opacity=".06" />
          <path d="M24 34 H300 M24 52 H300" stroke="#ffffff" strokeOpacity=".16" strokeDasharray="3 5" />
          {[
            [40, 26, true],
            [78, 20, false],
            [112, 30, true],
            [156, 18, false],
            [190, 24, true],
            [230, 22, false],
          ].map(([x, w, on], i) => (
            <rect key={i} x={x as number} y="37" width={w as number} height="12" rx="3" fill={on ? "url(#g-go-basics)" : "#ffffff"} opacity={on ? 0.95 : 0.22} />
          ))}
          <rect x="270" y="26" width="4" height="34" rx="2" fill="url(#g-go-basics)" />
          <rect x="286" y="26" width="4" height="34" rx="2" fill="url(#g-go-basics)" opacity=".5" />
          {[60, 130, 200, 270].map((x, i) => (
            <g key={x}>
              <rect x={x - 7} y="56" width="14" height="96" rx="4" fill="#ffffff" opacity=".07" />
              <path d={`M${x - 7} 56 V152 M${x + 7} 56 V152`} stroke="#ffffff" strokeOpacity=".18" />
              <path d={`M${x} 62 L${x + (i % 2 ? -5 : 5)} 90`} stroke="url(#g-go-basics)" strokeWidth="3" strokeLinecap="round" />
              <rect x={x - 28} y="154" width="56" height="38" rx="7" fill="#101010" stroke="#ffffff" strokeOpacity=".18" />
              <rect x={x - 22} y="178" width="44" height="6" rx="3" fill="#ffffff" opacity=".14" />
              <rect x={x - 22} y="178" width={[34, 14, 24, 42][i]} height="6" rx="3" fill="url(#g-go-basics)" />
              <circle cx={x - 15} cy="166" r="3" fill="#ffffff" opacity=".4" />
              <circle cx={x + 15} cy="166" r="3" fill="#ffffff" opacity=".4" />
            </g>
          ))}
          <rect x="326" y="76" width="50" height="76" rx="8" fill="none" stroke="#ffffff" strokeOpacity=".3" strokeDasharray="5 4" />
          {[0, 1, 2].map((i) => (
            <rect key={i} x="334" y={86 + i * 17} width={[34, 26, 30][i]} height="9" rx="4.5" fill="url(#g-go-basics)" opacity={0.9 - i * 0.2} />
          ))}
          <path d="M300 43 H340 V76" fill="none" stroke="#ffffff" strokeOpacity=".22" strokeDasharray="4 5" />
        </g>
      )}
      {slug === "go-inventory" && (
        <g>
          {/* a rescue depot: a rack of numbered bins with stock bars, a coiled rope, a handler lane that fans out to concrete types, and a rejected-records tray */}
          <path d="M34 28 V152 M246 28 V152" stroke="#ffffff" strokeOpacity=".2" strokeWidth="4" strokeLinecap="round" />
          {[0, 1, 2].map((r) => (
            <path key={r} d={`M30 ${62 + r * 42} H250`} stroke="#ffffff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" />
          ))}
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => {
              const fill = [[0.9, 0.55, 0.3, 0.75], [0.4, 0.95, 0.12, 0.6], [0.7, 0.25, 0, 0.85]][r][c];
              const x = 42 + c * 51;
              const y = 32 + r * 42;
              return (
                <g key={`${r}-${c}`}>
                  <rect x={x} y={y} width="44" height="28" rx="5" fill="#101010" stroke="#ffffff" strokeOpacity={fill === 0 ? 0.3 : 0.14} strokeDasharray={fill === 0 ? "3 3" : undefined} />
                  <rect x={x + 6} y={y + 17} width="32" height="4" rx="2" fill="#ffffff" opacity=".12" />
                  {fill > 0 && <rect x={x + 6} y={y + 17} width={32 * fill} height="4" rx="2" fill={fill < 0.2 ? "#fbbf24" : "url(#g-go-inventory)"} />}
                  <rect x={x + 6} y={y + 6} width={[16, 22, 12, 18][c]} height="5" rx="2.5" fill="#ffffff" opacity=".28" />
                </g>
              );
            }),
          )}
          {/* a rope coil */}
          {[34, 25, 16].map((r, i) => (
            <circle key={r} cx="318" cy="70" r={r} fill="none" stroke="url(#g-go-inventory)" strokeWidth="4" strokeDasharray={i === 0 ? "none" : "52 14"} opacity={0.95 - i * 0.18} />
          ))}
          <path d="M318 36 C326 24 348 28 352 14" fill="none" stroke="url(#g-go-inventory)" strokeWidth="4" strokeLinecap="round" />
          {/* handler lane: one interface node, three concrete types */}
          <circle cx="40" cy="176" r="7" fill="none" stroke="#ffffff" strokeOpacity=".5" strokeWidth="2" />
          <path d="M47 176 H78" stroke="#ffffff" strokeOpacity=".3" strokeWidth="2" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <path d={`M78 176 C 96 176 96 ${160 + i * 16} 114 ${160 + i * 16}`} fill="none" stroke="url(#g-go-inventory)" strokeWidth="2.5" strokeLinecap="round" opacity={0.95 - i * 0.2} />
              <rect x="114" y={153 + i * 16} width={[58, 46, 66][i]} height="14" rx="7" fill="#101010" stroke="url(#g-go-inventory)" strokeWidth="1.5" />
              <rect x="122" y={158 + i * 16} width={[34, 22, 40][i]} height="4" rx="2" fill="#ffffff" opacity=".35" />
            </g>
          ))}
          {/* the rejected-records tray */}
          <rect x="256" y="132" width="116" height="66" rx="9" fill="none" stroke="#ffffff" strokeOpacity=".28" strokeDasharray="5 4" />
          {[0, 1].map((i) => (
            <g key={i}>
              <rect x="268" y={142 + i * 26} width="60" height="9" rx="4.5" fill="#ffffff" opacity=".2" />
              <rect x="334" y={140 + i * 26} width="28" height="13" rx="6.5" fill={i === 0 ? "#f87171" : "none"} stroke="#f87171" strokeWidth="1.5" />
            </g>
          ))}
        </g>
      )}
      {slug === "cpp-basics" && (
        <g>
          {/* a tokamak ring with its plasma path, a row of fuel rods, a dial and three coolant loops */}
          <g transform="rotate(-14 128 100)">
            <ellipse cx="128" cy="100" rx="94" ry="38" fill="none" stroke="#ffffff" strokeOpacity=".08" strokeWidth="16" />
            <ellipse cx="128" cy="100" rx="94" ry="38" fill="none" stroke="#ffffff" strokeOpacity=".16" strokeWidth="1" />
            <ellipse cx="128" cy="100" rx="86" ry="31" fill="none" stroke="url(#g-cpp-basics)" strokeWidth="3" strokeDasharray="16 10" strokeLinecap="round" />
            <ellipse cx="128" cy="100" rx="40" ry="13" fill="none" stroke="#ffffff" strokeOpacity=".14" strokeWidth="1" />
            <circle cx="128" cy="100" r="7" fill="url(#g-cpp-basics)" />
            <circle cx="128" cy="100" r="14" fill="none" stroke="url(#g-cpp-basics)" strokeOpacity=".4" />
          </g>
          {[22, 34, 16, 40, 28, 12, 36, 24, 38, 18, 30, 26].map((h, i) => (
            <g key={i}>
              <rect x={38 + i * 16} y="156" width="9" height="40" rx="3" fill="#ffffff" opacity=".1" />
              <rect x={38 + i * 16} y={196 - h} width="9" height={h} rx="3" fill={i === 5 ? "#ffffff" : "url(#g-cpp-basics)"} opacity={i === 5 ? 0.35 : 0.9} />
            </g>
          ))}
          <path d="M 273.96 117.26 A 44 44 0 1 1 346.04 117.26" fill="none" stroke="#ffffff" strokeOpacity=".14" strokeWidth="7" strokeLinecap="round" />
          <path d="M 273.96 117.26 A 44 44 0 0 1 325.05 50.64" fill="none" stroke="url(#g-cpp-basics)" strokeWidth="7" strokeLinecap="round" />
          <line x1="310" y1="92" x2="321.6" y2="60" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="310" cy="92" r="5" fill="#101010" stroke="#ffffff" strokeOpacity=".6" strokeWidth="1.5" />
          <rect x="296" y="124" width="28" height="5" rx="2.5" fill="#ffffff" opacity=".28" />
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x="264"
              y={146 + i * 18}
              width="108"
              height="11"
              rx="5.5"
              fill="none"
              stroke={i === 0 ? "url(#g-cpp-basics)" : "#ffffff"}
              strokeOpacity={i === 0 ? 0.95 : 0.22}
              strokeWidth="2"
              strokeDasharray={i === 2 ? "5 6" : undefined}
            />
          ))}
        </g>
      )}
      {slug === "cpp-memory" && (
        <g>
          {/* the workbench: three stack cells, one of them a pointer; the vault: a grid of bays; arrows between; a logbook timeline */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="34" y={34 + i * 38} width="96" height="30" rx="6" fill="#101010" stroke="#ffffff" strokeOpacity={i === 1 ? 0.34 : 0.16} />
              <rect x="42" y={43 + i * 38} width={[34, 26, 40][i]} height="5" rx="2.5" fill="#ffffff" opacity=".35" />
              <rect x="42" y={53 + i * 38} width={[22, 38, 16][i]} height="4" rx="2" fill="url(#g-cpp-memory)" opacity=".9" />
            </g>
          ))}
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => {
              const state = [[1, 0, 2], [0, 1, 0], [1, 0, 3]][r][c];
              const x = 214 + c * 54;
              const y = 34 + r * 38;
              return (
                <g key={`${r}-${c}`}>
                  <rect x={x} y={y} width="46" height="30" rx="6" fill="#101010" stroke={state === 3 ? "#f87171" : "#ffffff"} strokeOpacity={state === 0 ? 0.12 : state === 3 ? 0.9 : 0.3} strokeDasharray={state === 0 || state === 3 ? "4 3" : undefined} />
                  {state === 1 && <rect x={x + 7} y={y + 12} width="32" height="6" rx="3" fill="url(#g-cpp-memory)" />}
                  {state === 2 && <rect x={x + 7} y={y + 12} width="20" height="6" rx="3" fill="url(#g-cpp-memory)" opacity=".7" />}
                  {state === 3 && <path d={`M${x + 15} ${y + 9} l16 12 m0 -12 l-16 12`} stroke="#f87171" strokeWidth="2" strokeLinecap="round" />}
                </g>
              );
            }),
          )}
          <path d="M130 49 C 168 49 176 49 212 49" fill="none" stroke="url(#g-cpp-memory)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M130 87 C 170 87 172 125 212 125" fill="none" stroke="url(#g-cpp-memory)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M130 125 C 176 125 176 87 214 87" fill="none" stroke="#ffffff" strokeOpacity=".4" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${208 + (i === 1 ? 2 : 0)} ${i === 0 ? 49 : i === 1 ? 87 : 125} l6 -4 v8 z`} fill="url(#g-cpp-memory)" />
          ))}
          {/* logbook: lifetimes as nested bars */}
          <g>
            <rect x="34" y="158" width="332" height="44" rx="8" fill="none" stroke="#ffffff" strokeOpacity=".22" strokeDasharray="5 4" />
            <rect x="46" y="167" width="150" height="6" rx="3" fill="url(#g-cpp-memory)" opacity=".9" />
            <rect x="70" y="177" width="64" height="6" rx="3" fill="url(#g-cpp-memory)" opacity=".65" />
            <rect x="150" y="177" width="80" height="6" rx="3" fill="url(#g-cpp-memory)" opacity=".5" />
            <rect x="214" y="187" width="40" height="6" rx="3" fill="url(#g-cpp-memory)" opacity=".5" />
            <rect x="268" y="167" width="14" height="6" rx="3" fill="#ffffff" opacity=".6" />
            <rect x="268" y="177" width="14" height="6" rx="3" fill="#ffffff" opacity=".6" />
            <rect x="268" y="187" width="14" height="6" rx="3" fill="#ffffff" opacity=".6" />
            <rect x="296" y="167" width="56" height="6" rx="3" fill="#fbbf24" opacity=".8" />
            <rect x="296" y="177" width="30" height="6" rx="3" fill="#fbbf24" opacity=".8" />
          </g>
        </g>
      )}
      {slug === "csharp-linq" && (
        <g>
          {/* a departures board of manifest rows, a bar chart of categories and a vessel docked at its pier */}
          <rect x="28" y="30" width="216" height="158" rx="8" fill="#101010" stroke="#ffffff" strokeOpacity=".1" />
          <rect x="28" y="30" width="216" height="22" rx="8" fill="#1b1b1b" />
          <rect x="38" y="36" width="30" height="10" rx="5" fill="url(#g-csharp-linq)" />
          {[96, 140, 186, 224].map((x, i) => (
            <rect key={x} x={x - 20} y="39" width={[22, 26, 14, 8][i]} height="4" rx="2" fill="#ffffff" opacity=".3" />
          ))}
          {[
            [34, 70, 20, true, false],
            [26, 54, 28, true, false],
            [38, 84, 36, false, true],
            [30, 60, 16, false, false],
            [34, 76, 30, false, false],
            [24, 48, 22, false, false],
          ].map(([idW, cargoW, kgW, urgent, heavy], i) => {
            const y = 60 + i * 21;
            return (
              <g key={i}>
                {heavy ? <rect x="34" y={y - 3} width="204" height="17" rx="4" fill="url(#g-csharp-linq)" opacity=".16" /> : null}
                {urgent ? <rect x="31" y={y - 2} width="2.5" height="15" rx="1.2" fill="url(#g-csharp-linq)" /> : null}
                <rect x="40" y={y + 2} width={idW as number} height="6" rx="3" fill="#ffffff" opacity={urgent ? 0.7 : 0.38} />
                <rect x="82" y={y + 2} width={cargoW as number} height="6" rx="3" fill="#ffffff" opacity=".24" />
                <rect x={196 - (kgW as number)} y={y + 2} width={kgW as number} height="6" rx="3" fill={heavy ? "url(#g-csharp-linq)" : "#ffffff"} opacity={heavy ? 1 : 0.2} />
                <circle cx="224" cy={y + 5} r="3" fill={urgent ? "url(#g-csharp-linq)" : "#ffffff"} opacity={urgent ? 1 : 0.16} />
              </g>
            );
          })}
          {/* category bar chart */}
          <path d="M268 112 H372" stroke="#ffffff" strokeOpacity=".15" />
          {[34, 52, 24, 66, 40].map((h, i) => (
            <rect key={i} x={272 + i * 20} y={112 - h} width="13" height={h} rx="3" fill={i === 3 ? "url(#g-csharp-linq)" : "#ffffff"} opacity={i === 3 ? 1 : 0.22} />
          ))}
          {/* the docked vessel, with a crane over its hold */}
          <path d="M264 150 H372 L358 168 H278 Z" fill="#1b1b1b" stroke="#ffffff" strokeOpacity=".3" strokeLinejoin="round" />
          <rect x="324" y="132" width="26" height="18" rx="3" fill="#ffffff" opacity=".14" />
          <rect x="330" y="137" width="14" height="5" rx="2" fill="url(#g-csharp-linq)" />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={278 + i * 15} y="138" width="12" height="12" rx="2" fill={i === 1 ? "url(#g-csharp-linq)" : "#ffffff"} opacity={i === 1 ? 0.95 : 0.2} />
          ))}
          <path d="M300 138 V120 H320 M320 120 V128" stroke="#ffffff" strokeOpacity=".4" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M258 176 H378" stroke="#ffffff" strokeOpacity=".22" strokeWidth="2" strokeLinecap="round" />
          <path d="M262 184 q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="#ffffff" strokeOpacity=".12" />
        </g>
      )}
      {slug === "csharp-delegates" && (
        <g>
          {/* a proscenium with curtains and a follow-spot, a bank of faders beside it, task bars underneath */}
          <rect x="28" y="26" width="178" height="118" rx="10" fill="#101010" stroke="#ffffff" strokeOpacity=".12" />
          <path d="M28 36 q0 -10 10 -10 H206 V36 q-90 14 -178 0 Z" fill="#ffffff" opacity=".1" />
          <path d="M38 30 q14 40 6 112 H30 V40 Z M196 30 q-14 40 -6 112 H204 V40 Z" fill="#ffffff" opacity=".1" />
          <path d="M104 34 L72 142 H140 Z" fill="url(#g-csharp-delegates)" opacity=".16" />
          <ellipse cx="106" cy="142" rx="38" ry="6" fill="url(#g-csharp-delegates)" opacity=".5" />
          <circle cx="106" cy="104" r="9" fill="url(#g-csharp-delegates)" />
          <path d="M106 113 V132 M106 119 L96 128 M106 119 L116 128" stroke="url(#g-csharp-delegates)" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="104" cy="34" r="6" fill="#151515" stroke="url(#g-csharp-delegates)" strokeWidth="2.5" />
          <circle cx="104" cy="34" r="16" fill="url(#glow-csharp-delegates)" opacity=".55" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={236 + i * 32} y="30" width="8" height="110" rx="4" fill="#ffffff" opacity=".08" />
              <path d={`M${240 + i * 32} 30 V140`} stroke="#ffffff" strokeOpacity=".16" />
              <rect x={229 + i * 32} y={[96, 56, 78, 44][i]} width="22" height="12" rx="4" fill={i === 1 ? "url(#g-csharp-delegates)" : "#1d1d1d"} stroke={i === 1 ? "none" : "url(#g-csharp-delegates)"} strokeOpacity=".7" />
              <circle cx={240 + i * 32} cy="152" r="3" fill="#ffffff" opacity={i % 2 ? 0.5 : 0.2} />
            </g>
          ))}
          {[
            [40, 120, 1],
            [70, 150, 0],
            [118, 170, 0],
          ].map(([x, w, on], i) => (
            <rect key={i} x={x} y={166 + i * 12} width={w} height="6" rx="3" fill={on ? "url(#g-csharp-delegates)" : "#ffffff"} opacity={on ? 0.95 : 0.22} />
          ))}
          <path d="M230 170 H370 M230 182 H300 M230 194 H340" stroke="#ffffff" strokeOpacity=".1" strokeDasharray="3 5" />
        </g>
      )}
      {slug === "rust-basics" && (
        <g>
          {/* the surface, then Halcyon Reef Station as four stepped decks with the first rooms lit */}
          <rect x="0" y="52" width="400" height="168" fill="#ffffff" opacity=".03" />
          <path d="M0 52 q25 -6 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" fill="none" stroke="url(#g-rust-basics)" strokeWidth="2" opacity=".7" />
          <path d="M200 76 V30" stroke="#ffffff" strokeOpacity=".4" strokeWidth="2" strokeLinecap="round" />
          <circle cx="200" cy="28" r="4" fill="url(#g-rust-basics)" />
          <circle cx="200" cy="28" r="11" fill="none" stroke="url(#g-rust-basics)" strokeWidth="1.5" opacity=".5" />
          <circle cx="200" cy="28" r="19" fill="none" stroke="url(#g-rust-basics)" strokeWidth="1" opacity=".25" />
          {[
            [3, 3],
            [4, 3],
            [4, 1],
            [5, 0],
          ].map(([count, lit], row) => {
            const w = (count as number) * 34 + ((count as number) - 1) * 5;
            return Array.from({ length: count as number }).map((_, i) => (
              <rect
                key={`${row}-${i}`}
                x={200 - w / 2 + i * 39}
                y={76 + row * 24}
                width="34"
                height="18"
                rx="5"
                fill={i < (lit as number) ? "url(#g-rust-basics)" : "#ffffff"}
                opacity={i < (lit as number) ? 0.9 : 0.1}
              />
            ));
          })}
          <path d="M0 184 Q60 172 130 182 T260 180 T400 178 V220 H0 Z" fill="#ffffff" opacity=".07" />
          {[40, 62, 352, 372].map((x, i) => (
            <path key={x} d={`M${x} 184 q${i % 2 ? 6 : -6} -12 0 -${24 + (i % 3) * 8}`} fill="none" stroke="url(#g-rust-basics)" strokeWidth="3" strokeLinecap="round" opacity=".45" />
          ))}
          {[
            [92, 150, 3],
            [100, 128, 2],
            [316, 140, 3],
            [322, 112, 2],
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="#ffffff" strokeOpacity=".4" />
          ))}
          <g transform="translate(300 176)">
            <rect x="-13" y="-7" width="26" height="14" rx="7" fill="url(#g-rust-basics)" />
            <rect x="-6" y="-3" width="12" height="5" rx="2.5" fill="#0c0d0b" />
            <path d="M-15 -10 H-6 M6 -10 H15" stroke="#ffffff" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
          </g>
        </g>
      )}
      {slug === "rust-inventory" && (
        <g>
          {/* a night sky: faint stars, one constellation lit by the learner's code, a telescope tracking its brightest star from the dome */}
          {[
            [40, 38, 1.6],
            [88, 72, 1.2],
            [130, 26, 2],
            [206, 40, 1.4],
            [330, 24, 1.8],
            [372, 62, 1.3],
            [362, 118, 2],
            [54, 118, 1.4],
            [304, 124, 1.2],
            [22, 82, 1.1],
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="#ffffff" opacity={0.45} />
          ))}
          <path d="M52 188 Q200 -14 348 188" fill="none" stroke="#ffffff" strokeOpacity=".14" strokeDasharray="3 6" />
          <path d="M112 104 L164 70 L214 88 L262 50 L318 80" fill="none" stroke="url(#g-rust-inventory)" strokeWidth="1.6" opacity=".6" />
          {[
            [112, 104, 4],
            [164, 70, 5],
            [214, 88, 3.5],
            [262, 50, 6.5],
            [318, 80, 4],
          ].map(([cx, cy, r], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={(r as number) * 2.6} fill="url(#glow-rust-inventory)" opacity={0.55} />
              <circle cx={cx} cy={cy} r={r} fill="url(#g-rust-inventory)" />
            </g>
          ))}
          <path d="M206 150 L262 54" stroke="url(#g-rust-inventory)" strokeWidth="1.4" strokeDasharray="4 5" opacity=".75" />
          <path d="M140 196 A60 60 0 0 1 260 196 Z" fill="#1c1d1a" stroke="url(#g-rust-inventory)" strokeWidth="2" />
          <path d="M194 140 L214 142 L222 196 L190 196 Z" fill="#0c0d0b" />
          <path d="M0 196 H400 V220 H0 Z" fill="#ffffff" opacity=".06" />
          {[
            [24, 206, 70],
            [300, 206, 80],
          ].map(([x, y, w], i) => (
            <rect key={i} x={x} y={y} width={w} height="4" rx="2" fill="#ffffff" opacity={0.14} />
          ))}
        </g>
      )}
      {slug === "js-api" && (
        <g>
          {/* a little bike-share map on the left, a request flowing through middleware gates on the right */}
          <rect x="26" y="30" width="150" height="160" rx="12" fill="#101010" stroke="#ffffff" strokeOpacity=".1" />
          <path d="M46 70 L88 52 L124 98 L152 74 M88 52 L70 142 L116 160 L124 98 M70 142 L46 70" fill="none" stroke="#ffffff" strokeOpacity=".16" strokeWidth="2" strokeLinejoin="round" />
          <path d="M46 70 L88 52 L124 98 L116 160" fill="none" stroke="url(#g-js-api)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {[
            [46, 70, 5],
            [88, 52, 6],
            [124, 98, 7],
            [152, 74, 5],
            [70, 142, 5],
            [116, 160, 6],
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill={i === 1 || i === 2 || i === 5 ? "url(#g-js-api)" : "#151515"} stroke="#ffffff" strokeOpacity={i === 1 || i === 2 || i === 5 ? 0 : 0.3} />
          ))}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="196" y={44 + i * 52} width="178" height="38" rx="9" fill="#101010" stroke="#ffffff" strokeOpacity={i === 1 ? 0.35 : 0.12} />
              <path d={`M204 ${63 + i * 52} H366`} stroke="#ffffff" strokeOpacity=".12" strokeDasharray="3 5" />
              {[238, 278, 318].map((x) => (
                <rect key={x} x={x - 3} y={51 + i * 52} width="6" height="24" rx="3" fill={i === 1 ? "url(#g-js-api)" : "#ffffff"} opacity={i === 1 ? 0.9 : 0.18} />
              ))}
              <rect x={i === 1 ? 330 : i === 0 ? 270 : 296} y={56 + i * 52} width="20" height="14" rx="7" fill={i === 1 ? "url(#g-js-api)" : "#ffffff"} opacity={i === 1 ? 1 : 0.35} />
              <rect x="350" y={55 + i * 52} width="18" height="16" rx="5" fill="#0c0d0b" stroke={i === 2 ? "#fb7185" : "url(#g-js-api)"} />
            </g>
          ))}
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
      {slug === "schema-studio" && (
        <g>
          {/* three linked tables (plan 1:N member 1:N booking) above a constraint wall that turns bad rows away */}
          {[
            { x: 30, y: 28, w: 92, h: 76, rows: [38, 30, 44] },
            { x: 154, y: 20, w: 100, h: 92, rows: [34, 50, 40, 28] },
            { x: 286, y: 32, w: 88, h: 76, rows: [36, 44, 30] },
          ].map((c, ci) => (
            <g key={ci}>
              <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="7" fill="#101010" stroke={ci === 1 ? "url(#g-schema-studio)" : "#ffffff"} strokeOpacity={ci === 1 ? 0.9 : 0.14} />
              <rect x={c.x} y={c.y} width={c.w} height="15" rx="7" fill="#ffffff" opacity=".07" />
              <rect x={c.x + 9} y={c.y + 5} width={[26, 38, 30][ci]} height="5" rx="2.5" fill="#ffffff" opacity=".55" />
              {c.rows.map((w, ri) => (
                <g key={ri}>
                  <rect x={c.x + (ri === 0 ? 22 : 10)} y={c.y + 24 + ri * 14} width={w} height="4" rx="2" fill={ri === 0 ? "url(#g-schema-studio)" : "#ffffff"} opacity={ri === 0 ? 1 : 0.2} />
                  {ri === 0 && <circle cx={c.x + 13} cy={c.y + 26} r="3" fill="url(#g-schema-studio)" />}
                </g>
              ))}
            </g>
          ))}
          <path d="M122 54 H154" stroke="url(#g-schema-studio)" strokeWidth="2" />
          <path d="M254 62 H286" stroke="url(#g-schema-studio)" strokeWidth="2" />
          <path d="M129 49 v10 M262 57 v10" stroke="#ffffff" strokeOpacity=".5" strokeWidth="1.5" />
          <path d="M146 48 l8 6 l-8 6 M278 56 l8 6 l-8 6" fill="none" stroke="url(#g-schema-studio)" strokeWidth="1.6" strokeLinejoin="round" />
          {/* the wall */}
          <path d="M200 124 V204" stroke="#ffffff" strokeOpacity=".28" strokeWidth="2" strokeDasharray="5 4" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="40" y={132 + i * 24} width="104" height="14" rx="4" fill="#101010" stroke="#ffffff" strokeOpacity=".14" />
              <rect x="48" y={137 + i * 24} width={[44, 30, 52][i]} height="4" rx="2" fill="#ffffff" opacity={i === 2 ? 0.55 : 0.25} />
              {i < 2 ? (
                <path d={`M152 ${139 + i * 24} H190`} stroke="#ffffff" strokeOpacity=".3" strokeWidth="1.6" strokeDasharray="3 4" />
              ) : (
                <path d={`M152 ${139 + i * 24} H236`} stroke="url(#g-schema-studio)" strokeWidth="2.4" strokeLinecap="round" />
              )}
              {i < 2 && (
                <g stroke="#ffffff" strokeOpacity=".55" strokeWidth="1.8" strokeLinecap="round">
                  <path d={`M192 ${134 + i * 24} l8 10 M200 ${134 + i * 24} l-8 10`} />
                </g>
              )}
            </g>
          ))}
          <rect x="240" y="180" width="132" height="14" rx="4" fill="#101010" stroke="url(#g-schema-studio)" />
          <rect x="248" y="185" width="58" height="4" rx="2" fill="url(#g-schema-studio)" />
          <path d="M352 187 l4 4 l8 -9" fill="none" stroke="url(#g-schema-studio)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="238" cy="187" r="10" fill="url(#glow-schema-studio)" opacity=".7" />
        </g>
      )}
      {slug === "ai-foundations" && (
        <g>
          {/* feature-space plot: three clusters, soft decision regions and a query with its neighbours */}
          <rect x="28" y="26" width="226" height="136" rx="10" fill="#151515" stroke="#ffffff" strokeOpacity=".08" />
          <path d="M28 120 C 90 124, 130 100, 160 26 H38 a10 10 0 0 0 -10 10 Z" fill="#ffffff" opacity=".035" />
          <path d="M160 26 C 176 70, 212 92, 254 98 V36 a10 10 0 0 0 -10 -10 Z" fill="#ffffff" opacity=".06" />
          <path d="M44 148 C 96 132, 150 118, 190 150" fill="none" stroke="#ffffff" strokeOpacity=".16" strokeDasharray="4 5" />
          <path d="M150 62 C 176 82, 206 96, 238 94" fill="none" stroke="#ffffff" strokeOpacity=".16" strokeDasharray="4 5" />
          {[[70, 132], [84, 124], [96, 136], [108, 128], [78, 142], [92, 118], [112, 140], [66, 120], [100, 146], [120, 132]].map(([x, y], i) => (
            <circle key={`a${i}`} cx={x} cy={y} r="3.4" fill="#ffffff" opacity=".3" />
          ))}
          {[[138, 96], [150, 88], [162, 100], [146, 106], [158, 82], [170, 92], [134, 84], [152, 114], [168, 108], [126, 98]].map(([x, y], i) => (
            <circle key={`b${i}`} cx={x} cy={y} r="3.4" fill="url(#g-ai-foundations)" opacity={i === 3 || i === 9 ? 0.45 : 1} />
          ))}
          {[[210, 50], [222, 58], [200, 62], [230, 48], [214, 70], [238, 66], [196, 46], [224, 82]].map(([x, y], i) => (
            <circle key={`c${i}`} cx={x} cy={y} r="3.4" fill="#ffffff" opacity=".62" />
          ))}
          <g stroke="url(#g-ai-foundations)" strokeWidth="1.2" strokeLinecap="round" opacity=".9">
            <path d="M124 108 L138 96" />
            <path d="M124 108 L126 98" />
            <path d="M124 108 L120 132" strokeDasharray="2 3" />
          </g>
          <circle cx="124" cy="108" r="7" fill="#151515" stroke="url(#g-ai-foundations)" strokeWidth="2.4" />
          <circle cx="124" cy="108" r="14" fill="url(#glow-ai-foundations)" opacity=".5" />

          {/* loss curve and precision / recall bars */}
          <rect x="270" y="26" width="102" height="62" rx="8" fill="#151515" stroke="#ffffff" strokeOpacity=".08" />
          <path d="M280 38 C 292 62, 312 72, 332 75 S 356 77, 362 77" fill="none" stroke="url(#g-ai-foundations)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="362" cy="77" r="3.5" fill="url(#g-ai-foundations)" />
          <rect x="270" y="100" width="102" height="62" rx="8" fill="#151515" stroke="#ffffff" strokeOpacity=".08" />
          {[0.9, 0.7, 0.52].map((v, i) => (
            <g key={i}>
              <rect x="282" y={112 + i * 16} width="78" height="6" rx="3" fill="#ffffff" opacity=".1" />
              <rect x="282" y={112 + i * 16} width={78 * v} height="6" rx="3" fill={i === 0 ? "url(#g-ai-foundations)" : "#ffffff"} opacity={i === 0 ? 1 : 0.34} />
            </g>
          ))}

          {/* the belt */}
          <rect x="28" y="176" width="344" height="16" rx="8" fill="#1d1d1d" stroke="#ffffff" strokeOpacity=".08" />
          <path d="M44 184 H356" stroke="#ffffff" strokeOpacity=".18" strokeDasharray="3 9" />
          <circle cx="82" cy="170" r="9" fill="#ffffff" opacity=".34" />
          <path d="M198 178 C 190 176, 188 164, 194 158 C 198 152, 208 152, 210 160 C 214 168, 210 176, 198 178 Z" fill="url(#g-ai-foundations)" />
          <circle cx="318" cy="171" r="7" fill="#ffffff" opacity=".62" />
          <path d="M254 156 V196" stroke="url(#g-ai-foundations)" strokeWidth="1.5" strokeDasharray="3 3" opacity=".8" />
        </g>
      )}
      {slug === "ai-neural" && (
        <g>
          {/* a hand-drawn 7 on a pixel grid, a small network reading it, and the probabilities it gives */}
          <rect x="26" y="34" width="86" height="86" rx="8" fill="#151515" stroke="#ffffff" strokeOpacity=".1" />
          {[
            [0, 0.5], [1, 0.9], [2, 1], [3, 1], [4, 0.8], [5, 0.3],
            [10, 0.2], [14, 0.7], [15, 0.9], [20, 0.5], [21, 0.9], [26, 0.9], [27, 0.5], [32, 0.8], [33, 0.4],
          ].map(([i, v]) => (
            <rect key={i} x={34 + (i % 6) * 12.2} y={42 + Math.floor(i / 6) * 12.2} width="10.4" height="10.4" rx="2" fill="url(#g-ai-neural)" opacity={0.25 + v * 0.75} />
          ))}
          {Array.from({ length: 9 }).map((_, j) => {
            const y = 34 + j * 18;
            const on = j === 2 || j === 4 || j === 5 || j === 7;
            return (
              <g key={j}>
                <path d={`M112 77 L176 ${y}`} stroke={on ? "url(#g-ai-neural)" : "#ffffff"} strokeOpacity={on ? 0.8 : 0.1} strokeWidth="1" />
                {Array.from({ length: 10 }).map((_, k) => (
                  <path key={k} d={`M176 ${y} L292 ${24 + k * 19.5}`} stroke={on && k === 7 ? "url(#g-ai-neural)" : "#ffffff"} strokeOpacity={on && k === 7 ? 0.9 : 0.05} strokeWidth="1" />
                ))}
                <circle cx="176" cy={y} r="5.5" fill={on ? "url(#g-ai-neural)" : "#151515"} stroke={on ? "none" : "#ffffff"} strokeOpacity=".35" />
              </g>
            );
          })}
          {Array.from({ length: 10 }).map((_, k) => (
            <g key={k}>
              <circle cx="292" cy={24 + k * 19.5} r="7" fill={k === 7 ? "url(#g-ai-neural)" : "#151515"} stroke="#ffffff" strokeOpacity={k === 7 ? 0 : 0.3} />
              <rect x="306" y={22 + k * 19.5} width={k === 7 ? 62 : [8, 12, 6, 14, 9, 10, 7, 0, 11, 8][k]} height="4.5" rx="2.2" fill={k === 7 ? "url(#g-ai-neural)" : "#ffffff"} opacity={k === 7 ? 1 : 0.3} />
            </g>
          ))}
          <rect x="26" y="134" width="86" height="58" rx="8" fill="#151515" stroke="#ffffff" strokeOpacity=".1" />
          <path d="M36 144 C 52 168, 70 178, 102 182" fill="none" stroke="url(#g-ai-neural)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="102" cy="182" r="3.5" fill="url(#g-ai-neural)" />
          <circle cx="176" cy="116" r="40" fill="url(#glow-ai-neural)" opacity=".25" />
        </g>
      )}
      {slug === "counting-house" && (
        <g>
          {/* balance beam: debits on one pan, credits on the other, level */}
          <circle cx="200" cy="52" r="46" fill="url(#glow-counting-house)" opacity=".5" />
          <path d="M200 34 V138" stroke="#ffffff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" />
          <path d="M178 140 H222" stroke="#ffffff" strokeOpacity=".22" strokeWidth="5" strokeLinecap="round" />
          <path d="M80 50 H320" stroke="url(#g-counting-house)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="200" cy="50" r="7" fill="#151515" stroke="url(#g-counting-house)" strokeWidth="3" />
          {[88, 312].map((x, k) => (
            <g key={x}>
              <path d={`M${x} 52 L${x - 30} 100 M${x} 52 L${x + 30} 100`} stroke="#ffffff" strokeOpacity=".28" strokeWidth="1.2" />
              <path d={`M${x - 36} 100 H${x + 36} c0 12 -16 18 -36 18 s-36 -6 -36 -18 Z`} fill="#1d1d1d" stroke="#ffffff" strokeOpacity=".16" />
              {[0, 1, 2].map((i) => (
                <rect key={i} x={x - 18 + (i % 2) * 5} y={92 - i * 8} width="30" height="6" rx="3" fill={k === 0 ? "url(#g-counting-house)" : "#ffffff"} opacity={k === 0 ? 1 - i * 0.15 : 0.55 - i * 0.1} />
              ))}
            </g>
          ))}
          {/* ledger rows: every line has a partner */}
          <rect x="28" y="156" width="344" height="46" rx="8" fill="#151515" stroke="#ffffff" strokeOpacity=".08" />
          <path d="M200 160 V198" stroke="#ffffff" strokeOpacity=".12" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="40" y={166 + i * 12} width={[120, 70, 94][i]} height="5" rx="2.5" fill="url(#g-counting-house)" opacity={0.95 - i * 0.2} />
              <rect x={212} y={166 + i * 12} width={[84, 100, 80][i]} height="5" rx="2.5" fill="#ffffff" opacity=".3" />
              <rect x={304} y={166 + i * 12} width={[50, 0, 0][i]} height="5" rx="2.5" fill="#ffffff" opacity=".18" />
            </g>
          ))}
          <path d="M338 182 l6 6 l12 -14" fill="none" stroke="url(#g-counting-house)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
}
