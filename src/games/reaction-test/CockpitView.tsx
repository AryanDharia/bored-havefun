import React, { useMemo } from 'react';
import type { SequencePhase, RoundAttempt } from './reactionEngine';

interface CockpitViewProps {
  phase: SequencePhase;
  activeLightsCount: number; // 0 to 5
  currentMs: number | null;
  roundNumber: number;
  totalRounds: number;
  playerIndex: 0 | 1;
  playerName: string;
  bestMs: number | null;
  isPersonalBest: boolean;
  isShaking: boolean;
  history: RoundAttempt[];
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  phase,
  activeLightsCount,
  currentMs,
  roundNumber,
  totalRounds,
  playerIndex,
  playerName,
  bestMs,
  isPersonalBest,
  isShaking,
  history,
  onPointerDown
}) => {
  // Format reaction milliseconds and seconds for prominent display
  const formattedTime = useMemo(() => {
    if (currentMs === null || currentMs <= 0) return null;
    const sec = (currentMs / 1000).toFixed(3);
    return { sec, ms: currentMs };
  }, [currentMs]);

  // Compute RPM rev LEDs based on the sequence phase
  const rpmLEDs = useMemo(() => {
    const total = 12;
    let litCount = 0;
    if (phase === 'LIGHTS_ON') {
      litCount = Math.min(total, activeLightsCount * 2);
    } else if (phase === 'HOLDING') {
      litCount = total;
    } else if (phase === 'LIGHTS_OUT') {
      litCount = total;
    } else if (phase === 'RESULT') {
      litCount = 6;
    }
    return Array.from({ length: total }, (_, i) => ({
      index: i,
      isLit: i < litCount,
      color: i < 4 ? '#22c55e' : i < 8 ? '#eab308' : '#ef4444'
    }));
  }, [phase, activeLightsCount]);

  return (
    <div
      onPointerDown={onPointerDown}
      className={`relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[620px] bg-[#06080e] rounded-3xl overflow-hidden border border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none touch-none cursor-pointer group ${
        isShaking ? 'anim-shake' : ''
      }`}
      style={{ touchAction: 'none' }}
      aria-label="First-Person Racing Cockpit Interactive Area"
    >
      {/* ======================================================== */}
      {/* 1. MASTER FIRST-PERSON RACING VIEW (Theme-Matched SVG)    */}
      {/* ======================================================== */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 620"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Night Grand Prix Sky Gradient (Matches PlayBreak Theme) */}
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#04060b" />
            <stop offset="35%" stopColor="#090d18" />
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#162238" />
          </linearGradient>

          {/* Distant Atmospheric Night Haze */}
          <linearGradient id="horizonHaze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0" />
            <stop offset="100%" stopColor="#1e293b" stopOpacity="0.75" />
          </linearGradient>

          {/* Night Circuit Asphalt Track Gradient */}
          <linearGradient id="asphaltGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e2636" />
            <stop offset="30%" stopColor="#121824" />
            <stop offset="100%" stopColor="#080b12" />
          </linearGradient>

          {/* Car Exterior PlayBreak Papaya Orange Bodywork (Sidepods) */}
          <linearGradient id="sidepodOrangeL" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="65%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>
          <linearGradient id="sidepodOrangeR" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="65%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>

          {/* Matte Leather / Carbon Dashboard Cowl */}
          <linearGradient id="dashCowlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#161c26" />
            <stop offset="35%" stopColor="#0f141e" />
            <stop offset="100%" stopColor="#06080d" />
          </linearGradient>

          {/* Steering Wheel Outer Grip (Ergonomic Black Alcantara / Leather) */}
          <linearGradient id="wheelRimGrip" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2d3748" />
            <stop offset="20%" stopColor="#1a202c" />
            <stop offset="70%" stopColor="#0d1117" />
            <stop offset="100%" stopColor="#020408" />
          </linearGradient>

          {/* Center Hub CNC Aluminum Plate */}
          <radialGradient id="wheelHubCenter" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#1a2233" />
            <stop offset="70%" stopColor="#0c111a" />
            <stop offset="100%" stopColor="#04060a" />
          </radialGradient>

          {/* High-Intensity F1 Gantry Red Light Glow */}
          <radialGradient id="gantryLitGlow" cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#fca5a5" />
            <stop offset="60%" stopColor="#ef4444" />
            <stop offset="85%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#450a0a" />
          </radialGradient>

          {/* Unlit Dark Optic Glass Lens */}
          <radialGradient id="gantryDarkLens" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="85%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#05070c" />
          </radialGradient>

          {/* Blur filter for soft atmosphere */}
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* -------------------------------------------------------- */}
        {/* A. WINDSHIELD: NIGHT GP SKY, CIRCUIT SCENERY & ROAD       */}
        {/* -------------------------------------------------------- */}
        {/* 1. Night Grand Prix Sky (Matching Dark Website Theme) */}
        <rect x="0" y="0" width="1000" height="260" fill="url(#skyGrad)" />

        {/* Subtle Starry Night Points */}
        {[
          { cx: 80, cy: 35, r: 1 },
          { cx: 160, cy: 75, r: 1.2 },
          { cx: 240, cy: 45, r: 0.8 },
          { cx: 310, cy: 90, r: 1 },
          { cx: 700, cy: 40, r: 1 },
          { cx: 780, cy: 80, r: 1.2 },
          { cx: 850, cy: 35, r: 0.8 },
          { cx: 920, cy: 65, r: 1 }
        ].map((star, idx) => (
          <circle key={idx} cx={star.cx} cy={star.cy} r={star.r} fill="#ffffff" opacity="0.6" />
        ))}

        {/* Soft Distant Stadium Track Lighting Haze */}
        <ellipse cx="500" cy="245" rx="350" ry="40" fill="#1e293b" opacity="0.35" filter="url(#softGlow)" />

        {/* Distant Horizon Blue Scenery Haze */}
        <rect x="0" y="200" width="1000" height="60" fill="url(#horizonHaze)" />

        {/* 2. Distant Circuit Hills Horizon Line (Vanishing at y=245) */}
        {/* Left Dark Circuit Hills */}
        <path
          d="M 0 255
             Q 50 170 120 185
             Q 190 180 260 205
             Q 340 200 410 228
             Q 450 234 465 245
             L 465 260
             L 0 260
             Z"
          fill="#0c1220"
          opacity="0.95"
        />
        <path
          d="M 0 260
             Q 60 195 140 205
             Q 220 200 300 220
             Q 380 226 465 245
             L 465 260
             L 0 260
             Z"
          fill="#070a12"
          opacity="0.9"
        />

        {/* Right Dark Circuit Hills */}
        <path
          d="M 1000 255
             Q 950 170 880 185
             Q 810 180 740 205
             Q 660 200 590 228
             Q 550 234 535 245
             L 535 260
             L 1000 260
             Z"
          fill="#0c1220"
          opacity="0.95"
        />
        <path
          d="M 1000 260
             Q 940 195 860 205
             Q 780 200 700 220
             Q 620 226 535 245
             L 535 260
             L 1000 260
             Z"
          fill="#070a12"
          opacity="0.9"
        />

        {/* 3. Real Circuit Asphalt Road Surface (Converging to Vanishing Point 500, 245) */}
        {/* Dark Verge / Runoff Area */}
        <polygon points="465,245 535,245 1000,580 0,580" fill="#090d16" />

        {/* The Track Road Surface */}
        <polygon points="468,245 532,245 920,580 80,580" fill="url(#asphaltGrad)" />

        {/* Dark Rubbered Racing Line */}
        <polygon points="480,245 520,245 820,580 180,580" fill="#05070c" opacity="0.45" />

        {/* Left Armco Metal Guardrail Safety Barrier */}
        <polygon points="438,245 468,245 80,580 30,580" fill="#1e293b" />
        <line x1="452" y1="245" x2="55" y2="580" stroke="#475569" strokeWidth="2.5" />
        <line x1="446" y1="245" x2="42" y2="580" stroke="#0f172a" strokeWidth="2" />

        {/* Left Red-and-White FIA Rumble Strip Kerb */}
        <polygon points="463,245 468,245 80,580 62,580" fill="#dc2626" />
        <polygon points="464,245 467,245 78,580 64,580" stroke="#ffffff" strokeWidth="2" strokeDasharray="16,14" />

        {/* Right Armco Metal Guardrail Safety Barrier */}
        <polygon points="532,245 562,245 970,580 920,580" fill="#1e293b" />
        <line x1="548" y1="245" x2="945" y2="580" stroke="#475569" strokeWidth="2.5" />
        <line x1="554" y1="245" x2="958" y2="580" stroke="#0f172a" strokeWidth="2" />

        {/* Right Red-and-White FIA Rumble Strip Kerb */}
        <polygon points="532,245 537,245 938,580 920,580" fill="#dc2626" />
        <polygon points="533,245 536,245 936,580 922,580" stroke="#ffffff" strokeWidth="2" strokeDasharray="16,14" />

        {/* White Track Edge Marking Lines */}
        <line x1="468" y1="245" x2="80" y2="580" stroke="#ffffff" strokeWidth="3" opacity="0.75" />
        <line x1="532" y1="245" x2="920" y2="580" stroke="#ffffff" strokeWidth="3" opacity="0.75" />

        {/* Dashed Center Line with Realistic Perspective Shortening */}
        <line x1="500" y1="245" x2="500" y2="580" stroke="#f8fafc" strokeWidth="3" strokeDasharray="24,20" opacity="0.55" />

        {/* -------------------------------------------------------- */}
        {/* B. OVERHEAD F1 STARTING LIGHTS GANTRY                    */}
        {/* -------------------------------------------------------- */}
        {/* Gantry Horizontal Suspension Truss */}
        <rect x="220" y="68" width="560" height="14" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="2" />
        <line x1="220" y1="75" x2="780" y2="75" stroke="#64748b" strokeWidth="1" strokeDasharray="8,8" />
        {/* Support Vertical Truss Cables */}
        <line x1="260" y1="0" x2="260" y2="68" stroke="#475569" strokeWidth="2" />
        <line x1="740" y1="0" x2="740" y2="68" stroke="#475569" strokeWidth="2" />

        {/* 5 Distinct F1 Starting Light Pods */}
        {[0, 1, 2, 3, 4].map((i) => {
          const podX = 332 + i * 72;
          const isLit = (phase === 'LIGHTS_ON' && i < activeLightsCount) || phase === 'HOLDING';

          return (
            <g key={i}>
              {/* Vertical Pod Casing (Matte Black Powder-Coated Metal Housing) */}
              <rect
                x={podX}
                y="84"
                width="44"
                height="80"
                rx="6"
                fill="#0a0e17"
                stroke="#334155"
                strokeWidth="2.5"
                filter="drop-shadow(0 4px 10px rgba(0,0,0,0.85))"
              />

              {/* Top Sun Visor Hood */}
              <path
                d={`M ${podX + 4} 107 Q ${podX + 22} 96 ${podX + 40} 107`}
                fill="none"
                stroke="#1e293b"
                strokeWidth="4"
              />
              {/* Bottom Sun Visor Hood */}
              <path
                d={`M ${podX + 4} 144 Q ${podX + 22} 132 ${podX + 40} 144`}
                fill="none"
                stroke="#1e293b"
                strokeWidth="4"
              />

              {/* Top Status Lens (Dark Glass) */}
              <circle
                cx={podX + 22}
                cy="110"
                r="11"
                fill="url(#gantryDarkLens)"
                stroke="#1e293b"
                strokeWidth="1.5"
              />

              {/* Bottom Main Starting Light Lens */}
              <circle
                cx={podX + 22}
                cy="146"
                r="15"
                fill={isLit ? 'url(#gantryLitGlow)' : 'url(#gantryDarkLens)'}
                stroke={isLit ? '#f87171' : '#1e293b'}
                strokeWidth="2"
              />

              {/* Clean Bulb Optics Radial Glow on Active Red Starting Lights (No Cone) */}
              {isLit && (
                <>
                  <circle cx={podX + 22} cy="146" r="28" fill="#ef4444" opacity="0.45" filter="url(#softGlow)" />
                  <circle cx={podX + 22} cy="146" r="7" fill="#ffffff" opacity="0.95" />
                </>
              )}
            </g>
          );
        })}

        {/* -------------------------------------------------------- */}
        {/* C. CAR INTERIOR & COCKPIT (Clean Driver's-Eye Perspective) */}
        {/* -------------------------------------------------------- */}
        {/* Left Sidepod Curve (PlayBreak Orange Bodywork) */}
        <path
          d="M 0 370 Q 110 350 220 395 L 160 520 L 0 520 Z"
          fill="url(#sidepodOrangeL)"
          stroke="#ea580c"
          strokeWidth="1.5"
        />
        {/* Left Sidepod Top Aerodynamic Specular Highlight */}
        <path
          d="M 0 371 Q 110 351 215 396"
          fill="none"
          stroke="#fed7aa"
          strokeWidth="1.5"
          opacity="0.6"
        />

        {/* Right Sidepod Curve (PlayBreak Orange Bodywork) */}
        <path
          d="M 1000 370 Q 890 350 780 395 L 840 520 L 1000 520 Z"
          fill="url(#sidepodOrangeR)"
          stroke="#ea580c"
          strokeWidth="1.5"
        />
        {/* Right Sidepod Top Aerodynamic Specular Highlight */}
        <path
          d="M 1000 371 Q 890 351 785 396"
          fill="none"
          stroke="#fed7aa"
          strokeWidth="1.5"
          opacity="0.6"
        />

        {/* Smooth, Clean Dashboard Cowl (Curving Across Base of Windshield) */}
        <path
          d="M 0 440
             Q 250 385 410 380
             L 590 380
             Q 750 385 1000 440
             L 1000 620
             L 0 620
             Z"
          fill="url(#dashCowlGrad)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Subtle Dashboard Double-Stitch Seam */}
        <path
          d="M 90 435 Q 280 395 430 390 L 570 390 Q 720 395 910 435"
          fill="none"
          stroke="#1e293b"
          strokeWidth="1.5"
          strokeDasharray="5,4"
        />

        {/* -------------------------------------------------------- */}
        {/* D. STEERING WHEEL (Lower Middle - Formula / GT Wheel)    */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(500, 485)">
          {/* Natural Wheel Ambient Drop Shadow on Dashboard */}
          <ellipse cx="0" cy="25" rx="200" ry="85" fill="#000000" opacity="0.8" filter="url(#softGlow)" />

          {/* Steering Wheel Outer Grip Rim (Realistic Proportions & Contours) */}
          <path
            d="M -155 -90
               C -140 -120, -85 -125, -30 -125
               L 30 -125
               C 85 -125, 140 -120, 155 -90
               C 175 -50, 175 40, 150 70
               C 125 90, 75 90, 25 90
               L -25 90
               C -75 90, -125 90, -150 70
               C -175 40, -175 -50, -155 -90
               Z"
            fill="none"
            stroke="url(#wheelRimGrip)"
            strokeWidth="32"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Wheel Grip Ergonomic Inner Bevel */}
          <path
            d="M -148 -86
               C -135 -112, -80 -117, -28 -117
               L 28 -117
               C 80 -117, 135 -112, 148 -86
               C 165 -48, 165 36, 142 64
               C 118 82, 70 82, 22 82
               L -22 82
               C -70 82, -118 82, -142 64
               C -165 36, -165 -48, -148 -86
               Z"
            fill="none"
            stroke="#1e293b"
            strokeWidth="2"
            opacity="0.6"
          />

          {/* Steering Wheel Center Spoke Hub Plate */}
          <path
            d="M -125 -75
               C -105 -90, -55 -95, 0 -95
               C 55 -95, 105 -90, 125 -75
               L 120 45
               C 105 70, 65 78, 0 78
               C -65 78, -105 70, -120 45
               Z"
            fill="url(#wheelHubCenter)"
            stroke="#1e293b"
            strokeWidth="3"
          />

          {/* 4 Clean, Recognizable Racing Buttons */}
          {/* Top-Left: Cobalt Blue */}
          <circle cx="-92" cy="-48" r="9.5" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2.5" />
          <circle cx="-92" cy="-48" r="4" fill="#93c5fd" />

          {/* Bottom-Left: Racing Yellow */}
          <circle cx="-92" cy="8" r="9.5" fill="#eab308" stroke="#ca8a04" strokeWidth="2.5" />
          <circle cx="-92" cy="8" r="4" fill="#fef08a" />

          {/* Top-Right: Vibrant Red */}
          <circle cx="92" cy="-48" r="9.5" fill="#dc2626" stroke="#b91c1c" strokeWidth="2.5" />
          <circle cx="92" cy="-48" r="4" fill="#fca5a5" />

          {/* Bottom-Right: Emerald Green */}
          <circle cx="92" cy="8" r="9.5" fill="#16a34a" stroke="#15803d" strokeWidth="2.5" />
          <circle cx="92" cy="8" r="4" fill="#86efac" />

          {/* 4 Bottom Rotary Dial Switches */}
          {[-42, -14, 14, 42].map((dialX, idx) => (
            <g key={idx}>
              <circle cx={dialX} cy="48" r="6.5" fill="#0f172a" stroke="#475569" strokeWidth="2" />
              <line x1={dialX} y1="44" x2={dialX} y2="48" stroke="#94a3b8" strokeWidth="1.5" />
            </g>
          ))}

          {/* Top Rev LED Bar (Above Center Screen) */}
          <rect x="-65" y="-110" width="130" height="11" rx="4" fill="#080c14" stroke="#1e293b" strokeWidth="1.5" />
          {rpmLEDs.map((led) => {
            const ledX = -58 + led.index * 10.5;
            return (
              <circle
                key={led.index}
                cx={ledX}
                cy="-104"
                r="3.2"
                fill={led.isLit ? led.color : '#131b26'}
                stroke={led.isLit ? '#ffffff' : '#080c14'}
                strokeWidth="0.8"
                filter={led.isLit ? 'drop-shadow(0 0 3px rgba(255,255,255,0.85))' : undefined}
              />
            );
          })}

          {/* ------------------------------------------------------ */}
          {/* INTEGRATED DIGITAL SCREEN (Built into Steering Wheel)  */}
          {/* ------------------------------------------------------ */}
          {/* CNC Anodized Aluminum Display Bezel */}
          <rect
            x="-80"
            y="-86"
            width="160"
            height="108"
            rx="7"
            fill="#060910"
            stroke="#334155"
            strokeWidth="2.5"
          />

          {/* Anti-Glare Dark Sapphire Glass Display Face */}
          <rect
            x="-76"
            y="-82"
            width="152"
            height="100"
            rx="4"
            fill="#080c16"
            stroke="#1e293b"
            strokeWidth="1"
          />

          {/* Sub-Brand Text / Status Bar Top */}
          <line x1="-76" y1="-64" x2="76" y2="-64" stroke="#1e293b" strokeWidth="1" />
          <text
            x="-70"
            y="-70"
            fill="#38bdf8"
            fontSize="8.5"
            fontWeight="bold"
            fontFamily="ui-monospace, monospace"
          >
            ● {playerName.toUpperCase()}
          </text>
          <text
            x="0"
            y="-70"
            fill="#fbbf24"
            fontSize="8.5"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            R {roundNumber}/{totalRounds}
          </text>
          <text
            x="70"
            y="-70"
            fill="#94a3b8"
            fontSize="8.5"
            fontWeight="bold"
            textAnchor="end"
            fontFamily="ui-monospace, monospace"
          >
            {bestMs ? `PB ${bestMs}ms` : 'PB --'}
          </text>

          {/* Central Prominent Digital Metrics on Steering Wheel LCD */}
          {phase === 'IDLE' && (
            <g>
              <text
                x="0"
                y="-30"
                fill="#fb923c"
                fontSize="13"
                fontWeight="900"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                TAP TO START
              </text>
              <text
                x="0"
                y="-12"
                fill="#94a3b8"
                fontSize="8.5"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                READY FOR 5 RED LIGHTS
              </text>
            </g>
          )}

          {phase === 'STAGING' && (
            <g>
              <text
                x="0"
                y="-30"
                fill="#38bdf8"
                fontSize="13"
                fontWeight="900"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                STAGING...
              </text>
              <text
                x="0"
                y="-12"
                fill="#94a3b8"
                fontSize="8.5"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                GANTRY INITIALIZING
              </text>
            </g>
          )}

          {phase === 'LIGHTS_ON' && (
            <g>
              {/* 5 Indicator Dots on LCD Display */}
              {[-36, -18, 0, 18, 36].map((dotX, idx) => {
                const lit = idx < activeLightsCount;
                return (
                  <circle
                    key={idx}
                    cx={dotX}
                    cy="-34"
                    r="5"
                    fill={lit ? '#ef4444' : '#1e293b'}
                    stroke={lit ? '#fca5a5' : '#0f172a'}
                    strokeWidth="1"
                    filter={lit ? 'drop-shadow(0 0 3px rgba(239,68,68,0.9))' : undefined}
                  />
                );
              })}
              <text
                x="0"
                y="-12"
                fill="#f87171"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                HOLD STILL • DO NOT JUMP
              </text>
            </g>
          )}

          {phase === 'HOLDING' && (
            <g>
              <text
                x="0"
                y="-30"
                fill="#f43f5e"
                fontSize="13"
                fontWeight="900"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                READY... HOLD!
              </text>
              <text
                x="0"
                y="-12"
                fill="#fda4af"
                fontSize="8.5"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                WATCH FOR LIGHTS OUT
              </text>
            </g>
          )}

          {phase === 'LIGHTS_OUT' && (
            <g>
              <text
                x="0"
                y="-25"
                fill="#34d399"
                fontSize="16"
                fontWeight="900"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
                filter="drop-shadow(0 0 6px rgba(52,211,153,0.9))"
              >
                ⚡ REACT NOW!
              </text>
              <text
                x="0"
                y="-6"
                fill="#a7f3d0"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                TAP SCREEN NOW!
              </text>
            </g>
          )}

          {phase === 'RESULT' && formattedTime && (
            <g>
              <text
                x="0"
                y="-46"
                fill="#94a3b8"
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                REACTION TIME
              </text>
              {/* Prominent Large Millisecond Display (e.g. 247 ms) */}
              <text
                x="-12"
                y="-16"
                fill="#34d399"
                fontSize="29"
                fontWeight="900"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
                filter="drop-shadow(0 0 8px rgba(52,211,153,0.6))"
              >
                {formattedTime.ms}
              </text>
              <text
                x="44"
                y="-24"
                fill="#34d399"
                fontSize="11"
                fontWeight="900"
                fontFamily="ui-monospace, monospace"
              >
                MS
              </text>
              <text
                x="0"
                y="0"
                fill="#e2e8f0"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                ({formattedTime.sec} SEC)
              </text>
            </g>
          )}

          {phase === 'FALSE_START' && (
            <g>
              <text
                x="0"
                y="-32"
                fill="#ef4444"
                fontSize="13"
                fontWeight="900"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                ⚠️ JUMP START!
              </text>
              <text
                x="0"
                y="-12"
                fill="#fca5a5"
                fontSize="8.5"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                EARLY TAP (PENALTY)
              </text>
            </g>
          )}

          {/* LCD Bottom Status Line */}
          <line x1="-76" y1="8" x2="76" y2="8" stroke="#1e293b" strokeWidth="1" />
          <text
            x="-70"
            y="17"
            fill={isPersonalBest ? '#fbbf24' : '#64748b'}
            fontSize="8"
            fontWeight={isPersonalBest ? '900' : 'bold'}
            fontFamily="ui-monospace, monospace"
          >
            {isPersonalBest ? '★ NEW BEST!' : phase === 'RESULT' ? 'TAP TO ADVANCE' : '1000Hz SENSOR'}
          </text>
          <text
            x="70"
            y="17"
            fill="#64748b"
            fontSize="8"
            textAnchor="end"
            fontFamily="ui-monospace, monospace"
          >
            ACTIVE
          </text>
        </g>
      </svg>

      {/* ======================================================== */}
      {/* 2. TOP TELEMETRY HUD BAR (Clean Minimalist Overlay)      */}
      {/* ======================================================== */}
      <div className="absolute top-2 sm:top-3 inset-x-0 flex items-center justify-between px-2.5 sm:px-6 pointer-events-none z-20">
        {/* Player Badge */}
        <div className="bg-black/80 backdrop-blur-md border border-slate-800 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-white shadow-xl">
          <span className={`w-2 h-2 rounded-full ${playerIndex === 0 ? 'bg-orange-500' : 'bg-cyan-400'} animate-pulse`} />
          <span className="font-mono text-slate-200">{playerName}</span>
        </div>

        {/* Dynamic Center Prompt */}
        <div className="hidden sm:flex items-center gap-1.5 bg-black/85 backdrop-blur-md border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-mono shadow-xl">
          {phase === 'IDLE' && <span className="text-orange-400 font-bold">TAP SCREEN TO STAGE ROUND</span>}
          {phase === 'STAGING' && <span className="text-sky-300">GANTRY LIGHTS COMMENCING...</span>}
          {phase === 'LIGHTS_ON' && <span className="text-red-400 font-bold">SEQUENTIAL RED LIGHTS ON</span>}
          {phase === 'HOLDING' && <span className="text-yellow-400 font-black animate-pulse">WATCH FOR LIGHTS OUT!</span>}
          {phase === 'LIGHTS_OUT' && <span className="text-emerald-400 font-black anim-pop">TAP SCREEN NOW!</span>}
          {phase === 'RESULT' && <span className="text-emerald-300 font-bold">ROUND SAVED • TAP TO ADVANCE</span>}
          {phase === 'FALSE_START' && <span className="text-red-400 font-bold">JUMP START • TAP TO RETRY</span>}
        </div>

        {/* 5 Attempt Indicators */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {Array.from({ length: totalRounds }, (_, i) => {
            const attempt = history[i];
            let dotBg = 'bg-black/60 border-slate-800 text-slate-500';
            let dotText = String(i + 1);

            if (attempt) {
              if (attempt.isFalseStart) {
                dotBg = 'bg-red-950/80 border-red-500 text-red-300';
                dotText = '✕';
              } else {
                dotBg = 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold';
                dotText = '✓';
              }
            } else if (i === roundNumber - 1) {
              dotBg = 'bg-orange-500/25 border-orange-500 text-orange-300 animate-pulse font-bold';
            }

            return (
              <div
                key={i}
                className={`w-5 h-5 sm:w-7 sm:h-7 rounded-lg border flex items-center justify-center font-mono text-[9px] sm:text-xs shadow ${dotBg}`}
              >
                {dotText}
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. FALSE START NOTIFICATION OVERLAY                      */}
      {/* ======================================================== */}
      {phase === 'FALSE_START' && (
        <div className="absolute inset-0 bg-red-950/35 backdrop-blur-[2px] pointer-events-none z-30 anim-pop flex items-center justify-center px-4">
          <div className="bg-black/95 border-2 border-red-500 rounded-2xl p-5 sm:p-7 text-center max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.9)]">
            <div className="text-3xl sm:text-4xl mb-2">⚠️</div>
            <div className="text-xl sm:text-2xl font-black text-red-500 font-mono tracking-wider">
              FALSE START!
            </div>
            <p className="text-xs text-slate-300 mt-1.5 mb-4 leading-relaxed">
              You jumped before all five lights switched OFF. This round counts as failed.
            </p>
            <span className="text-[11px] font-mono font-bold text-orange-400 bg-orange-500/15 px-3.5 py-1.5 rounded-full border border-orange-500/30">
              TAP SCREEN TO PROCEED
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
