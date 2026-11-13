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
  // Format reaction seconds & milliseconds
  const formattedTime = useMemo(() => {
    if (currentMs === null || currentMs <= 0) return null;
    const sec = (currentMs / 1000).toFixed(3);
    return { sec, ms: currentMs };
  }, [currentMs]);

  // Compute RPM lights illumination based on phase
  const rpmLEDs = useMemo(() => {
    const total = 15;
    let litCount = 0;
    if (phase === 'LIGHTS_ON') {
      litCount = Math.min(total, activeLightsCount * 3);
    } else if (phase === 'HOLDING') {
      litCount = total;
    } else if (phase === 'LIGHTS_OUT') {
      litCount = total;
    } else if (phase === 'RESULT') {
      litCount = 8;
    }
    return Array.from({ length: total }, (_, i) => ({
      index: i,
      isLit: i < litCount,
      color: i < 5 ? '#22c55e' : i < 10 ? '#eab308' : i < 13 ? '#ef4444' : '#3b82f6'
    }));
  }, [phase, activeLightsCount]);

  return (
    <div
      onPointerDown={onPointerDown}
      className={`relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[580px] bg-[#07090e] rounded-3xl overflow-hidden border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] select-none touch-none cursor-pointer group ${
        isShaking ? 'anim-shake' : ''
      }`}
      style={{ touchAction: 'none' }}
      aria-label="Reaction Test Cockpit Canvas"
    >
      {/* 1. NIGHT SKY & TRACK CIRCUIT BACKGROUND (SVG) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 625"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Deep Night Sky Gradient */}
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#04060b" />
            <stop offset="55%" stopColor="#090d16" />
            <stop offset="100%" stopColor="#141c2c" />
          </linearGradient>

          {/* Track Asphalt Gradient */}
          <linearGradient id="trackGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0c10" />
            <stop offset="40%" stopColor="#141720" />
            <stop offset="100%" stopColor="#1a1e2a" />
          </linearGradient>

          {/* Gantry Glow Beam */}
          <radialGradient id="lightBeamGlow" cx="50%" cy="0%" r="90%">
            <stop offset="0%" stopColor="rgba(239,68,68,0.45)" />
            <stop offset="40%" stopColor="rgba(239,68,68,0.12)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Active Red Light Glow */}
          <radialGradient id="redBulbLit" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#fca5a5" />
            <stop offset="70%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>

          {/* Inactive Dark Lens */}
          <radialGradient id="lensOff" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#2a3040" />
            <stop offset="70%" stopColor="#10141c" />
            <stop offset="100%" stopColor="#07090e" />
          </radialGradient>

          {/* Carbon Fiber Pattern for Cockpit & Steering Wheel */}
          <pattern id="carbonWeave" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#13161f" />
            <rect width="3" height="3" fill="#1c202d" />
            <rect x="3" y="3" width="3" height="3" fill="#1c202d" />
          </pattern>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="1000" height="350" fill="url(#skyGrad)" />

        {/* Distant Track Floodlight Towers & Beams */}
        {/* Left Floodlight */}
        <line x1="120" y1="210" x2="120" y2="130" stroke="#334155" strokeWidth="3" />
        <line x1="110" y1="130" x2="130" y2="130" stroke="#64748b" strokeWidth="4" />
        <polygon points="120,130 0,330 250,330" fill="rgba(248,250,252,0.03)" />
        <circle cx="120" cy="130" r="5" fill="#f8fafc" opacity="0.8" />

        {/* Right Floodlight */}
        <line x1="880" y1="210" x2="880" y2="130" stroke="#334155" strokeWidth="3" />
        <line x1="870" y1="130" x2="890" y2="130" stroke="#64748b" strokeWidth="4" />
        <polygon points="880,130 750,330 1000,330" fill="rgba(248,250,252,0.03)" />
        <circle cx="880" cy="130" r="5" fill="#f8fafc" opacity="0.8" />

        {/* Circuit Track (Converging Perspective) */}
        <polygon points="460,210 540,210 920,625 80,625" fill="url(#trackGrad)" />

        {/* Track Kerbs (Red & White Rumble Strips) */}
        {/* Left Kerb */}
        <polygon points="450,210 460,210 80,625 40,625" fill="#b91c1c" />
        <polygon points="452,210 458,210 70,625 45,625" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="12,12" />

        {/* Right Kerb */}
        <polygon points="540,210 550,210 960,625 920,625" fill="#b91c1c" />
        <polygon points="542,210 548,210 955,625 930,625" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="12,12" />

        {/* Center Grid Road Markings */}
        <line x1="500" y1="210" x2="500" y2="625" stroke="#ffffff" strokeWidth="3" strokeDasharray="28,24" opacity="0.45" />
        <line x1="480" y1="210" x2="260" y2="625" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="16,20" opacity="0.25" />
        <line x1="520" y1="210" x2="740" y2="625" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="16,20" opacity="0.25" />

        {/* Starting Grid Line Box */}
        <line x1="320" y1="360" x2="680" y2="360" stroke="#f8fafc" strokeWidth="3" opacity="0.4" />
        <rect x="360" y="360" width="12" height="35" fill="#f8fafc" opacity="0.3" />
        <rect x="628" y="360" width="12" height="35" fill="#f8fafc" opacity="0.3" />

        {/* Competitor Car Ahead on Grid (Atmospheric depth) */}
        <g transform="translate(320, 240) scale(0.65)" opacity="0.85">
          {/* Rear tires */}
          <rect x="-38" y="24" width="16" height="34" rx="3" fill="#090b0e" />
          <rect x="62" y="24" width="16" height="34" rx="3" fill="#090b0e" />
          {/* Rear Wing */}
          <rect x="-35" y="10" width="110" height="12" rx="2" fill="#dc2626" />
          <rect x="-38" y="4" width="8" height="24" rx="1" fill="#1e293b" />
          <rect x="70" y="4" width="8" height="24" rx="1" fill="#1e293b" />
          {/* Main Body Tub */}
          <polygon points="20,16 6,55 34,55" fill="#ef4444" />
          {/* Rear Rain Light */}
          <circle cx="20" cy="50" r="3.5" fill="#ef4444" opacity="0.9" />
        </g>

        {/* 2. OVERHEAD STARTING GANTRY */}
        {/* Truss crossbeam structure */}
        <rect x="180" y="58" width="640" height="18" fill="#1a1e28" stroke="#334155" strokeWidth="2" />
        <line x1="180" y1="67" x2="820" y2="67" stroke="#475569" strokeWidth="1" strokeDasharray="8,8" />

        {/* Support gantries down to edge */}
        <line x1="190" y1="76" x2="160" y2="210" stroke="#1e293b" strokeWidth="4" />
        <line x1="810" y1="76" x2="840" y2="210" stroke="#1e293b" strokeWidth="4" />

        {/* 5 Gantry Light Pods */}
        {[0, 1, 2, 3, 4].map((i) => {
          const podX = 330 + i * 85;
          const isLit = (phase === 'LIGHTS_ON' && i < activeLightsCount) || phase === 'HOLDING';

          return (
            <g key={i}>
              {/* Downward light cone beam when lit */}
              {isLit && (
                <polygon
                  points={`${podX + 22},120 ${podX - 50},380 ${podX + 94},380`}
                  fill="url(#lightBeamGlow)"
                  opacity="0.85"
                />
              )}

              {/* Pod Black Metallic Housing */}
              <rect
                x={podX}
                y="74"
                width="44"
                height="82"
                rx="6"
                fill="#0f1219"
                stroke="#334155"
                strokeWidth="2.5"
              />

              {/* Upper Cowl Hood */}
              <path
                d={`M ${podX + 6} 92 Q ${podX + 22} 80 ${podX + 38} 92`}
                fill="none"
                stroke="#1e2433"
                strokeWidth="4"
              />

              {/* Upper Secondary Ring (Dark Accent) */}
              <circle cx={podX + 22} cy="96" r="11" fill="url(#lensOff)" stroke="#1e293b" strokeWidth="1.5" />

              {/* Lower Main Starting Light */}
              <circle
                cx={podX + 22}
                cy="128"
                r="15"
                fill={isLit ? 'url(#redBulbLit)' : 'url(#lensOff)'}
                stroke={isLit ? '#ef4444' : '#1e293b'}
                strokeWidth="2"
              />

              {/* Glow Bloom on Active Light */}
              {isLit && (
                <>
                  <circle cx={podX + 22} cy="128" r="24" fill="#ef4444" opacity="0.35" filter="blur(4px)" />
                  <circle cx={podX + 22} cy="128" r="4.5" fill="#ffffff" opacity="0.9" />
                </>
              )}
            </g>
          );
        })}

        {/* 3. COCKPIT INTERIOR & HALO STRUCTURE */}
        {/* Left & Right Front Tires */}
        {/* Left Wheel */}
        <g transform="translate(10, 270)">
          <rect x="0" y="0" width="85" height="240" rx="14" fill="#0a0c10" stroke="#1f2430" strokeWidth="3" />
          <line x1="42" y1="10" x2="42" y2="230" stroke="#252a37" strokeWidth="3" strokeDasharray="14,14" />
          {/* Suspension wishbone */}
          <line x1="85" y1="90" x2="230" y2="180" stroke="#1e2430" strokeWidth="8" />
          <line x1="85" y1="150" x2="220" y2="200" stroke="#1e2430" strokeWidth="8" />
        </g>

        {/* Right Wheel */}
        <g transform="translate(905, 270)">
          <rect x="0" y="0" width="85" height="240" rx="14" fill="#0a0c10" stroke="#1f2430" strokeWidth="3" />
          <line x1="42" y1="10" x2="42" y2="230" stroke="#252a37" strokeWidth="3" strokeDasharray="14,14" />
          {/* Suspension wishbone */}
          <line x1="0" y1="90" x2="-145" y2="180" stroke="#1e2430" strokeWidth="8" />
          <line x1="0" y1="150" x2="-135" y2="200" stroke="#1e2430" strokeWidth="8" />
        </g>

        {/* Front Nose Aerodynamic Cone */}
        <polygon points="500,280 435,510 565,510" fill="#0b0f16" stroke="#192030" strokeWidth="2" />
        {/* Livery Center Stripe (PlayBreak Racing Green / Orange Accent) */}
        <polygon points="500,280 488,510 512,510" fill="#10b981" opacity="0.75" />

        {/* Cockpit Halo Center Strut & Arch */}
        <path
          d="M 500 290 L 500 440"
          stroke="#0f131a"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <path
          d="M 500 290 L 500 440"
          stroke="#1e2533"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Halo Overhead Arch */}
        <path
          d="M 190 280 Q 500 220 810 280"
          fill="none"
          stroke="#0f131a"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <path
          d="M 190 280 Q 500 220 810 280"
          fill="none"
          stroke="#1e2533"
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* Side Cockpit Surround Walls */}
        <path
          d="M 0 460 Q 250 430 310 625 L 0 625 Z"
          fill="url(#carbonWeave)"
          stroke="#334155"
          strokeWidth="2"
        />
        <path
          d="M 1000 460 Q 750 430 690 625 L 1000 625 Z"
          fill="url(#carbonWeave)"
          stroke="#334155"
          strokeWidth="2"
        />

        {/* Cockpit Trim Accent Lines */}
        <path d="M 0 470 Q 240 442 300 625" fill="none" stroke="#10b981" strokeWidth="3" opacity="0.8" />
        <path d="M 1000 470 Q 760 442 700 625" fill="none" stroke="#10b981" strokeWidth="3" opacity="0.8" />

        {/* 4. FORMULA STEERING WHEEL (Foreground Focus) */}
        <g transform="translate(500, 520)">
          {/* Wheel Carbon Main Body */}
          <path
            d="M -195 -45 
               C -195 -95, -125 -105, -70 -105 
               L 70 -105 
               C 125 -105, 195 -95, 195 -45 
               L 205 60 
               C 205 110, 160 120, 100 120 
               L -100 120 
               C -160 120, -205 110, -205 60 
               Z"
            fill="url(#carbonWeave)"
            stroke="#1e2433"
            strokeWidth="5"
          />

          {/* Ergonomic Alcantara Left & Right Grip Zones */}
          <path
            d="M -210 -40 C -225 10, -225 60, -200 85 C -185 95, -170 80, -175 40 C -180 0, -175 -30, -185 -45 Z"
            fill="#090b10"
            stroke="#293042"
            strokeWidth="2.5"
          />
          <path
            d="M 210 -40 C 225 10, 225 60, 200 85 C 185 95, 170 80, 175 40 C 180 0, 175 -30, 185 -45 Z"
            fill="#090b10"
            stroke="#293042"
            strokeWidth="2.5"
          />

          {/* Rotary dials & buttons on wheel */}
          {/* Left Controls */}
          <circle cx="-135" cy="-35" r="13" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2.5" />
          <circle cx="-135" cy="-35" r="5" fill="#fca5a5" />
          <circle cx="-145" cy="20" r="10" fill="#eab308" stroke="#713f12" strokeWidth="2" />
          <circle cx="-110" cy="55" r="11" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2" />

          {/* Right Controls */}
          <circle cx="135" cy="-35" r="13" fill="#10b981" stroke="#064e3b" strokeWidth="2.5" />
          <circle cx="135" cy="-35" r="5" fill="#6ee7b7" />
          <circle cx="145" cy="20" r="10" fill="#f97316" stroke="#7c2d12" strokeWidth="2" />
          <circle cx="110" cy="55" r="11" fill="#a855f7" stroke="#581c87" strokeWidth="2" />

          {/* Top Shift Lights (RPM LED Array) */}
          <rect x="-115" y="-98" width="230" height="15" rx="5" fill="#080a0f" stroke="#1f293d" strokeWidth="1.5" />
          {rpmLEDs.map((led) => {
            const ledX = -105 + led.index * 15;
            return (
              <circle
                key={led.index}
                cx={ledX}
                cy="-90"
                r="4.2"
                fill={led.isLit ? led.color : '#161b26'}
                stroke={led.isLit ? '#ffffff' : '#0d1117'}
                strokeWidth="0.8"
                filter={led.isLit ? 'drop-shadow(0 0 3px rgba(255,255,255,0.7))' : undefined}
              />
            );
          })}

          {/* Digital Telemetry LCD Bezel */}
          <rect
            x="-105"
            y="-72"
            width="210"
            height="115"
            rx="8"
            fill="#05070a"
            stroke="#334155"
            strokeWidth="3"
          />

          {/* LCD Screen Inner Glass Glow */}
          <rect
            x="-100"
            y="-67"
            width="200"
            height="105"
            rx="5"
            fill="#090d14"
          />
        </g>
      </svg>

      {/* 2. DIGITAL INSTRUMENT TELEMETRY DISPLAY (HTML Layer inside Steering Wheel) */}
      <div className="absolute inset-x-0 bottom-4 sm:bottom-6 flex flex-col items-center justify-center pointer-events-none z-10">
        <div className="w-[240px] sm:w-[280px] h-[105px] sm:h-[120px] rounded-lg bg-[#070b12]/95 border border-slate-700/80 p-2 sm:p-2.5 flex flex-col justify-between shadow-inner text-white font-mono">
          {/* Top Telemetry Header */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-400 border-b border-slate-800/80 pb-1">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{playerName}</span>
            </span>
            <span className="text-amber-400 font-black">
              R {roundNumber}/{totalRounds}
            </span>
            <span className="text-slate-400">
              {bestMs ? `PB ${bestMs}ms` : 'PB --'}
            </span>
          </div>

          {/* Center Main Metric (Large Crisp Digital Readout) */}
          <div className="flex flex-col items-center justify-center py-0.5">
            {phase === 'IDLE' && (
              <div className="flex flex-col items-center">
                <span className="text-xs sm:text-sm font-black text-orange-400 tracking-wider animate-pulse">
                  TAP TO STAGE
                </span>
                <span className="text-[10px] text-slate-400">WAIT FOR 5 RED LIGHTS</span>
              </div>
            )}

            {phase === 'STAGING' && (
              <div className="flex flex-col items-center">
                <span className="text-xs sm:text-sm font-bold text-sky-400 tracking-widest">
                  STAGING...
                </span>
                <span className="text-[9px] text-slate-400">WATCH THE GANTRY</span>
              </div>
            )}

            {phase === 'LIGHTS_ON' && (
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((num) => (
                  <span
                    key={num}
                    className={`text-base sm:text-lg font-black transition-colors ${
                      num <= activeLightsCount ? 'text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-slate-700'
                    }`}
                  >
                    ●
                  </span>
                ))}
              </div>
            )}

            {phase === 'HOLDING' && (
              <div className="flex flex-col items-center">
                <span className="text-xs sm:text-sm font-black text-rose-500 tracking-widest animate-pulse">
                  READY...
                </span>
                <span className="text-[9px] text-slate-400">HOLD FOR LIGHTS OUT</span>
              </div>
            )}

            {phase === 'LIGHTS_OUT' && (
              <div className="flex flex-col items-center">
                <span className="text-base sm:text-xl font-black text-emerald-400 tracking-tight anim-pop drop-shadow-[0_0_12px_rgba(16,185,129,0.9)]">
                  ⚡ GO! REACT NOW!
                </span>
              </div>
            )}

            {phase === 'RESULT' && formattedTime && (
              <div className="flex flex-col items-center leading-none anim-pop">
                <div className="flex items-baseline gap-1 text-white">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight font-mono text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                    {formattedTime.sec}
                  </span>
                  <span className="text-xs font-bold text-slate-400">SEC</span>
                </div>
                <div className="text-[11px] font-bold text-slate-300 mt-0.5">
                  {formattedTime.ms} <span className="text-[9px] text-slate-400">MS</span>
                </div>
              </div>
            )}

            {phase === 'FALSE_START' && (
              <div className="flex flex-col items-center leading-tight anim-shake">
                <span className="text-sm sm:text-base font-black text-red-500 tracking-wider">
                  ⚠️ JUMP START!
                </span>
                <span className="text-[9px] text-red-300 font-semibold">TAPPED BEFORE LIGHTS OUT</span>
              </div>
            )}
          </div>

          {/* Bottom Telemetry Status Line */}
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 border-t border-slate-800/80 pt-0.5">
            {isPersonalBest ? (
              <span className="text-amber-400 font-bold tracking-wider animate-bounce">
                ★ NEW PERSONAL BEST!
              </span>
            ) : (
              <span className="text-slate-400 truncate">
                {phase === 'RESULT' ? 'TAP FOR NEXT ROUND' : 'FULL COCKPIT SENSOR ACTIVE'}
              </span>
            )}
            <span className="text-[9px] text-slate-500 font-mono">1000Hz POLLING</span>
          </div>
        </div>
      </div>

      {/* 3. TOP NOTIFICATION BANNER OVERLAY */}
      <div className="absolute top-3 inset-x-0 flex items-center justify-between px-4 sm:px-6 pointer-events-none z-20">
        {/* Left: Player ID */}
        <div className="bg-black/75 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold text-white shadow-lg">
          <span className={`w-2 h-2 rounded-full ${playerIndex === 0 ? 'bg-orange-500' : 'bg-cyan-400'} animate-pulse`} />
          <span className="font-mono text-slate-200">{playerName}</span>
        </div>

        {/* Center: Interactive Prompt Pill */}
        <div className="hidden sm:flex items-center gap-1.5 bg-black/80 backdrop-blur-md border border-slate-800 px-3 py-1 rounded-xl text-[11px] font-mono text-slate-300">
          {phase === 'IDLE' && <span>TAP ANYWHERE IN COCKPIT TO STAGE</span>}
          {phase === 'LIGHTS_ON' && <span className="text-red-400 font-bold">GANTRY SEQUENCING...</span>}
          {phase === 'HOLDING' && <span className="text-yellow-400 font-bold">WAIT FOR LIGHTS OUT!</span>}
          {phase === 'LIGHTS_OUT' && <span className="text-emerald-400 font-bold">TAP NOW!</span>}
          {phase === 'RESULT' && <span className="text-emerald-300">ROUND SAVED • TAP TO ADVANCE</span>}
          {phase === 'FALSE_START' && <span className="text-red-400 font-bold">ROUND FAILED • TAP TO RETRY</span>}
        </div>

        {/* Right: Round Counter Badges */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalRounds }, (_, i) => {
            const attempt = history[i];
            let dotBg = 'bg-slate-800 border-slate-700';
            let dotText = String(i + 1);

            if (attempt) {
              if (attempt.isFalseStart) {
                dotBg = 'bg-red-950 border-red-500 text-red-300';
                dotText = '✕';
              } else {
                dotBg = 'bg-emerald-950 border-emerald-500 text-emerald-300';
                dotText = '✓';
              }
            } else if (i === roundNumber - 1) {
              dotBg = 'bg-orange-500/20 border-orange-500 text-orange-300 animate-pulse';
            }

            return (
              <div
                key={i}
                className={`w-6 h-6 rounded-lg border flex items-center justify-center font-mono text-[10px] font-bold ${dotBg}`}
              >
                {dotText}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. FALSE START RED ALERT FLASH */}
      {phase === 'FALSE_START' && (
        <div className="absolute inset-0 bg-red-600/25 pointer-events-none z-30 anim-pop flex items-center justify-center">
          <div className="bg-black/90 border-2 border-red-500 rounded-2xl p-4 sm:p-6 text-center max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.8)]">
            <div className="text-3xl sm:text-4xl mb-2">⚠️</div>
            <div className="text-xl sm:text-2xl font-black text-red-500 font-mono tracking-wider">
              FALSE START!
            </div>
            <p className="text-xs text-slate-300 mt-1 mb-3">
              You tapped before all starting lights switched OFF. Round marked as failed.
            </p>
            <span className="text-[10px] font-mono font-bold text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
              TAP COCKPIT TO PROCEED
            </span>
          </div>
        </div>
      )}

      {/* 5. LIGHTS OUT WHITE BURST FLASH EFFECT */}
      {phase === 'LIGHTS_OUT' && (
        <div className="absolute inset-0 bg-white/10 pointer-events-none z-20 transition-opacity duration-150 opacity-0" />
      )}
    </div>
  );
};
