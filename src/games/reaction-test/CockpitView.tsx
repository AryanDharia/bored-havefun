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
      className={`relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[620px] bg-[#070b12] rounded-3xl overflow-hidden border border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none touch-none cursor-pointer group ${
        isShaking ? 'anim-shake' : ''
      }`}
      style={{ touchAction: 'none' }}
      aria-label="Racing Cockpit Interactive Area"
    >
      {/* ======================================================== */}
      {/* 1. MASTER COCKPIT & TRACK VIEW (Clean Racing SVG Engine) */}
      {/* ======================================================== */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 650"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Natural Daytime / Twilight Circuit Sky */}
          <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="45%" stopColor="#3b82f6" />
            <stop offset="75%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>

          {/* Smooth Circuit Asphalt Track */}
          <linearGradient id="trackAsphalt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="35%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Dashboard Cowl Surface Texture */}
          <linearGradient id="dashCowlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#242b38" />
            <stop offset="30%" stopColor="#161c26" />
            <stop offset="100%" stopColor="#0a0e14" />
          </linearGradient>

          {/* Steering Wheel Outer Grip Rim */}
          <linearGradient id="wheelRimGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="30%" stopColor="#1e293b" />
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Steering Wheel Center Plate Hub */}
          <radialGradient id="wheelHubGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="65%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#060910" />
          </radialGradient>

          {/* Driver Racing Glove Shading (White / Light Silver Alcantara) */}
          <linearGradient id="gloveShadingL" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#e2e8f0" />
            <stop offset="70%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="gloveShadingR" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#e2e8f0" />
            <stop offset="70%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* High-Intensity Gantry Red Light Glow */}
          <radialGradient id="gantryRedLit" cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#fca5a5" />
            <stop offset="55%" stopColor="#ef4444" />
            <stop offset="85%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#450a0a" />
          </radialGradient>

          {/* Unlit Gantry Dark Optic Lens */}
          <radialGradient id="gantryLensDark" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="45%" stopColor="#1e293b" />
            <stop offset="85%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          {/* Gantry Downward Glow Flare */}
          <linearGradient id="gantryGlowCone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(239,68,68,0.5)" />
            <stop offset="50%" stopColor="rgba(239,68,68,0.12)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* -------------------------------------------------------- */}
        {/* A. OPEN WINDSHIELD: SKY, SCENERY & RACING CIRCUIT TRACK  */}
        {/* -------------------------------------------------------- */}
        {/* Sky */}
        <rect x="0" y="0" width="1000" height="340" fill="url(#skyGradient)" />

        {/* Distant Horizon Forest & Tree Line */}
        {/* Left Tree Line */}
        <path
          d="M 0 290 Q 60 210 140 230 Q 220 220 310 250 Q 380 255 450 280 L 450 300 L 0 300 Z"
          fill="#14532d"
          opacity="0.95"
        />
        <path
          d="M 0 295 Q 70 230 150 245 Q 230 240 320 265 L 450 300 L 0 300 Z"
          fill="#064e3b"
          opacity="0.8"
        />

        {/* Right Tree Line */}
        <path
          d="M 1000 290 Q 940 210 860 230 Q 780 220 690 250 Q 620 255 550 280 L 550 300 L 1000 300 Z"
          fill="#14532d"
          opacity="0.95"
        />
        <path
          d="M 1000 295 Q 930 230 850 245 Q 770 240 680 265 L 550 300 L 1000 300 Z"
          fill="#064e3b"
          opacity="0.8"
        />

        {/* The Racing Track Surface (Converging Perspective to Vanishing Point 500, 275) */}
        <polygon points="475,275 525,275 920,580 80,580" fill="url(#trackAsphalt)" />

        {/* Trackside Armco Safety Barriers (Left & Right Guardrails) */}
        {/* Left Barrier */}
        <polygon points="435,275 475,275 80,580 20,580" fill="#475569" />
        <line x1="455" y1="275" x2="50" y2="580" stroke="#64748b" strokeWidth="2.5" />
        {/* Left Red & White Racing Kerb */}
        <polygon points="468,275 475,275 80,580 65,580" fill="#dc2626" />
        <polygon points="469,275 474,275 78,580 68,580" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="14,14" />

        {/* Right Barrier */}
        <polygon points="525,275 565,275 980,580 920,580" fill="#475569" />
        <line x1="545" y1="275" x2="950" y2="580" stroke="#64748b" strokeWidth="2.5" />
        {/* Right Red & White Racing Kerb */}
        <polygon points="525,275 532,275 935,580 920,580" fill="#dc2626" />
        <polygon points="526,275 531,275 932,580 922,580" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="14,14" />

        {/* Track Center White Dashed Perspective Markings */}
        <line x1="500" y1="275" x2="500" y2="580" stroke="#f8fafc" strokeWidth="3" strokeDasharray="28,26" opacity="0.6" />

        {/* -------------------------------------------------------- */}
        {/* B. OVERHEAD 5-POD RACING STARTING LIGHT GANTRY           */}
        {/* -------------------------------------------------------- */}
        {/* Clean Gantry Suspension Truss Bar */}
        <rect x="230" y="38" width="540" height="14" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="2" />
        <line x1="230" y1="45" x2="770" y2="45" stroke="#475569" strokeWidth="1" strokeDasharray="8,8" />

        {/* 5 Distinct Gantry Light Pods */}
        {[0, 1, 2, 3, 4].map((i) => {
          const podX = 330 + i * 72;
          const isLit = (phase === 'LIGHTS_ON' && i < activeLightsCount) || phase === 'HOLDING';

          return (
            <g key={i}>
              {/* Downward Light Cone Glow when Active */}
              {isLit && (
                <polygon
                  points={`${podX + 22},115 ${podX - 45},360 ${podX + 89},360`}
                  fill="url(#gantryGlowCone)"
                />
              )}

              {/* Vertical Pod Housing (Metallic Black Box with Hood) */}
              <rect
                x={podX}
                y="55"
                width="44"
                height="82"
                rx="6"
                fill="#090d14"
                stroke="#334155"
                strokeWidth="2.5"
                filter="drop-shadow(0 4px 8px rgba(0,0,0,0.8))"
              />

              {/* Cylindrical Sunshade Hoods */}
              <path
                d={`M ${podX + 5} 78 Q ${podX + 22} 66 ${podX + 39} 78`}
                fill="none"
                stroke="#1e293b"
                strokeWidth="4"
              />
              <path
                d={`M ${podX + 5} 115 Q ${podX + 22} 103 ${podX + 39} 115`}
                fill="none"
                stroke="#1e293b"
                strokeWidth="4"
              />

              {/* Top Indicator Lens (Unlit Dark Glass) */}
              <circle
                cx={podX + 22}
                cy="82"
                r="11"
                fill="url(#gantryLensDark)"
                stroke="#1e293b"
                strokeWidth="1.5"
              />

              {/* Bottom Main Starting Light Bulb */}
              <circle
                cx={podX + 22}
                cy="118"
                r="15"
                fill={isLit ? 'url(#gantryRedLit)' : 'url(#gantryLensDark)'}
                stroke={isLit ? '#f87171' : '#1e293b'}
                strokeWidth="2"
              />

              {/* Multi-Layer Radial Bloom on Active Starting Lights */}
              {isLit && (
                <>
                  <circle cx={podX + 22} cy="118" r="28" fill="#ef4444" opacity="0.4" filter="blur(5px)" />
                  <circle cx={podX + 22} cy="118" r="7" fill="#ffffff" opacity="0.9" />
                </>
              )}
            </g>
          );
        })}

        {/* -------------------------------------------------------- */}
        {/* C. CAR INTERIOR: CLEAN DASHBOARD COWL & FENDERS (BAC Mono) */}
        {/* -------------------------------------------------------- */}
        {/* Left Aerodynamic Front Fender / Mirror Mount */}
        <path
          d="M 0 380 Q 120 365 240 405 L 180 520 L 0 520 Z"
          fill="#cbd5e1"
          stroke="#94a3b8"
          strokeWidth="1.5"
        />
        {/* Left Aerodynamic Wing Mirror */}
        <g transform="translate(15, 345)">
          <rect x="0" y="0" width="38" height="52" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <rect x="4" y="4" width="30" height="44" rx="4" fill="#64748b" opacity="0.8" />
          <line x1="20" y1="52" x2="35" y2="72" stroke="#1e293b" strokeWidth="4" />
        </g>

        {/* Right Aerodynamic Front Fender / Mirror Mount */}
        <path
          d="M 1000 380 Q 880 365 760 405 L 820 520 L 1000 520 Z"
          fill="#cbd5e1"
          stroke="#94a3b8"
          strokeWidth="1.5"
        />
        {/* Right Aerodynamic Wing Mirror */}
        <g transform="translate(947, 345)">
          <rect x="0" y="0" width="38" height="52" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <rect x="4" y="4" width="30" height="44" rx="4" fill="#64748b" opacity="0.8" />
          <line x1="18" y1="52" x2="3" y2="72" stroke="#1e293b" strokeWidth="4" />
        </g>

        {/* Main Dashboard Cowl (Low, Elegant Horizontal Curve) */}
        <path
          d="M 0 460
             Q 250 400 420 395
             L 580 395
             Q 750 400 1000 460
             L 1000 650
             L 0 650
             Z"
          fill="url(#dashCowlGrad)"
          stroke="#334155"
          strokeWidth="2.5"
        />

        {/* Cockpit Inner Stitching Seam Lines */}
        <path
          d="M 120 455 Q 300 415 440 408 L 560 408 Q 700 415 880 455"
          fill="none"
          stroke="#475569"
          strokeWidth="1.5"
          strokeDasharray="5,4"
        />

        {/* -------------------------------------------------------- */}
        {/* D. STEERING WHEEL & GLOVED HANDS (Reference Matching)    */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(500, 520)">
          {/* Wheel Drop Shadow */}
          <ellipse cx="0" cy="20" rx="220" ry="100" fill="#000000" opacity="0.85" filter="blur(16px)" />

          {/* Steering Wheel Outer Grip Rim (Realistic Proportions) */}
          {/* Flat-top / Ergonomic Curved Racing Wheel Rim */}
          <path
            d="M -165 -95
               C -150 -125, -90 -130, -35 -130
               L 35 -130
               C 90 -130, 150 -125, 165 -95
               C 185 -55, 185 35, 160 70
               C 135 95, 80 95, 30 95
               L -30 95
               C -80 95, -135 95, -160 70
               C -185 35, -185 -55, -165 -95
               Z"
            fill="none"
            stroke="url(#wheelRimGrad)"
            strokeWidth="36"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Wheel Center Hub Spoke Plate */}
          <path
            d="M -130 -80
               C -110 -95, -60 -100, 0 -100
               C 60 -100, 110 -95, 130 -80
               L 125 50
               C 110 75, 70 85, 0 85
               C -70 85, -110 75, -125 50
               Z"
            fill="url(#wheelHubGrad)"
            stroke="#1e293b"
            strokeWidth="3"
          />

          {/* Left Buttons: Blue / Cyan (Top) & Yellow (Bottom) */}
          <circle cx="-95" cy="-55" r="10.5" fill="#0284c7" stroke="#082f49" strokeWidth="2.5" />
          <circle cx="-95" cy="-55" r="4.5" fill="#7dd3fc" />
          <circle cx="-95" cy="5" r="10.5" fill="#eab308" stroke="#713f12" strokeWidth="2.5" />
          <circle cx="-95" cy="5" r="4.5" fill="#fef08a" />

          {/* Right Buttons: Red (Top) & Lime Green (Bottom) */}
          <circle cx="95" cy="-55" r="10.5" fill="#dc2626" stroke="#450a0a" strokeWidth="2.5" />
          <circle cx="95" cy="-55" r="4.5" fill="#fca5a5" />
          <circle cx="95" cy="5" r="10.5" fill="#16a34a" stroke="#052e16" strokeWidth="2.5" />
          <circle cx="95" cy="5" r="4.5" fill="#86efac" />

          {/* Bottom Row of 4 Rotary / Toggle Buttons */}
          {[-45, -15, 15, 45].map((dialX, idx) => (
            <circle
              key={idx}
              cx={dialX}
              cy="52"
              r="7.5"
              fill="#0f172a"
              stroke="#475569"
              strokeWidth="2"
            />
          ))}

          {/* Top Shift LED RPM Light Bar */}
          <rect x="-70" y="-116" width="140" height="12" rx="4" fill="#090d14" stroke="#1e293b" strokeWidth="1.5" />
          {rpmLEDs.map((led) => {
            const ledX = -62 + led.index * 11.2;
            return (
              <circle
                key={led.index}
                cx={ledX}
                cy="-110"
                r="3.5"
                fill={led.isLit ? led.color : '#141a24'}
                stroke={led.isLit ? '#ffffff' : '#090d14'}
                strokeWidth="0.8"
                filter={led.isLit ? 'drop-shadow(0 0 3px rgba(255,255,255,0.8))' : undefined}
              />
            );
          })}

          {/* CNC Anodized Aluminum Center Bezel for Digital Display */}
          <rect
            x="-82"
            y="-92"
            width="164"
            height="116"
            rx="8"
            fill="#070a10"
            stroke="#334155"
            strokeWidth="3"
          />

          {/* Anti-Reflective LCD Glass Face */}
          <rect
            x="-77"
            y="-87"
            width="154"
            height="106"
            rx="5"
            fill="#090d16"
            stroke="#1e293b"
            strokeWidth="1"
          />

          {/* DRIVER GLOVED HANDS (Natural Grip at 9 and 3 o'clock as in Reference Image) */}
          {/* Left Gloved Hand */}
          <g>
            {/* Forearm & Wrist extending into cockpit */}
            <path
              d="M -230 140 L -185 45 C -175 15, -165 -15, -150 -35 L -120 -35 L -140 65 L -175 140 Z"
              fill="url(#gloveShadingL)"
              stroke="#64748b"
              strokeWidth="2"
            />
            {/* Thumb wrapping over front rim */}
            <path
              d="M -145 -30 C -135 -40, -118 -38, -115 -25 C -112 -12, -125 -5, -140 -5 Z"
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeWidth="2"
            />
            {/* Fingers gripping behind rim */}
            <path
              d="M -175 0 C -170 30, -155 55, -135 60 C -125 50, -130 35, -145 20 Z"
              fill="#cbd5e1"
              stroke="#64748b"
              strokeWidth="2"
            />
          </g>

          {/* Right Gloved Hand */}
          <g>
            {/* Forearm & Wrist extending into cockpit */}
            <path
              d="M 230 140 L 185 45 C 175 15, 165 -15, 150 -35 L 120 -35 L 140 65 L 175 140 Z"
              fill="url(#gloveShadingR)"
              stroke="#64748b"
              strokeWidth="2"
            />
            {/* Thumb wrapping over front rim */}
            <path
              d="M 145 -30 C 135 -40, 118 -38, 115 -25 C 112 -12, 125 -5, 140 -5 Z"
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeWidth="2"
            />
            {/* Fingers gripping behind rim */}
            <path
              d="M 175 0 C 170 30, 155 55, 135 60 C 125 50, 130 35, 145 20 Z"
              fill="#cbd5e1"
              stroke="#64748b"
              strokeWidth="2"
            />
          </g>
        </g>
      </svg>

      {/* ======================================================== */}
      {/* 2. DIGITAL INSTRUMENT TELEMETRY DISPLAY (HTML Embedded)  */}
      {/* ======================================================== */}
      <div className="absolute inset-x-0 bottom-4 sm:bottom-7 flex flex-col items-center justify-center pointer-events-none z-10">
        <div className="w-[210px] sm:w-[245px] h-[108px] sm:h-[120px] rounded-md bg-[#070b14]/95 border border-slate-700/80 p-2 sm:p-2.5 flex flex-col justify-between shadow-inner text-white font-mono select-none">
          {/* Top Telemetry Header */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-400 border-b border-slate-800/80 pb-1">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{playerName}</span>
            </span>
            <span className="text-amber-400 font-black">
              R {roundNumber}/{totalRounds}
            </span>
            <span className="text-slate-400">
              {bestMs ? `PB ${bestMs}ms` : 'PB --'}
            </span>
          </div>

          {/* Central High-Impact Telemetry Metric */}
          <div className="flex flex-col items-center justify-center py-0.5">
            {phase === 'IDLE' && (
              <div className="flex flex-col items-center">
                <span className="text-xs sm:text-sm font-black text-orange-400 tracking-wider animate-pulse">
                  TAP TO STAGE
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">READY FOR 5 RED LIGHTS</span>
              </div>
            )}

            {phase === 'STAGING' && (
              <div className="flex flex-col items-center">
                <span className="text-xs sm:text-sm font-bold text-sky-400 tracking-widest">
                  STAGING...
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">WATCH OVERHEAD GANTRY</span>
              </div>
            )}

            {phase === 'LIGHTS_ON' && (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <span
                      key={num}
                      className={`text-base sm:text-lg font-black transition-colors ${
                        num <= activeLightsCount
                          ? 'text-red-500 scale-125 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]'
                          : 'text-slate-700'
                      }`}
                    >
                      ●
                    </span>
                  ))}
                </div>
                <span className="text-[9px] text-red-400 font-bold mt-0.5">
                  HOLD STILL
                </span>
              </div>
            )}

            {phase === 'HOLDING' && (
              <div className="flex flex-col items-center">
                <span className="text-xs sm:text-sm font-black text-rose-500 tracking-widest animate-pulse">
                  READY...
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">HOLD FOR LIGHTS OUT</span>
              </div>
            )}

            {phase === 'LIGHTS_OUT' && (
              <div className="flex flex-col items-center anim-pop">
                <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.95)]">
                  ⚡ GO! REACT NOW!
                </span>
              </div>
            )}

            {phase === 'RESULT' && formattedTime && (
              <div className="flex flex-col items-center leading-none anim-pop">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                  REACTION TIME
                </span>
                <div className="flex items-baseline gap-1 text-white">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight font-mono text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
                    {formattedTime.ms}
                  </span>
                  <span className="text-xs font-black text-emerald-400">MS</span>
                </div>
                <span className="text-[9px] text-slate-300 font-bold mt-0.5">
                  ({formattedTime.sec} SEC)
                </span>
              </div>
            )}

            {phase === 'FALSE_START' && (
              <div className="flex flex-col items-center leading-tight anim-shake">
                <span className="text-sm sm:text-base font-black text-red-500 tracking-wider">
                  ⚠️ JUMP START!
                </span>
                <span className="text-[9px] text-red-300 font-semibold mt-0.5">EARLY TAP (PENALTY)</span>
              </div>
            )}
          </div>

          {/* Bottom Telemetry Status Line */}
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 border-t border-slate-800/80 pt-0.5">
            {isPersonalBest ? (
              <span className="text-amber-400 font-bold tracking-wider animate-bounce">
                ★ NEW RECORD!
              </span>
            ) : (
              <span className="text-slate-400 truncate">
                {phase === 'RESULT' ? 'TAP TO ADVANCE' : 'COCKPIT SENSOR ACTIVE'}
              </span>
            )}
            <span className="text-[9px] text-slate-500 font-mono">1000Hz</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. TOP TELEMETRY HUD OVERLAY                             */}
      {/* ======================================================== */}
      <div className="absolute top-3 inset-x-0 flex items-center justify-between px-3 sm:px-6 pointer-events-none z-20">
        {/* Player Badge */}
        <div className="bg-black/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold text-white shadow-xl">
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
        <div className="flex items-center gap-1.5">
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
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg border flex items-center justify-center font-mono text-[10px] sm:text-xs shadow ${dotBg}`}
              >
                {dotText}
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. FALSE START NOTIFICATION OVERLAY                      */}
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
