import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Trophy, Gauge, Flag, Volume2, VolumeX } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RoadSegment {
  index: number;
  p1: { world: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } };
  p2: { world: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } };
  curve: number;
  color: {
    road: string;
    grass: string;
    rumble: string;
    lane?: string;
  };
}

interface AICar {
  id: number;
  z: number;
  x: number; // -0.8 (left) to 0.8 (right)
  speed: number;
  color: string;
  name: string;
}

const SEGMENT_LENGTH = 200;
const TOTAL_SEGMENTS = 400;
const TRACK_LENGTH = TOTAL_SEGMENTS * SEGMENT_LENGTH;
const ROAD_WIDTH = 2000;
const CAMERA_HEIGHT = 1000;
const CAMERA_DEPTH = 0.84;
const TOTAL_LAPS = 3;

// Synthesizer audio engine for engine throttle, screech & crash
class RacingSoundEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private screechOsc: OscillatorNode | null = null;
  private screechGain: GainNode | null = null;
  public enabled: boolean = true;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        // Engine oscillator
        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.setValueAtTime(65, this.ctx.currentTime);
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();

        // Screech oscillator
        this.screechOsc = this.ctx.createOscillator();
        this.screechGain = this.ctx.createGain();
        this.screechOsc.type = 'triangle';
        this.screechOsc.frequency.setValueAtTime(800, this.ctx.currentTime);
        this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.screechOsc.connect(this.screechGain);
        this.screechGain.connect(this.ctx.destination);
        this.screechOsc.start();
      }
    } catch {
      // AudioContext not supported
    }
  }

  public updateEngine(speedKmH: number, isAccelerating: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineGain || !this.enabled) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const baseFreq = 50 + (speedKmH / 300) * 180 + (isAccelerating ? 30 : 0);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
    const targetGain = speedKmH > 5 ? 0.06 : 0.02;
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
  }

  public setScreech(active: boolean) {
    if (!this.ctx || !this.screechGain || !this.enabled) return;
    const now = this.ctx.currentTime;
    this.screechGain.gain.setTargetAtTime(active ? 0.08 : 0, now, 0.03);
  }

  public playCrash() {
    if (!this.ctx || !this.enabled) return;
    sounds.playHit();
  }

  public stop() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    if (this.screechGain && this.ctx) {
      this.screechGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }
}

