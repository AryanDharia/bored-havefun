import type {
  Rocket,
  LandingPad,
  TerrainPoint,
  Target,
  Projectile,
  Particle,
  Star,
  GameStatus
} from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAX_LANDING_SPEED } from './physics';

export class MoonshotRenderer {
  private stars: Star[] = [];

  constructor() {
    this.initStars();
  }

  private initStars() {
    this.stars = [];
    const count = 90;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (CANVAS_HEIGHT * 0.8), // mostly in upper sky
        radius: 0.8 + Math.random() * 1.4,
        alpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 1.5 + Math.random() * 3,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    state: {
      rocket: Rocket;
      pads: LandingPad[];
      terrain: TerrainPoint[];
      targets: Target[];
      projectiles: Projectile[];
      particles: Particle[];
      status: GameStatus;
      levelId: number;
      levelName: string;
      score: number;
      highScore: number;
      bannerMessage: string;
      bannerTimer: number;
      time: number;
    }
  ) {
    const {
      rocket,
      pads,
      terrain,
      targets,
      projectiles,
      particles,
      status,
      levelId,
      levelName,
      score,
      highScore,
      bannerMessage,
      time
    } = state;

    // 1. Deep Space Canvas Background (Pure Retro Black)
    ctx.fillStyle = '#020308';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Stars
    this.renderStars(ctx, time);

    // 3. Moon Terrain
    this.renderTerrain(ctx, terrain);

    // 4. Landing Pads
    this.renderLandingPads(ctx, pads, time);

    // 5. Targets (Bubbles, Asteroids, Satellites)
    this.renderTargets(ctx, targets, time);

    // 6. Projectiles
    this.renderProjectiles(ctx, projectiles);

    // 7. Particles & Explosions
    this.renderParticles(ctx, particles);

    // 8. Rocket (unless crashed)
    if (status !== 'crashed') {
      this.renderRocket(ctx, rocket);
    }

    // 9. Retro Flash Minimalist HUD
    this.renderHUD(ctx, {
      rocket,
      score,
      highScore,
      levelId,
      levelName,
      targetsRemaining: targets.length,
      bannerMessage,
      status
    });

    // 10. Overlays (Paused, etc.)
    if (status === 'paused') {
      this.renderPausedOverlay(ctx);
    }
  }

  private renderStars(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    for (const star of this.stars) {
      const alpha =
        star.alpha *
        (0.65 + 0.35 * Math.sin(time * star.twinkleSpeed + star.twinklePhase));
      ctx.fillStyle = `rgba(240, 246, 255, ${alpha.toFixed(3)})`;
      ctx.fillRect(
        Math.floor(star.x),
        Math.floor(star.y),
        star.radius,
        star.radius
      );
    }
    ctx.restore();
  }

