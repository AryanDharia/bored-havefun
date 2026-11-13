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
    const total = 15;
    let litCount = 0;
    if (phase === 'LIGHTS_ON') {
      litCount = Math.min(total, activeLightsCount * 3);
    } else if (phase === 'HOLDING') {
      litCount = total;
    } else if (phase === 'LIGHTS_OUT') {
      litCount = total;
    } else if (phase === 'RESULT') {
      litCount = 9;
    }
    return Array.from({ length: total }, (_, i) => ({
      index: i,
      isLit: i < litCount,
      color: i < 5 ? '#22c55e' : i < 10 ? '#eab308' : i < 13 ? '#ef4444' : '#3b82f6',
      glow: i < 5 ? 'rgba(34,197,94,0.8)' : i < 10 ? 'rgba(234,179,8,0.8)' : i < 13 ? 'rgba(239,68,68,0.8)' : 'rgba(59,130,246,0.8)'
    }));
  }, [phase, activeLightsCount]);

  return (
    <div
      onPointerDown={onPointerDown}
      className={`relative w-full aspect-[9/12] sm:aspect-[4/3] md:aspect-[16/10] max-h-[640px] bg-[#030509] rounded-3xl overflow-hidden border border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none touch-none cursor-pointer group ${
        isShaking ? 'anim-shake' : ''
      }`}
      style={{ touchAction: 'none' }}
      aria-label="Formula Racing Cockpit Interactive Area"
    >
      {/* ======================================================== */}
      {/* 1. MASTER COCKPIT & TRACK PERSPECTIVE SVG ENGINE */}
      {/* ======================================================== */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 750"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Deep Night Grand Prix Sky */}
          <linearGradient id="gpSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#020306" />
            <stop offset="45%" stopColor="#070a12" />
            <stop offset="100%" stopColor="#0f1624" />
          </linearGradient>

          {/* Horizon Night Atmosphere Fog */}
          <linearGradient id="horizonFog" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f1624" stopOpacity="0" />
            <stop offset="60%" stopColor="#1a253a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0d111a" />
          </linearGradient>

          {/* Asphalt Circuit Surface with Rubbering Line */}
          <linearGradient id="circuitAsphalt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b0e14" />
            <stop offset="30%" stopColor="#121620" />
            <stop offset="70%" stopColor="#181d2a" />
            <stop offset="100%" stopColor="#1c2230" />
          </linearGradient>

          {/* Halo Titanium Cylinder Shading */}
          <linearGradient id="haloTubeHoriz" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="25%" stopColor="#64748b" />
            <stop offset="55%" stopColor="#1e293b" />
            <stop offset="85%" stopColor="#090d14" />
            <stop offset="100%" stopColor="#020408" />
          </linearGradient>

          {/* Halo Center Pillar Cylinder Shading */}
          <linearGradient id="haloPillarVert" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="25%" stopColor="#475569" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="75%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Formula British Racing Green Chassis Metallic Bodywork */}
          <linearGradient id="f1BodyworkGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="35%" stopColor="#047857" />
            <stop offset="70%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>

          {/* Formula Steering Wheel Carbon Hub Gradient */}
          <radialGradient id="carbonHub" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#1e2533" />
            <stop offset="60%" stopColor="#10141d" />
            <stop offset="100%" stopColor="#080a0f" />
          </radialGradient>

          {/* Steering Wheel Ergonomic Alcantara Grip Shading */}
          <linearGradient id="alcantaraGripL" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#07090d" />
            <stop offset="40%" stopColor="#1e2430" />
            <stop offset="80%" stopColor="#11141b" />
            <stop offset="100%" stopColor="#07090d" />
          </linearGradient>
          <linearGradient id="alcantaraGripR" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#07090d" />
            <stop offset="20%" stopColor="#11141b" />
            <stop offset="60%" stopColor="#1e2430" />
            <stop offset="100%" stopColor="#07090d" />
          </linearGradient>

          {/* High-Intensity Gantry Red Bulb Glow (When Active) */}
          <radialGradient id="gantryBulbLit" cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#fee2e2" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="85%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#450a0a" />
          </radialGradient>

          {/* Unlit Dark Optic Lens */}
          <radialGradient id="gantryLensOff" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#2a3344" />
            <stop offset="40%" stopColor="#131722" />
            <stop offset="85%" stopColor="#090c12" />
            <stop offset="100%" stopColor="#030407" />
          </radialGradient>

          {/* Gantry Volumetric Downward Spotlight Cone */}
          <linearGradient id="gantryConeGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(239,68,68,0.55)" />
            <stop offset="35%" stopColor="rgba(239,68,68,0.18)" />
            <stop offset="80%" stopColor="rgba(239,68,68,0.04)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>

          {/* Floodlight Beam */}
          <linearGradient id="floodlightBeamL" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(248,250,252,0.3)" />
            <stop offset="40%" stopColor="rgba(248,250,252,0.08)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id="floodlightBeamR" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(248,250,252,0.3)" />
            <stop offset="40%" stopColor="rgba(248,250,252,0.08)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>

          {/* Slick Racing Tire Rubber Texture */}
          <linearGradient id="tireRubber" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#080a0f" />
            <stop offset="30%" stopColor="#1e2430" />
            <stop offset="60%" stopColor="#12151d" />
            <stop offset="100%" stopColor="#07090d" />
          </linearGradient>

          {/* Micro Carbon Weave Pattern */}
          <pattern id="microCarbon" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="#0d1117" />
            <rect width="2" height="2" fill="#181f2a" />
            <rect x="2" y="2" width="2" height="2" fill="#181f2a" />
          </pattern>
        </defs>

        {/* -------------------------------------------------------- */}
        {/* A. SKY, HORIZON & TRACK ENVIRONMENT */}
        {/* -------------------------------------------------------- */}
        {/* Night Sky */}
        <rect x="0" y="0" width="1000" height="340" fill="url(#gpSky)" />

        {/* Distant Grand Prix Grandstands & Floodlight Silhouette */}
        <polygon points="0,240 180,230 350,236 480,238 650,235 850,228 1000,240 1000,255 0,255" fill="#060910" />

        {/* Floodlight Towers Left & Right */}
        {/* Left Floodlight Tower */}
        <line x1="110" y1="235" x2="110" y2="110" stroke="#1e293b" strokeWidth="4" />
        <polygon points="102,110 118,110 115,235 105,235" fill="#0f172a" />
        <rect x="95" y="98" width="30" height="14" rx="2" fill="#334155" stroke="#475569" strokeWidth="1" />
        <circle cx="110" cy="105" r="5" fill="#ffffff" filter="drop-shadow(0 0 8px rgba(255,255,255,0.9))" />
        <polygon points="110,105 0,420 320,420" fill="url(#floodlightBeamL)" />

        {/* Right Floodlight Tower */}
        <line x1="890" y1="235" x2="890" y2="110" stroke="#1e293b" strokeWidth="4" />
        <polygon points="882,110 898,110 895,235 885,235" fill="#0f172a" />
        <rect x="875" y="98" width="30" height="14" rx="2" fill="#334155" stroke="#475569" strokeWidth="1" />
        <circle cx="890" cy="105" r="5" fill="#ffffff" filter="drop-shadow(0 0 8px rgba(255,255,255,0.9))" />
        <polygon points="890,105 680,420 1000,420" fill="url(#floodlightBeamR)" />

        {/* Horizon Atmosphere Fog */}
        <rect x="0" y="210" width="1000" height="50" fill="url(#horizonFog)" />

        {/* The Racing Circuit Track (Converging True Perspective) */}
        <polygon points="468,240 532,240 980,750 20,750" fill="url(#circuitAsphalt)" />

        {/* Racing Line Dark Rubber Grooves */}
        <polygon points="488,240 512,240 780,750 640,750" fill="#090c12" opacity="0.65" />

        {/* Trackside Curbs (Kerbs: Red & White Teeth with Bevel Depth) */}
        {/* Left Kerb */}
        <polygon points="454,240 468,240 20,750 -40,750" fill="#991b1b" />
        <polygon points="456,240 464,240 5,750 -30,750" stroke="#f8fafc" strokeWidth="2.5" strokeDasharray="16,16" />

        {/* Right Kerb */}
        <polygon points="532,240 546,240 1040,750 980,750" fill="#991b1b" />
        <polygon points="536,240 544,240 1030,750 995,750" stroke="#f8fafc" strokeWidth="2.5" strokeDasharray="16,16" />

        {/* Track Edge Safety Barriers (Armco / Tecpro) */}
        <polygon points="430,240 454,240 -40,750 -80,750" fill="#0a0e17" stroke="#1e293b" strokeWidth="1.5" />
        <polygon points="546,240 570,240 1080,750 1040,750" fill="#0a0e17" stroke="#1e293b" strokeWidth="1.5" />

        {/* White Centerline & Grid Slot Lines */}
        <line x1="500" y1="240" x2="500" y2="750" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="32,28" opacity="0.5" />
        <line x1="482" y1="240" x2="280" y2="750" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="20,24" opacity="0.3" />
        <line x1="518" y1="240" x2="720" y2="750" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="20,24" opacity="0.3" />

        {/* Grid Starting Box Markings */}
        <line x1="330" y1="365" x2="670" y2="365" stroke="#f8fafc" strokeWidth="4" opacity="0.55" />
        <rect x="365" y="365" width="14" height="42" fill="#f8fafc" opacity="0.4" />
        <rect x="621" y="365" width="14" height="42" fill="#f8fafc" opacity="0.4" />

        {/* Competitor Formula Car Ahead on Grid (Left slot, high-depth atmosphere) */}
        <g transform="translate(325, 260) scale(0.68)">
          {/* Rear Slick Tires */}
          <rect x="-42" y="28" width="18" height="38" rx="4" fill="#05070a" stroke="#1f2937" strokeWidth="1.5" />
          <rect x="66" y="28" width="18" height="38" rx="4" fill="#05070a" stroke="#1f2937" strokeWidth="1.5" />
          {/* Rear Wing Endplates & Main Beam */}
          <rect x="-38" y="14" width="118" height="14" rx="2" fill="#b91c1c" stroke="#dc2626" strokeWidth="1" />
          <rect x="-42" y="6" width="9" height="28" rx="1" fill="#111827" />
          <rect x="75" y="6" width="9" height="28" rx="1" fill="#111827" />
          {/* Main Aerodynamic Engine Cover & Pod */}
          <polygon points="21,20 5,65 37,65" fill="#dc2626" />
          {/* Rain / Telemetry Flashing LED */}
          <circle cx="21" cy="58" r="4.5" fill="#ef4444" filter="drop-shadow(0 0 6px rgba(239,68,68,0.95))" />
        </g>

        {/* -------------------------------------------------------- */}
        {/* B. OVERHEAD 5-POD STARTING LIGHT GANTRY */}
        {/* -------------------------------------------------------- */}
        {/* Heavy Industrial Truss Bridge Structure */}
        <rect x="150" y="45" width="700" height="22" rx="3" fill="#141923" stroke="#334155" strokeWidth="2.5" />
        <line x1="150" y1="56" x2="850" y2="56" stroke="#475569" strokeWidth="1.5" strokeDasharray="12,12" />

        {/* Gantry Truss Internal Cross-braces */}
        <path
          d="M 160 45 L 180 67 L 200 45 L 220 67 L 240 45 L 260 67 L 280 45 L 300 67 L 320 45 L 340 67 L 360 45 L 380 67 L 400 45 L 420 67 L 440 45 L 460 67 L 480 45 L 500 67 L 520 45 L 540 67 L 560 45 L 580 67 L 600 45 L 620 67 L 640 45 L 660 67 L 680 45 L 700 67 L 720 45 L 740 67 L 760 45 L 780 67 L 800 45 L 820 67 L 840 45"
          stroke="#1e293b"
          strokeWidth="1.5"
          fill="none"
        />

        {/* 5 Distinct Gantry Light Pod Units */}
        {[0, 1, 2, 3, 4].map((i) => {
          const podX = 310 + i * 95;
          const isLit = (phase === 'LIGHTS_ON' && i < activeLightsCount) || phase === 'HOLDING';

          return (
            <g key={i}>
              {/* Volumetric downward spotlight cone when illuminated */}
              {isLit && (
                <polygon
                  points={`${podX + 26},145 ${podX - 60},420 ${podX + 112},420`}
                  fill="url(#gantryConeGlow)"
                />
              )}

              {/* Metallic Mounting Bracket */}
              <rect x={podX + 18} y="67" width="16" height="15" fill="#090d14" stroke="#1e293b" strokeWidth="2" />

              {/* Gantry Pod Housing with Beveled Frame */}
              <rect
                x={podX}
                y="80"
                width="52"
                height="98"
                rx="8"
                fill="#0a0d14"
                stroke="#334155"
                strokeWidth="3"
                filter="drop-shadow(0 6px 12px rgba(0,0,0,0.85))"
              />

              {/* Cylindrical Sunshade Hoods (Cowls) */}
              <path
                d={`M ${podX + 6} 104 Q ${podX + 26} 90 ${podX + 46} 104`}
                fill="none"
                stroke="#1a2230"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d={`M ${podX + 6} 148 Q ${podX + 26} 134 ${podX + 46} 148`}
                fill="none"
                stroke="#1a2230"
                strokeWidth="5"
                strokeLinecap="round"
              />

              {/* Top Secondary Indicator Lens */}
              <circle
                cx={podX + 26}
                cy="108"
                r="13"
                fill="url(#gantryLensOff)"
                stroke="#1e293b"
                strokeWidth="2"
              />

              {/* Main Starting Light Bulb (Large 38px aperture) */}
              <circle
                cx={podX + 26}
                cy="150"
                r="18"
                fill={isLit ? 'url(#gantryBulbLit)' : 'url(#gantryLensOff)'}
                stroke={isLit ? '#f87171' : '#1e293b'}
                strokeWidth="2.5"
              />

              {/* Realistic Multi-Layer Glow on Active Starting Lights */}
              {isLit && (
                <>
                  <circle cx={podX + 26} cy="150" r="32" fill="#ef4444" opacity="0.4" filter="blur(6px)" />
                  <circle cx={podX + 26} cy="150" r="10" fill="#ffffff" opacity="0.85" filter="blur(2px)" />
                  <circle cx={podX + 26} cy="150" r="4.5" fill="#ffffff" />
                </>
              )}
            </g>
          );
        })}

        {/* -------------------------------------------------------- */}
        {/* C. FORMULA CAR NOSECONE, SUSPENSION & HALO */}
        {/* -------------------------------------------------------- */}
        {/* Left Front Open-Wheel Tire */}
        <g transform="translate(15, 310)">
          <rect x="0" y="0" width="105" height="280" rx="16" fill="url(#tireRubber)" stroke="#273244" strokeWidth="3" />
          {/* Wheel Rim & Hub Center */}
          <rect x="75" y="60" width="30" height="160" rx="8" fill="#0a0d14" stroke="#475569" strokeWidth="2" />
          <circle cx="90" cy="140" r="18" fill="#eab308" stroke="#713f12" strokeWidth="2.5" />
          {/* Double-Wishbone Front Carbon Suspension */}
          <line x1="105" y1="100" x2="280" y2="230" stroke="#090d14" strokeWidth="12" strokeLinecap="round" />
          <line x1="105" y1="100" x2="280" y2="230" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          <line x1="105" y1="180" x2="270" y2="250" stroke="#090d14" strokeWidth="12" strokeLinecap="round" />
          <line x1="105" y1="180" x2="270" y2="250" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          {/* Aerodynamic Carbon Brake Duct */}
          <polygon points="105,70 145,100 145,180 105,210" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
        </g>

        {/* Right Front Open-Wheel Tire */}
        <g transform="translate(880, 310)">
          <rect x="0" y="0" width="105" height="280" rx="16" fill="url(#tireRubber)" stroke="#273244" strokeWidth="3" />
          {/* Wheel Rim & Hub Center */}
          <rect x="0" y="60" width="30" height="160" rx="8" fill="#0a0d14" stroke="#475569" strokeWidth="2" />
          <circle cx="15" cy="140" r="18" fill="#eab308" stroke="#713f12" strokeWidth="2.5" />
          {/* Double-Wishbone Front Carbon Suspension */}
          <line x1="0" y1="100" x2="-175" y2="230" stroke="#090d14" strokeWidth="12" strokeLinecap="round" />
          <line x1="0" y1="100" x2="-175" y2="230" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          <line x1="0" y1="180" x2="-165" y2="250" stroke="#090d14" strokeWidth="12" strokeLinecap="round" />
          <line x1="0" y1="180" x2="-165" y2="250" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          {/* Aerodynamic Carbon Brake Duct */}
          <polygon points="0,70 -40,100 -40,180 0,210" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
        </g>

        {/* Front Nosecone Aerodynamic Monocoque Bodywork */}
        <polygon points="500,310 415,580 585,580" fill="url(#f1BodyworkGreen)" stroke="#064e3b" strokeWidth="3" />
        {/* Nose Top Carbon Highlight Spine */}
        <polygon points="500,310 484,580 516,580" fill="#10b981" opacity="0.65" />
        {/* FIA Camera Pod on Tip of Nose */}
        <rect x="492" y="300" width="16" height="22" rx="4" fill="#0a0d14" stroke="#334155" strokeWidth="1.5" />

        {/* Halo Titanium Center Pillar */}
        <polygon points="488,320 512,320 516,530 484,530" fill="url(#haloPillarVert)" stroke="#0f172a" strokeWidth="3" />

        {/* Halo Overhead Curved Titanium Hoop */}
        <path
          d="M 170 330 Q 500 240 830 330"
          fill="none"
          stroke="#070a10"
          strokeWidth="28"
          strokeLinecap="round"
        />
        <path
          d="M 170 330 Q 500 240 830 330"
          fill="none"
          stroke="url(#haloTubeHoriz)"
          strokeWidth="20"
          strokeLinecap="round"
        />

        {/* Left & Right Aerodynamic Carbon Cockpit Side-Pods */}
        <path
          d="M 0 540 Q 260 510 320 750 L 0 750 Z"
          fill="url(#microCarbon)"
          stroke="#1e293b"
          strokeWidth="3"
        />
        <path
          d="M 1000 540 Q 740 510 680 750 L 1000 750 Z"
          fill="url(#microCarbon)"
          stroke="#1e293b"
          strokeWidth="3"
        />

        {/* Cockpit Green Livery Flairs */}
        <path d="M 0 550 Q 255 522 312 750" fill="none" stroke="#10b981" strokeWidth="4" opacity="0.9" />
        <path d="M 1000 550 Q 745 522 688 750" fill="none" stroke="#10b981" strokeWidth="4" opacity="0.9" />

        {/* -------------------------------------------------------- */}
        {/* D. FORMULA RACING STEERING WHEEL (Hero Foreground) */}
        {/* -------------------------------------------------------- */}
        <g transform="translate(500, 615)">
          {/* Main Steering Wheel Drop Shadow */}
          <ellipse cx="0" cy="18" rx="230" ry="110" fill="#000000" opacity="0.8" filter="blur(16px)" />

          {/* Wheel Carbon Composite Outer Body Structure */}
          <path
            d="M -195 -80
               C -185 -125, -125 -135, -60 -135
               L 60 -135
               C 125 -135, 185 -125, 195 -80
               L 205 35
               C 205 95, 155 110, 85 110
               L -85 110
               C -155 110, -205 95, -205 35
               Z"
            fill="url(#carbonHub)"
            stroke="#334155"
            strokeWidth="5"
          />

          {/* Molded Alcantara / Rubber Hand Grips (Left & Right) */}
          {/* Left Grip */}
          <path
            d="M -200 -75
               C -222 -30, -225 30, -195 65
               C -175 80, -155 60, -165 20
               C -175 -20, -170 -50, -180 -75
               Z"
            fill="url(#alcantaraGripL)"
            stroke="#1e293b"
            strokeWidth="3"
          />
          {/* Right Grip */}
          <path
            d="M 200 -75
               C 222 -30, 225 30, 195 65
               C 175 80, 155 60, 165 20
               C 175 -20, 170 -50, 180 -75
               Z"
            fill="url(#alcantaraGripR)"
            stroke="#1e293b"
            strokeWidth="3"
          />

          {/* Steering Wheel Tactile Buttons & Rotary Encoders */}
          {/* Left Upper Rotary Dial (Engine Mode) */}
          <circle cx="-135" cy="-55" r="14" fill="#b91c1c" stroke="#450a0a" strokeWidth="3" />
          <circle cx="-135" cy="-55" r="6" fill="#fca5a5" />
          <rect x="-137" y="-67" width="4" height="7" fill="#ffffff" rx="1" />

          {/* Left Lower DRS / Radio Buttons */}
          <circle cx="-145" cy="5" r="11" fill="#0284c7" stroke="#082f49" strokeWidth="2.5" />
          <circle cx="-115" cy="45" r="12" fill="#eab308" stroke="#713f12" strokeWidth="2.5" />

          {/* Right Upper Rotary Dial (Brake Bias) */}
          <circle cx="135" cy="-55" r="14" fill="#059669" stroke="#022c22" strokeWidth="3" />
          <circle cx="135" cy="-55" r="6" fill="#6ee7b7" />
          <rect x="133" y="-67" width="4" height="7" fill="#ffffff" rx="1" />

          {/* Right Lower Pit / Overtake Buttons */}
          <circle cx="145" cy="5" r="11" fill="#ea580c" stroke="#431407" strokeWidth="2.5" />
          <circle cx="115" cy="45" r="12" fill="#9333ea" stroke="#3b0764" strokeWidth="2.5" />

          {/* Top Shift LED RPM Light Array (15 Rev Lights) */}
          <rect x="-112" y="-124" width="224" height="18" rx="6" fill="#05070c" stroke="#1e293b" strokeWidth="2" />
          {rpmLEDs.map((led) => {
            const ledX = -102 + led.index * 14.5;
            return (
              <g key={led.index}>
                <circle
                  cx={ledX}
                  cy="-115"
                  r="4.8"
                  fill={led.isLit ? led.color : '#0f141d'}
                  stroke={led.isLit ? '#ffffff' : '#080a0f'}
                  strokeWidth="1"
                />
                {led.isLit && (
                  <circle cx={ledX} cy="-115" r="8" fill={led.color} opacity="0.5" filter="blur(3px)" />
                )}
              </g>
            );
          })}

          {/* CNC Aluminum Center Display Bezel */}
          <rect
            x="-106"
            y="-95"
            width="212"
            height="136"
            rx="10"
            fill="#060910"
            stroke="#475569"
            strokeWidth="3.5"
          />

          {/* Telemetry LCD Glass Frame Inner Glow */}
          <rect
            x="-100"
            y="-89"
            width="200"
            height="124"
            rx="6"
            fill="#080c14"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
        </g>
      </svg>

      {/* ======================================================== */}
      {/* 2. DIGITAL INSTRUMENT TELEMETRY DISPLAY (HTML Embedded)  */}
      {/* ======================================================== */}
      <div className="absolute inset-x-0 bottom-4 sm:bottom-6 flex flex-col items-center justify-center pointer-events-none z-10">
        <div className="w-[230px] sm:w-[270px] h-[115px] sm:h-[130px] rounded-lg bg-[#070b13]/95 border border-slate-700/80 p-2 sm:p-2.5 flex flex-col justify-between shadow-inner text-white font-mono select-none">
          {/* Telemetry Top Bar */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-400 border-b border-slate-800/90 pb-1">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{playerName}</span>
            </span>
            <span className="text-amber-400 font-black tracking-wider">
              ROUND {roundNumber}/{totalRounds}
            </span>
            <span className="text-slate-400">
              {bestMs ? `PB ${bestMs}ms` : 'PB --'}
            </span>
          </div>

          {/* Central Main High-Impact Metric */}
          <div className="flex flex-col items-center justify-center py-1">
            {phase === 'IDLE' && (
              <div className="flex flex-col items-center">
                <span className="text-xs sm:text-sm font-black text-orange-400 tracking-wider animate-pulse">
                  READY TO STAGE
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">TAP COCKPIT TO BEGIN</span>
              </div>
            )}

            {phase === 'STAGING' && (
              <div className="flex flex-col items-center">
                <span className="text-xs sm:text-sm font-bold text-sky-400 tracking-widest">
                  STAGING...
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">FIVE LIGHTS SEQUENCING</span>
              </div>
            )}

            {phase === 'LIGHTS_ON' && (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <span
                      key={num}
                      className={`text-lg sm:text-xl font-black transition-colors ${
                        num <= activeLightsCount
                          ? 'text-red-500 scale-125 drop-shadow-[0_0_10px_rgba(239,68,68,0.95)]'
                          : 'text-slate-700'
                      }`}
                    >
                      ●
                    </span>
                  ))}
                </div>
                <span className="text-[9px] text-red-400/90 font-bold tracking-wider mt-1">
                  HOLD STILL
                </span>
              </div>
            )}

            {phase === 'HOLDING' && (
              <div className="flex flex-col items-center">
                <span className="text-sm sm:text-base font-black text-rose-500 tracking-widest animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]">
                  HOLD STEADY...
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">ANY TAP IS FALSE START</span>
              </div>
            )}

            {phase === 'LIGHTS_OUT' && (
              <div className="flex flex-col items-center anim-pop">
                <span className="text-base sm:text-xl font-black text-emerald-400 tracking-tight drop-shadow-[0_0_14px_rgba(16,185,129,0.95)]">
                  ⚡ LIGHTS OUT! GO!
                </span>
                <span className="text-[9px] text-emerald-300 font-bold mt-0.5">REACT NOW!</span>
              </div>
            )}

            {phase === 'RESULT' && formattedTime && (
              <div className="flex flex-col items-center leading-none anim-pop">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                  REACTION TIME
                </span>
                <div className="flex items-baseline gap-1 text-white">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight font-mono text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]">
                    {formattedTime.ms}
                  </span>
                  <span className="text-xs font-black text-emerald-400">MS</span>
                </div>
                <span className="text-[10px] text-slate-300 font-bold mt-0.5">
                  ({formattedTime.sec} SEC)
                </span>
              </div>
            )}

            {phase === 'FALSE_START' && (
              <div className="flex flex-col items-center leading-tight anim-shake">
                <span className="text-base sm:text-lg font-black text-red-500 tracking-wider">
                  ⚠️ JUMP START!
                </span>
                <span className="text-[10px] text-red-300 font-semibold mt-0.5">EARLY TAP (PENALTY)</span>
              </div>
            )}
          </div>

          {/* Telemetry Footer Status */}
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 border-t border-slate-800/90 pt-1">
            {isPersonalBest ? (
              <span className="text-amber-400 font-black tracking-wider animate-bounce">
                ★ NEW PERSONAL BEST!
              </span>
            ) : (
              <span className="text-slate-400 truncate">
                {phase === 'RESULT' ? 'TAP TO ADVANCE' : 'ACTIVE COCKPIT TELEMETRY'}
              </span>
            )}
            <span className="text-[9px] text-slate-500 font-mono">1000Hz SENSOR</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. TOP TELEMETRY HUD BAR (Overhead)                      */}
      {/* ======================================================== */}
      <div className="absolute top-3 inset-x-0 flex items-center justify-between px-3 sm:px-6 pointer-events-none z-20">
        {/* Player Badge */}
        <div className="bg-black/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold text-white shadow-xl">
          <span className={`w-2 h-2 rounded-full ${playerIndex === 0 ? 'bg-orange-500' : 'bg-cyan-400'} animate-pulse`} />
          <span className="font-mono text-slate-200">{playerName}</span>
        </div>

        {/* Dynamic Center Prompt */}
        <div className="hidden sm:flex items-center gap-1.5 bg-black/85 backdrop-blur-md border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-mono shadow-xl">
          {phase === 'IDLE' && <span className="text-orange-400 font-bold">TAP COCKPIT TO STAGE ROUND</span>}
          {phase === 'STAGING' && <span className="text-sky-300">GANTRY INITIALIZING...</span>}
          {phase === 'LIGHTS_ON' && <span className="text-red-400 font-bold">SEQUENTIAL RED LIGHTS ON</span>}
          {phase === 'HOLDING' && <span className="text-yellow-400 font-black animate-pulse">WATCH FOR LIGHTS OUT!</span>}
          {phase === 'LIGHTS_OUT' && <span className="text-emerald-400 font-black anim-pop">TAP COCKPIT NOW!</span>}
          {phase === 'RESULT' && <span className="text-emerald-300 font-bold">ROUND COMPLETE • TAP TO CONTINUE</span>}
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
      {/* 4. FALSE START OVERLAY ALERT                              */}
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
              TAP COCKPIT TO PROCEED
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