export const CarRacingGame: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'car-racing')!;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<RacingSoundEngine>(new RacingSoundEngine());

  // Game status
  const [speed, setSpeed] = useState<number>(0);
  const [gear, setGear] = useState<string>('1');
  const [lap, setLap] = useState<number>(1);
  const [position, setPosition] = useState<number>(4);
  const [lapTime, setLapTime] = useState<number>(0);
  const [bestLapTime, setBestLapTime] = useState<number | null>(null);
  const [startCountdown, setStartCountdown] = useState<number | null>(3);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameWon, setGameWon] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Input states (Keyboard & Virtual Mobile Touch)
  const inputRef = useRef({
    left: false,
    right: false,
    accelerate: false,
    brake: false,
  });

  // Track & Physics State inside refs for 60fps loop
  const playerZ = useRef(0);
  const playerX = useRef(0); // -1.0 to 1.0 (center 0)
  const playerSpeed = useRef(0); // 0 to 12000
  const maxSpeed = useRef(11500); // ~280 km/h
  const accel = useRef(75);
  const breaking = useRef(-120);
  const decel = useRef(-35);
  const offRoadDecel = useRef(-110);
  const currentLap = useRef(1);
  const lapStartTime = useRef(Date.now());
  const bestLap = useRef<number | null>(null);
  const segments = useRef<RoadSegment[]>([]);
  const isRacingActive = useRef(false);

  // AI Competitors
  const aiCars = useRef<AICar[]>([
    { id: 1, z: 1200, x: -0.4, speed: 9800, color: '#0ea5e9', name: 'Ferrari Blue' },
    { id: 2, z: 2400, x: 0.35, speed: 10400, color: '#eab308', name: 'McLaren Yellow' },
    { id: 3, z: 3800, x: -0.2, speed: 10900, color: '#10b981', name: 'Aston Green' },
  ]);

  // Build Monza-inspired 3D track layout with chicanes, curves and straights
  const buildTrack = useCallback(() => {
    const list: RoadSegment[] = [];
    for (let i = 0; i < TOTAL_SEGMENTS; i++) {
      let curve = 0;
      // Curva Grande (segments 40 to 90)
      if (i > 40 && i < 90) curve = 2.2;
      // Variante del Rettifilo Chicane (segments 120 to 160)
      else if (i > 120 && i < 140) curve = -2.8;
      else if (i >= 140 && i < 160) curve = 2.8;
      // Lesmo 1 & 2 (segments 210 to 270)
      else if (i > 210 && i < 270) curve = 3.2;
      // Ascari Chicane (segments 310 to 350)
      else if (i > 310 && i < 330) curve = -3.0;
      else if (i >= 330 && i < 350) curve = 2.5;

      const isAlternate = Math.floor(i / 3) % 2 === 0;

      list.push({
        index: i,
        p1: {
          world: { x: 0, y: 0, z: i * SEGMENT_LENGTH },
          screen: { x: 0, y: 0, w: 0, scale: 0 },
        },
        p2: {
          world: { x: 0, y: 0, z: (i + 1) * SEGMENT_LENGTH },
          screen: { x: 0, y: 0, w: 0, scale: 0 },
        },
        curve,
        color: {
          road: isAlternate ? '#1e2433' : '#181d2a',
          grass: isAlternate ? '#166534' : '#15803d',
          rumble: isAlternate ? '#ef4444' : '#ffffff',
          lane: isAlternate ? '#ffffff' : undefined,
        },
      });
    }
    segments.current = list;
  }, []);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      audioRef.current.init();
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') inputRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') inputRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') inputRef.current.accelerate = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === ' ') inputRef.current.brake = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') inputRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') inputRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') inputRef.current.accelerate = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === ' ') inputRef.current.brake = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Starting countdown sequence (3, 2, 1, GO!)
  useEffect(() => {
    buildTrack();
    let count = 3;
    setStartCountdown(3);
    sounds.playMove();

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        setStartCountdown(count);
        sounds.playMove();
      } else if (count === 0) {
        setStartCountdown(0); // GO!
        sounds.playScore();
        isRacingActive.current = true;
        lapStartTime.current = Date.now();
      } else {
        clearInterval(timer);
        setStartCountdown(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [buildTrack]);

  // Main 60fps game animation loop
  useEffect(() => {
    let animId: number;

    const project = (
      p: { world: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } },
      cameraX: number,
      cameraY: number,
      cameraZ: number,
      width: number,
      height: number
    ) => {
      p.screen.scale = CAMERA_DEPTH / (p.world.z - cameraZ);
      p.screen.x = Math.round(width / 2 + (p.screen.scale * (p.world.x - cameraX) * width) / 2);
      p.screen.y = Math.round(height / 2 - (p.screen.scale * (p.world.y - cameraY) * height) / 2);
      p.screen.w = Math.round((p.screen.scale * ROAD_WIDTH * width) / 2);
    };

    const loop = () => {
      if (gameOver) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;

      // 1. UPDATE PHYSICS
      if (isRacingActive.current) {
        // Lap timer
        const currentElapsed = (Date.now() - lapStartTime.current) / 1000;
        setLapTime(currentElapsed);

        // Acceleration / Deceleration
        if (inputRef.current.accelerate) {
          playerSpeed.current = Math.min(maxSpeed.current, playerSpeed.current + accel.current);
        } else if (inputRef.current.brake) {
          playerSpeed.current = Math.max(0, playerSpeed.current + breaking.current);
        } else {
          playerSpeed.current = Math.max(0, playerSpeed.current + decel.current);
        }

        // Off-road penalty (grass)
        const isOffRoad = Math.abs(playerX.current) > 1.05;
        if (isOffRoad) {
          playerSpeed.current = Math.max(0, playerSpeed.current + offRoadDecel.current);
          audioRef.current.setScreech(true);
        } else if (inputRef.current.brake && playerSpeed.current > 1000) {
          audioRef.current.setScreech(true);
        } else {
          audioRef.current.setScreech(false);
        }

        // Steering based on speed
        const speedRatio = playerSpeed.current / maxSpeed.current;
        const steerStrength = 0.038 * Math.min(1.2, speedRatio * 1.4);

        if (inputRef.current.left) {
          playerX.current -= steerStrength;
        }
        if (inputRef.current.right) {
          playerX.current += steerStrength;
        }

        // Centrifugal curve push
        const currentSegIndex = Math.floor(playerZ.current / SEGMENT_LENGTH) % TOTAL_SEGMENTS;
        const currentSeg = segments.current[currentSegIndex];
        if (currentSeg) {
          playerX.current -= currentSeg.curve * speedRatio * 0.022;
        }

        // Clamp off-road extent
        playerX.current = Math.max(-2.2, Math.min(2.2, playerX.current));

        // Advance track
        playerZ.current += playerSpeed.current * 0.016;

        // Lap completed!
        if (playerZ.current >= TRACK_LENGTH) {
          playerZ.current %= TRACK_LENGTH;
          const finishedLapTime = (Date.now() - lapStartTime.current) / 1000;

          if (bestLap.current === null || finishedLapTime < bestLap.current) {
            bestLap.current = finishedLapTime;
            setBestLapTime(finishedLapTime);
          }

          if (currentLap.current >= TOTAL_LAPS) {
            // RACE FINISHED!
            isRacingActive.current = false;
            setGameOver(true);
            setGameWon(position <= 3);
            sounds.playWin();
            audioRef.current.stop();
            try {
              confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
            } catch {
              // fallback
            }
            return;
          } else {
            currentLap.current += 1;
            setLap(currentLap.current);
            lapStartTime.current = Date.now();
            sounds.playScore();
          }
        }

        // Update AI Cars
        aiCars.current.forEach((ai) => {
          ai.z = (ai.z + ai.speed * 0.016) % TRACK_LENGTH;
          // Slight lane swerve
          ai.x += Math.sin(ai.z * 0.002) * 0.003;
        });

        // Compute Race Position
        let aheadCount = 0;
        aiCars.current.forEach((ai) => {
          const aiLapProgress = ai.z;
          const playerLapProgress = playerZ.current;
          if (aiLapProgress > playerLapProgress) aheadCount++;
        });
        setPosition(aheadCount + 1);

        // Update Speedometer & Audio
        const speedKmh = Math.round(speedRatio * 285);
        setSpeed(speedKmh);

        // Gear calculation
        if (speedKmh === 0) setGear('N');
        else if (speedKmh < 45) setGear('1');
        else if (speedKmh < 95) setGear('2');
        else if (speedKmh < 155) setGear('3');
        else if (speedKmh < 210) setGear('4');
        else if (speedKmh < 255) setGear('5');
        else setGear('6');

        audioRef.current.updateEngine(speedKmh, inputRef.current.accelerate);
      }

      // 2. RENDER FRAME
      ctx.clearRect(0, 0, W, H);

      // Sky & Distant Mountains
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H / 2);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H / 2);

      // Horizon line
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, W / 1.8, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw 3D Road Segments
      const baseSegment = Math.floor(playerZ.current / SEGMENT_LENGTH) % TOTAL_SEGMENTS;
      const cameraX = playerX.current * ROAD_WIDTH;
      const cameraY = CAMERA_HEIGHT;
      const cameraZ = playerZ.current - SEGMENT_LENGTH;
      const DRAW_DISTANCE = 160;

      let dx = 0;
      let x = 0;

      for (let n = 0; n < DRAW_DISTANCE; n++) {
        const segIdx = (baseSegment + n) % TOTAL_SEGMENTS;
        const segment = segments.current[segIdx];
        if (!segment) continue;

        // Loop track world z for segments wrapping around
        const loopedZ = segment.index < baseSegment ? TRACK_LENGTH : 0;
        segment.p1.world.z = segment.index * SEGMENT_LENGTH + loopedZ;
        segment.p2.world.z = (segment.index + 1) * SEGMENT_LENGTH + loopedZ;

        segment.p1.world.x = x;
        x += dx;
        dx += segment.curve;
        segment.p2.world.x = x;

        project(segment.p1, cameraX, cameraY, cameraZ, W, H);
        project(segment.p2, cameraX, cameraY, cameraZ, W, H);

        if (segment.p1.screen.y <= segment.p2.screen.y) continue;

        // Render Grass
        ctx.fillStyle = segment.color.grass;
        ctx.fillRect(0, segment.p2.screen.y, W, segment.p1.screen.y - segment.p2.screen.y);

        // Render Rumble Strips
        const r1 = segment.p1.screen.w * 1.18;
        const r2 = segment.p2.screen.w * 1.18;
        ctx.fillStyle = segment.color.rumble;
        ctx.beginPath();
        ctx.moveTo(segment.p1.screen.x - r1, segment.p1.screen.y);
        ctx.lineTo(segment.p2.screen.x - r2, segment.p2.screen.y);
        ctx.lineTo(segment.p2.screen.x + r2, segment.p2.screen.y);
        ctx.lineTo(segment.p1.screen.x + r1, segment.p1.screen.y);
        ctx.fill();

        // Render Road Surface
        ctx.fillStyle = segment.color.road;
        ctx.beginPath();
        ctx.moveTo(segment.p1.screen.x - segment.p1.screen.w, segment.p1.screen.y);
        ctx.lineTo(segment.p2.screen.x - segment.p2.screen.w, segment.p2.screen.y);
        ctx.lineTo(segment.p2.screen.x + segment.p2.screen.w, segment.p2.screen.y);
        ctx.lineTo(segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y);
        ctx.fill();

        // Center White Dashed Lane Line
        if (segment.color.lane) {
          const lw1 = segment.p1.screen.w * 0.035;
          const lw2 = segment.p2.screen.w * 0.035;
          ctx.fillStyle = segment.color.lane;
          ctx.beginPath();
          ctx.moveTo(segment.p1.screen.x - lw1, segment.p1.screen.y);
          ctx.lineTo(segment.p2.screen.x - lw2, segment.p2.screen.y);
          ctx.lineTo(segment.p2.screen.x + lw2, segment.p2.screen.y);
          ctx.lineTo(segment.p1.screen.x + lw1, segment.p1.screen.y);
          ctx.fill();
        }

        // Draw Start / Finish Line Banner
        if (segment.index === 0) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(
            segment.p1.screen.x - segment.p1.screen.w,
            segment.p1.screen.y - 4,
            segment.p1.screen.w * 2,
            8
          );
        }
      }

      // Render AI Cars on track
      aiCars.current.forEach((ai) => {
        const relZ = (ai.z - playerZ.current + TRACK_LENGTH) % TRACK_LENGTH;
        if (relZ > 0 && relZ < DRAW_DISTANCE * SEGMENT_LENGTH) {
          const aiSegIdx = Math.floor(ai.z / SEGMENT_LENGTH) % TOTAL_SEGMENTS;
          const seg = segments.current[aiSegIdx];
          if (seg) {
            const scale = CAMERA_DEPTH / relZ;
            const screenX = W / 2 + (scale * (ai.x * ROAD_WIDTH - cameraX) * W) / 2;
            const screenY = H / 2 - (scale * (0 - cameraY) * H) / 2;
            const carW = 120 * scale * W * 0.5;
            const carH = 65 * scale * H * 0.5;

            // Draw Opponent Car
            ctx.fillStyle = ai.color;
            ctx.shadowColor = ai.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.roundRect(screenX - carW / 2, screenY - carH, carW, carH, carW * 0.2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Wheels & Rear Wing
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(screenX - carW / 2 - 3, screenY - carH * 0.35, carW + 6, carH * 0.35);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(screenX - carW * 0.4, screenY - carH * 0.8, carW * 0.8, 3);
          }
        }
      });

      // Render Player's Formula 1 Race Car at bottom center
      const pCarW = W * 0.22;
      const pCarH = pCarW * 0.58;
      const pCarX = W / 2;
      const pCarY = H - pCarH * 0.85;

      // Body Tilt on Steering
      const tilt = inputRef.current.left ? -6 : inputRef.current.right ? 6 : 0;
      ctx.save();
      ctx.translate(pCarX, pCarY);
      ctx.rotate((tilt * Math.PI) / 180);

      // Car Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(0, pCarH * 0.45, pCarW * 0.6, pCarH * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tyres (Left & Right)
      ctx.fillStyle = '#020617';
      ctx.fillRect(-pCarW * 0.52, -pCarH * 0.3, pCarW * 0.16, pCarH * 0.6);
      ctx.fillRect(pCarW * 0.36, -pCarH * 0.3, pCarW * 0.16, pCarH * 0.6);

      // Main F1 Aerodynamic Chassis (Red / Crimson)
      const chassisGrad = ctx.createLinearGradient(-pCarW * 0.4, 0, pCarW * 0.4, 0);
      chassisGrad.addColorStop(0, '#dc2626');
      chassisGrad.addColorStop(0.5, '#ef4444');
      chassisGrad.addColorStop(1, '#b91c1c');
      ctx.fillStyle = chassisGrad;
      ctx.beginPath();
      ctx.roundRect(-pCarW * 0.36, -pCarH * 0.45, pCarW * 0.72, pCarH * 0.85, 12);
      ctx.fill();

      // Cockpit / Driver Helmet
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, -pCarH * 0.1, pCarW * 0.14, pCarH * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(0, -pCarH * 0.1, pCarW * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // Brake Lights (glow when braking)
      const isBraking = inputRef.current.brake;
      ctx.fillStyle = isBraking ? '#ff0033' : '#7f1d1d';
      ctx.shadowColor = isBraking ? '#ff0033' : 'transparent';
      ctx.shadowBlur = isBraking ? 15 : 0;
      ctx.fillRect(-pCarW * 0.28, pCarH * 0.35, pCarW * 0.15, 6);
      ctx.fillRect(pCarW * 0.13, pCarH * 0.35, pCarW * 0.15, 6);
      ctx.shadowBlur = 0;

      // Rear Spoiler / Wing
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-pCarW * 0.44, pCarH * 0.25, pCarW * 0.88, 7);

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameOver, position]);

  const restartRace = () => {
    playerZ.current = 0;
    playerX.current = 0;
    playerSpeed.current = 0;
    currentLap.current = 1;
    setLap(1);
    setLapTime(0);
    setPosition(4);
    setGameOver(false);
    setGameWon(false);
    isRacingActive.current = true;
    lapStartTime.current = Date.now();
    audioRef.current.init();
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    audioRef.current.enabled = next;
    if (!next) audioRef.current.stop();
  };

  return (
    <GameLayout
      game={gameInfo}
      onRestart={restartRace}
      headerControls={
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
            title={soundOn ? 'Mute Engine' : 'Unmute Engine'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      }
    >
      <div className="w-full max-w-4xl flex flex-col items-center select-none px-2 sm:px-4">
        {/* Race Telemetry HUD Bar */}
        <div className="w-full grid grid-cols-4 sm:grid-cols-5 gap-2 bg-[#121422] border border-slate-800 rounded-2xl p-3 mb-3 shadow-xl">
          {/* Position */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> POS
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-400">P{position}</span>
          </div>

          {/* Speed & Gear */}
          <div className="flex flex-col items-center col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-violet-400" /> SPEED
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-white">{speed}</span>
              <span className="text-[10px] font-bold text-slate-400">KM/H</span>
              <span className="ml-1.5 px-1.5 py-0.2 rounded bg-violet-600/30 border border-violet-500/40 text-[11px] font-black text-violet-300">
                G{gear}
              </span>
            </div>
          </div>

          {/* Lap Counter */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Flag className="w-3 h-3 text-emerald-400" /> LAP
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">
              {lap}/{TOTAL_LAPS}
            </span>
          </div>

          {/* Current Lap Time */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">TIME</span>
            <span className="text-lg sm:text-xl font-black font-mono text-slate-200">
              {lapTime.toFixed(1)}s
            </span>
          </div>

          {/* Best Lap Time */}
          <div className="hidden sm:flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">BEST</span>
            <span className="text-lg font-black font-mono text-amber-300">
              {bestLapTime ? `${bestLapTime.toFixed(2)}s` : '--'}
            </span>
          </div>
        </div>

        {/* 3D Canvas Racing Arena */}
        <div className="relative w-full aspect-[16/9] max-w-4xl bg-[#0a0c16] rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl">
          <canvas ref={canvasRef} width={800} height={450} className="w-full h-full block" />

          {/* Starting Countdown Overlay */}
          {startCountdown !== null && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center z-20">
              <div className="flex items-center gap-4 mb-3">
                <div className={`w-8 h-8 rounded-full border-2 ${startCountdown === 3 ? 'bg-rose-500 border-white shadow-lg shadow-rose-500/50' : 'bg-slate-800 border-slate-700'}`} />
                <div className={`w-8 h-8 rounded-full border-2 ${startCountdown === 2 ? 'bg-rose-500 border-white shadow-lg shadow-rose-500/50' : 'bg-slate-800 border-slate-700'}`} />
                <div className={`w-8 h-8 rounded-full border-2 ${startCountdown === 1 ? 'bg-amber-400 border-white shadow-lg shadow-amber-400/50' : 'bg-slate-800 border-slate-700'}`} />
                <div className={`w-8 h-8 rounded-full border-2 ${startCountdown === 0 ? 'bg-emerald-500 border-white shadow-lg shadow-emerald-500/50 animate-ping' : 'bg-slate-800 border-slate-700'}`} />
              </div>
              <h2 className="text-5xl font-black text-white font-mono tracking-tight drop-shadow-lg">
                {startCountdown === 0 ? 'GO!' : startCountdown}
              </h2>
            </div>
          )}

          {/* Minimap Widget in Top-Right Corner */}
          <div className="absolute top-3 right-3 bg-black/60 border border-slate-700/80 rounded-2xl p-2 z-10 w-24 h-24 hidden sm:flex flex-col items-center justify-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">MONZA</span>
            <div className="relative w-16 h-14 border border-dashed border-slate-600 rounded-xl flex items-center justify-center">
              {/* Player dot */}
              <div
                className="absolute w-2.5 h-2.5 rounded-full bg-rose-500 border border-white shadow"
                style={{
                  top: `${Math.round(((playerZ.current % TRACK_LENGTH) / TRACK_LENGTH) * 100)}%`,
                  left: `${50 + playerX.current * 25}%`,
                }}
              />
              {/* AI dots */}
              {aiCars.current.map((ai) => (
                <div
                  key={ai.id}
                  className="absolute w-2 h-2 rounded-full border border-white"
                  style={{
                    backgroundColor: ai.color,
                    top: `${Math.round((ai.z / TRACK_LENGTH) * 100)}%`,
                    left: `${50 + ai.x * 25}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ON-SCREEN VIRTUAL MOBILE CONTROLS (Responsive Touch Buttons) */}
        <div className="w-full mt-4 flex items-center justify-between px-2 gap-4 select-none touch-none">
          {/* Left steering group */}
          <div className="flex items-center gap-3">
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                audioRef.current.init();
                inputRef.current.left = true;
              }}
              onTouchEnd={() => (inputRef.current.left = false)}
              onTouchCancel={() => (inputRef.current.left = false)}
              onMouseDown={() => {
                audioRef.current.init();
                inputRef.current.left = true;
              }}
              onMouseUp={() => (inputRef.current.left = false)}
              onMouseLeave={() => (inputRef.current.left = false)}
              aria-label="Steer Left"
              className="w-16 h-16 sm:w-20 sm:h-20 select-none touch-none rounded-2xl bg-slate-800/90 active:bg-violet-600 border-2 border-slate-700 active:border-white shadow-xl flex flex-col items-center justify-center text-white text-xl font-black transition-transform active:scale-95"
            >
              <span>⬅</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Left</span>
            </button>

            <button
              onTouchStart={(e) => {
                e.preventDefault();
                audioRef.current.init();
                inputRef.current.right = true;
              }}
              onTouchEnd={() => (inputRef.current.right = false)}
              onTouchCancel={() => (inputRef.current.right = false)}
              onMouseDown={() => {
                audioRef.current.init();
                inputRef.current.right = true;
              }}
              onMouseUp={() => (inputRef.current.right = false)}
              onMouseLeave={() => (inputRef.current.right = false)}
              aria-label="Steer Right"
              className="w-16 h-16 sm:w-20 sm:h-20 select-none touch-none rounded-2xl bg-slate-800/90 active:bg-violet-600 border-2 border-slate-700 active:border-white shadow-xl flex flex-col items-center justify-center text-white text-xl font-black transition-transform active:scale-95"
            >
              <span>➡</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Right</span>
            </button>
          </div>

          {/* Right pedals group (Brake & Accelerator) */}
          <div className="flex items-center gap-3">
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                audioRef.current.init();
                inputRef.current.brake = true;
              }}
              onTouchEnd={() => (inputRef.current.brake = false)}
              onTouchCancel={() => (inputRef.current.brake = false)}
              onMouseDown={() => {
                audioRef.current.init();
                inputRef.current.brake = true;
              }}
              onMouseUp={() => (inputRef.current.brake = false)}
              onMouseLeave={() => (inputRef.current.brake = false)}
              aria-label="Brake"
              className="w-16 h-16 sm:w-20 sm:h-20 select-none touch-none rounded-2xl bg-rose-950/80 active:bg-rose-600 border-2 border-rose-500/60 active:border-white shadow-xl flex flex-col items-center justify-center text-rose-300 active:text-white font-black transition-transform active:scale-95"
            >
              <span className="text-xl">🛑</span>
              <span className="text-[9px] font-black uppercase mt-0.5">BRAKE</span>
            </button>

            <button
              onTouchStart={(e) => {
                e.preventDefault();
                audioRef.current.init();
                inputRef.current.accelerate = true;
              }}
              onTouchEnd={() => (inputRef.current.accelerate = false)}
              onTouchCancel={() => (inputRef.current.accelerate = false)}
              onMouseDown={() => {
                audioRef.current.init();
                inputRef.current.accelerate = true;
              }}
              onMouseUp={() => (inputRef.current.accelerate = false)}
              onMouseLeave={() => (inputRef.current.accelerate = false)}
              aria-label="Gas Accelerator"
              className="w-20 h-16 sm:w-24 sm:h-20 select-none touch-none rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 active:from-emerald-500 active:to-green-600 border-2 border-emerald-400 active:border-white shadow-xl flex flex-col items-center justify-center text-white font-black transition-transform active:scale-95"
            >
              <span className="text-xl">⚡</span>
              <span className="text-[10px] font-black tracking-wider uppercase mt-0.5">GAS</span>
            </button>
          </div>
        </div>

        {/* Keyboard Controls Tip on Desktop */}
        <p className="mt-3 text-[11px] text-slate-400 hidden sm:block">
          Desktop controls: <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">W / ↑</kbd> Gas, <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">S / ↓</kbd> Brake, <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">A / ←</kbd> Left, <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">D / →</kbd> Right
        </p>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title={gameWon ? `🏆 Podium Finish! ${position === 1 ? '1st Place Winner!' : `P${position} Finish!`}` : 'Race Finished!'}
        score={speed}
        highScore={bestLapTime ? Math.round(bestLapTime * 10) : 0}
        message={
          position === 1
            ? 'Incredible driving! You took P1 across all 3 laps at Monza!'
            : `Completed 3 laps! Final finish position: P${position}. Best lap: ${bestLapTime?.toFixed(2)}s.`
        }
        onRestart={restartRace}
      />
    </GameLayout>
  );
};