  private renderTerrain(ctx: CanvasRenderingContext2D, terrain: TerrainPoint[]) {
    if (terrain.length < 2) return;

    ctx.save();
    // Fill lunar surface
    ctx.beginPath();
    ctx.moveTo(terrain[0].x, terrain[0].y);
    for (let i = 1; i < terrain.length; i++) {
      ctx.lineTo(terrain[i].x, terrain[i].y);
    }
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.lineTo(0, CANVAS_HEIGHT);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 350, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#1a1d29');
    grad.addColorStop(0.3, '#12141c');
    grad.addColorStop(1, '#090a0f');
    ctx.fillStyle = grad;
    ctx.fill();

    // Sharp glowing lunar contour ridge line
    ctx.beginPath();
    ctx.moveTo(terrain[0].x, terrain[0].y);
    for (let i = 1; i < terrain.length; i++) {
      ctx.lineTo(terrain[i].x, terrain[i].y);
    }
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Subtle inner crater ridge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private renderLandingPads(
    ctx: CanvasRenderingContext2D,
    pads: LandingPad[],
    time: number
  ) {
    ctx.save();
    for (const pad of pads) {
      const padWidth = pad.x2 - pad.x1;
      const midX = (pad.x1 + pad.x2) / 2;
      const padY = pad.y;

      const isDest = pad.isDestination;
      const primaryColor = isDest ? '#10b981' : '#06b6d4';
      const beaconColor = isDest ? '#34d399' : '#38bdf8';

      // 1. Foundation Base Slab
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(pad.x1 - 2, padY, padWidth + 4, 6);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pad.x1 - 2, padY, padWidth + 4, 6);

      // 2. Pad Surface Runway
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(pad.x1, padY, padWidth, 3);

      // 3. Glowing Runway Strip / Hazard Markers
      ctx.fillStyle = primaryColor;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 6;
      ctx.fillRect(pad.x1, padY - 1, padWidth, 2);
      ctx.shadowBlur = 0;

      // Center Runway Crosshair / Circle
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(midX, padY - 1, 8, Math.PI, 0, false);
      ctx.stroke();

      // Center target dot
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(midX - 1.5, padY - 2.5, 3, 2);

      // 4. Left & Right Beacon Towers
      const beaconBlink = Math.sin(time * 6) > 0;
      const leftBeacon = pad.x1 + 3;
      const rightBeacon = pad.x2 - 3;

      // Beacon Staffs
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftBeacon, padY);
      ctx.lineTo(leftBeacon, padY - 9);
      ctx.moveTo(rightBeacon, padY);
      ctx.lineTo(rightBeacon, padY - 9);
      ctx.stroke();

      // Flashing Beacon Light Orbs
      ctx.fillStyle = beaconBlink ? beaconColor : 'rgba(255, 255, 255, 0.2)';
      ctx.shadowColor = beaconColor;
      ctx.shadowBlur = beaconBlink ? 8 : 0;

      ctx.beginPath();
      ctx.arc(leftBeacon, padY - 9, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(rightBeacon, padY - 9, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 5. Label below pad
      ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText(pad.name.toUpperCase(), midX, padY + 16);
    }
    ctx.restore();
  }

  private renderTargets(
    ctx: CanvasRenderingContext2D,
    targets: Target[],
    time: number
  ) {
    ctx.save();
    for (const t of targets) {
      if (t.type === 'bubble') {
        // --- 1. GLOWING RETRO BUBBLE ---
        const wobble = Math.sin(time * 3 + t.x) * 1.5;
        const rad = t.radius + wobble * 0.5;

        // Outer glow
        ctx.save();
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, rad, 0, Math.PI * 2);
        ctx.stroke();

        // Translucent iridescent center
        ctx.fillStyle = t.color;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(t.x, t.y, rad, 0, Math.PI * 2);
        ctx.fill();

        // Highlight shine arc
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(t.x - rad * 0.3, t.y - rad * 0.3, rad * 0.45, Math.PI * 0.9, Math.PI * 1.6);
        ctx.stroke();
        ctx.restore();
      } else if (t.type === 'asteroid') {
        // --- 2. CRAGGY RETRO ASTEROID ---
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rotation);

        // Craggy polygon
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        const steps = 7;
        for (let i = 0; i < steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          // Seeded pseudo-roughness using index
          const offset = ((i % 3) - 1) * 3;
          const r = t.radius + offset;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crater markings
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(t.radius * 0.2, -t.radius * 0.2, t.radius * 0.28, 0, Math.PI * 2);
        ctx.fill();

        // Health pip indicator if 2+ HP
        if (t.hp > 1) {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-4, -2, 8, 3);
        }
        ctx.restore();
      } else if (t.type === 'satellite') {
        // --- 3. DURABLE SATELLITE CORE ---
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rotation);

        // Solar panels (left and right wings)
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;

        // Left wing
        ctx.fillRect(-t.radius - 12, -7, 12, 14);
        ctx.strokeRect(-t.radius - 12, -7, 12, 14);
        // Right wing
        ctx.fillRect(t.radius, -7, 12, 14);
        ctx.strokeRect(t.radius, -7, 12, 14);

        // Central Pod Body
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, t.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glowing crystal core
        const pulse = 0.6 + 0.4 * Math.sin(time * 5);
        ctx.fillStyle = `rgba(234, 179, 8, ${pulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        // HP Pips
        ctx.restore();
        ctx.fillStyle = '#ef4444';
        const pipW = 6;
        const totalW = t.maxHp * pipW + (t.maxHp - 1) * 2;
        const startX = t.x - totalW / 2;
        for (let h = 0; h < t.maxHp; h++) {
          ctx.fillStyle = h < t.hp ? '#10b981' : '#475569';
          ctx.fillRect(startX + h * (pipW + 2), t.y - t.radius - 10, pipW, 3);
        }
      }
    }
    ctx.restore();
  }

  private renderProjectiles(
    ctx: CanvasRenderingContext2D,
    projectiles: Projectile[]
  ) {
    ctx.save();
    for (const p of projectiles) {
      // Sleek glowing plasma needle
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';

      const angle = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      // Energy bolt
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-8, -1.5, 12, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -0.75, 8, 1.5);

      ctx.restore();
    }
    ctx.restore();
  }

  private renderParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[]
  ) {
    ctx.save();
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      if (p.shape === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillRect(
          Math.floor(p.x - p.size / 2),
          Math.floor(p.y - p.size / 2),
          p.size,
          p.size
        );
      }
    }
    ctx.restore();
  }

  private renderRocket(
    ctx: CanvasRenderingContext2D,
    rocket: Rocket
  ) {
    const { x, y, angle, gearExtension, isThrusting, fuel } = rocket;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // --- 1. EXHAUST FLAME ---
    if (isThrusting && fuel > 0) {
      const flicker = 0.85 + Math.random() * 0.35;
      const flameLen = 18 * flicker;

      // Outer glowing flame aura
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 12;

      // Outer orange flame
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-5.5, 9);
      ctx.lineTo(5.5, 9);
      ctx.lineTo(0, 9 + flameLen);
      ctx.closePath();
      ctx.fill();

      // Middle bright amber/yellow flame
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-3.5, 9);
      ctx.lineTo(3.5, 9);
      ctx.lineTo(0, 9 + flameLen * 0.7);
      ctx.closePath();
      ctx.fill();

      // Inner electric cyan core
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(-2, 9);
      ctx.lineTo(2, 9);
      ctx.lineTo(0, 9 + flameLen * 0.4);
      ctx.closePath();
      ctx.fill();

      // Central white thrust needle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-1, 9);
      ctx.lineTo(1, 9);
      ctx.lineTo(0, 9 + flameLen * 0.2);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
    }

    // --- 2. ANIMATED MECHANICAL LANDING LEGS ---
    // Leg extension goes from 0 (tucked) to 1 (deployed)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.8;
    ctx.fillStyle = '#cbd5e1';

    // Left leg: pivots from rocket shoulder (-7, 4) down and out to foot (-5 - 6*gear, 9 + 5*gear)
    const leftFootX = -5 - 6 * gearExtension;
    const leftFootY = 9 + 5 * gearExtension;
    ctx.beginPath();
    ctx.moveTo(-7, 4);
    ctx.lineTo(leftFootX, leftFootY);
    ctx.stroke();

    // Left footpad (horizontal contact bar)
    ctx.beginPath();
    ctx.moveTo(leftFootX - 3.5, leftFootY);
    ctx.lineTo(leftFootX + 3.5, leftFootY);
    ctx.stroke();

    // Right leg: pivots from (7, 4) out to foot (5 + 6*gear, 9 + 5*gear)
    const rightFootX = 5 + 6 * gearExtension;
    const rightFootY = 9 + 5 * gearExtension;
    ctx.beginPath();
    ctx.moveTo(7, 4);
    ctx.lineTo(rightFootX, rightFootY);
    ctx.stroke();

    // Right footpad
    ctx.beginPath();
    ctx.moveTo(rightFootX - 3.5, rightFootY);
    ctx.lineTo(rightFootX + 3.5, rightFootY);
    ctx.stroke();

    // --- 3. ROCKET HULL (Minimalist Retro Flash Triangle) ---
    // Outer shadow/border
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, -14); // Nose
    ctx.lineTo(8, 8); // Right fin outer
    ctx.lineTo(5, 9); // Right engine shoulder
    ctx.lineTo(-5, 9); // Left engine shoulder
    ctx.lineTo(-8, 8); // Left fin outer
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central keel line for geometric Flash depth
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(0, 9);
    ctx.stroke();

    // Cockpit Porthole
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Rear engine nozzle
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-3, 8, 6, 2);

    ctx.restore();
  }

  private renderHUD(
    ctx: CanvasRenderingContext2D,
    data: {
      rocket: Rocket;
      score: number;
      highScore: number;
      levelId: number;
      levelName: string;
      targetsRemaining: number;
      bannerMessage: string;
      status?: GameStatus;
    }
  ) {
    const {
      rocket,
      score,
      highScore,
      levelId,
      levelName,
      targetsRemaining,
      bannerMessage,
      status
    } = data;

    ctx.save();

    // -------------------------------------------------------------------------
    // 1. TOP TELEMETRY HEADER BAR (y: 0 to 50)
    // -------------------------------------------------------------------------
    ctx.fillStyle = 'rgba(10, 15, 26, 0.94)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 50);

    // Subtle bottom border
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 50);
    ctx.lineTo(CANVAS_WIDTH, 50);
    ctx.stroke();

    // =========================================================================
    // REGION 1: TOP LEFT (x: 16 to 230) — Score, Best & Level
    // =========================================================================
    ctx.textAlign = 'left';

    // Row 1: Score & Best
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('SCORE', 16, 19);

    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(score).padStart(5, '0'), 58, 19);

    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('BEST', 114, 19);

    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(String(highScore).padStart(5, '0'), 146, 19);

    // Row 2: Level / Sector
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`SECTOR ${levelId}/8:`, 16, 38);

    ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(levelName.toUpperCase(), 100, 38);

    // =========================================================================
    // REGION 2: TOP CENTER (x: 240 to 560, centered at 400) — Game Status & Hint
    // =========================================================================
    const centerX = CANVAS_WIDTH / 2;

    // Status mapping
    let statusText = '● IN FLIGHT';
    let statusColor = '#38bdf8';
    let statusBg = 'rgba(56, 189, 248, 0.12)';
    let statusBorder = 'rgba(56, 189, 248, 0.35)';

    switch (status) {
      case 'ready':
        statusText = '● READY FOR LIFTOFF';
        statusColor = '#38bdf8';
        statusBg = 'rgba(56, 189, 248, 0.12)';
        statusBorder = 'rgba(56, 189, 248, 0.35)';
        break;
      case 'launching':
        statusText = '▲ ASCENDING';
        statusColor = '#60a5fa';
        statusBg = 'rgba(96, 165, 250, 0.15)';
        statusBorder = 'rgba(96, 165, 250, 0.4)';
        break;
      case 'flying':
        statusText = '● IN FLIGHT';
        statusColor = '#38bdf8';
        statusBg = 'rgba(56, 189, 248, 0.12)';
        statusBorder = 'rgba(56, 189, 248, 0.35)';
        break;
      case 'landing_approach':
        statusText = '▼ LANDING APPROACH';
        statusColor = '#fbbf24';
        statusBg = 'rgba(251, 191, 36, 0.15)';
        statusBorder = 'rgba(251, 191, 36, 0.4)';
        break;
      case 'landing':
      case 'landed':
        statusText = '● TOUCHDOWN CONFIRMED';
        statusColor = '#34d399';
        statusBg = 'rgba(52, 211, 153, 0.15)';
        statusBorder = 'rgba(52, 211, 153, 0.4)';
        break;
      case 'refueling':
        statusText = '● REFUELING & RELOADING';
        statusColor = '#34d399';
        statusBg = 'rgba(52, 211, 153, 0.18)';
        statusBorder = 'rgba(52, 211, 153, 0.5)';
        break;
      case 'ready_for_takeoff':
        statusText = '● DOCKED - READY TO FLY';
        statusColor = '#38bdf8';
        statusBg = 'rgba(56, 189, 248, 0.12)';
        statusBorder = 'rgba(56, 189, 248, 0.35)';
        break;
      case 'crashed':
        statusText = '▲ CRASH DETECTED';
        statusColor = '#f87171';
        statusBg = 'rgba(248, 113, 113, 0.18)';
        statusBorder = 'rgba(248, 113, 113, 0.5)';
        break;
      case 'level_cleared':
        statusText = '★ MISSION COMPLETE';
        statusColor = '#34d399';
        statusBg = 'rgba(52, 211, 153, 0.2)';
        statusBorder = 'rgba(52, 211, 153, 0.5)';
        break;
      case 'paused':
        statusText = '❚❚ PAUSED';
        statusColor = '#fbbf24';
        statusBg = 'rgba(251, 191, 36, 0.15)';
        statusBorder = 'rgba(251, 191, 36, 0.4)';
        break;
    }

    // Status Pill (Row 1)
    const pillW = 180;
    const pillH = 20;
    const pillX = centerX - pillW / 2;
    const pillY = 6;

    ctx.fillStyle = statusBg;
    ctx.fillRect(pillX, pillY, pillW, pillH);
    ctx.strokeStyle = statusBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(pillX, pillY, pillW, pillH);

    ctx.textAlign = 'center';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = statusColor;
    ctx.fillText(statusText, centerX, pillY + 14);

    // Context Guidance Hint (Row 2)
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    if (status === 'landing_approach') {
      if (rocket.gearExtension < 0.9) {
        ctx.fillStyle = '#f87171';
        ctx.fillText('DEPLOY LANDING GEAR [G]!', centerX, 41);
      } else {
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('TOUCHDOWN SMOOTHLY (<44 px/s)', centerX, 41);
      }
    } else if (status === 'ready' || status === 'ready_for_takeoff') {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('HOLD [↑/W] TO IGNITE THRUSTERS', centerX, 41);
    } else if (status === 'crashed') {
      ctx.fillStyle = '#f87171';
      ctx.fillText('PRESS [R] TO RETRY SECTOR', centerX, 41);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.fillText('SPACE: SHOOT  •  G: GEAR', centerX, 41);
    }

    // =========================================================================
    // REGION 3: TOP RIGHT (x: 570 to 784) — Fuel Bar, Speed & Ammo
    // =========================================================================
    // Row 1: Fuel Bar & Percentage
    ctx.textAlign = 'left';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('FUEL', 585, 19);

    const fuelPct = Math.max(0, Math.min(1, rocket.fuel / rocket.maxFuel));
    const fuelBarX = 618;
    const fuelBarY = 9;
    const fuelBarW = 110;
    const fuelBarH = 13;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(fuelBarX, fuelBarY, fuelBarW, fuelBarH);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(fuelBarX, fuelBarY, fuelBarW, fuelBarH);

    let fuelFillColor = '#10b981';
    if (fuelPct < 0.25) fuelFillColor = '#ef4444';
    else if (fuelPct < 0.5) fuelFillColor = '#f59e0b';

    ctx.fillStyle = fuelFillColor;
    ctx.fillRect(fuelBarX + 1, fuelBarY + 1, (fuelBarW - 2) * fuelPct, fuelBarH - 2);

    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(fuelPct * 100)}%`, 784, 19);

    // Row 2: Speed & Ammo
    ctx.textAlign = 'left';
    const speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
    const isDangerousSpeed = speed > MAX_LANDING_SPEED;

    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('SPD:', 585, 38);

    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillStyle = isDangerousSpeed ? '#ef4444' : '#10b981';
    ctx.fillText(`${speed.toFixed(1)} px/s`, 614, 38);

    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('AMMO:', 710, 38);

    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillStyle = rocket.ammo > 2 ? '#38bdf8' : '#ef4444';
    ctx.fillText(`${rocket.ammo}/${rocket.maxAmmo}`, 750, 38);

    // =========================================================================
    // 2. SECONDARY TELEMETRY ROW (y: 54 to 76) — Gear & Targets Pills
    // =========================================================================
    // Left: Landing Gear State Pill
    const isGearReady = rocket.gearExtension >= 0.95;
    const isGearTucked = rocket.gearExtension <= 0.05;
    const gearText = isGearReady
      ? 'DEPLOYED'
      : isGearTucked
      ? 'RETRACTED'
      : 'IN TRANSIT...';
    const gearColor = isGearReady
      ? '#10b981'
      : isGearTucked
      ? '#f43f5e'
      : '#fbbf24';

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(16, 56, 170, 20);
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 56, 170, 20);

    ctx.textAlign = 'left';
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('GEAR [G]:', 24, 70);
    ctx.fillStyle = gearColor;
    ctx.fillText(gearText, 88, 70);

    // Right: Targets Remaining Pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(CANVAS_WIDTH - 186, 56, 170, 20);
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(CANVAS_WIDTH - 186, 56, 170, 20);

    ctx.textAlign = 'right';
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ORBITAL TARGETS:', CANVAS_WIDTH - 50, 70);
    ctx.fillStyle = targetsRemaining === 0 ? '#10b981' : '#f59e0b';
    ctx.fillText(
      targetsRemaining === 0 ? 'CLEARED ✓' : String(targetsRemaining),
      CANVAS_WIDTH - 24,
      70
    );

    // =========================================================================
    // 3. DEDICATED FLOATING EVENT BANNER (y: 84 to 112)
    // =========================================================================
    // Rendered ONLY when there is an active event message, strictly isolated!
    if (bannerMessage) {
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      const textMetrics = ctx.measureText(bannerMessage);
      const bannerW = Math.min(620, Math.max(260, textMetrics.width + 36));
      const bannerH = 24;
      const bannerX = centerX - bannerW / 2;
      const bannerY = 84;

      let bannerBg = 'rgba(7, 10, 19, 0.92)';
      let bannerBorder = '#38bdf8';
      let bannerTextCol = '#38bdf8';

      if (bannerMessage.includes('CRASH') || bannerMessage.includes('COLLIDED')) {
        bannerBorder = '#ef4444';
        bannerTextCol = '#fca5a5';
      } else if (
        bannerMessage.includes('SUCCESS') ||
        bannerMessage.includes('COMPLETE') ||
        bannerMessage.includes('SAFE') ||
        bannerMessage.includes('REFUELED')
      ) {
        bannerBorder = '#10b981';
        bannerTextCol = '#6ee7b7';
      } else if (bannerMessage.includes('WARNING') || bannerMessage.includes('CAUTION')) {
        bannerBorder = '#f59e0b';
        bannerTextCol = '#fde68a';
      }

      // Backdrop shadow & glow
      ctx.shadowColor = bannerBorder;
      ctx.shadowBlur = 8;
      ctx.fillStyle = bannerBg;
      ctx.fillRect(bannerX, bannerY, bannerW, bannerH);

      ctx.strokeStyle = bannerBorder;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
      ctx.shadowBlur = 0;

      // Text inside banner
      ctx.textAlign = 'center';
      ctx.fillStyle = bannerTextCol;
      ctx.fillText(bannerMessage, centerX, bannerY + 16);
    }

    ctx.restore();
  }



  private renderPausedOverlay(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 3, 8, 0.75)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.font = '900 32px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#f97316';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 12;
    ctx.fillText('MISSION PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.shadowBlur = 0;
    ctx.fillText('Press [P] or [ESC] to Resume Flight', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);
    ctx.restore();
  }
}
