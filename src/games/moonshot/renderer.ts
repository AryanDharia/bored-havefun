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
      countdownSeconds?: number;
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
      countdownSeconds,
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
      bannerMessage
    });

    // 10. Overlays (Launch Countdown, Paused, Level Cleared, etc.)
    if (status === 'countdown' && countdownSeconds !== undefined) {
      this.renderCountdownOverlay(ctx, countdownSeconds);
    } else if (status === 'paused') {
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
      const flicker = 0.8 + Math.random() * 0.4;
      const flameLen = 14 * flicker;

      // Outer orange flame
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-5, 9);
      ctx.lineTo(5, 9);
      ctx.lineTo(0, 9 + flameLen);
      ctx.closePath();
      ctx.fill();

      // Middle bright yellow flame
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-3, 9);
      ctx.lineTo(3, 9);
      ctx.lineTo(0, 9 + flameLen * 0.65);
      ctx.closePath();
      ctx.fill();

      // Inner cyan/white core
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(-1.5, 9);
      ctx.lineTo(1.5, 9);
      ctx.lineTo(0, 9 + flameLen * 0.35);
      ctx.closePath();
      ctx.fill();
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
    }
  ) {
    const { rocket, score, highScore, levelId, levelName, targetsRemaining, bannerMessage } =
      data;

    ctx.save();

    // Top Telemetry Header Bar
    ctx.fillStyle = 'rgba(7, 9, 15, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 44);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 44);
    ctx.lineTo(CANVAS_WIDTH, 44);
    ctx.stroke();

    ctx.font = 'bold 11px "JetBrains Mono", monospace';

    // --- Left: Score, Best & Level ---
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('SCORE', 16, 17);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText(String(score).padStart(5, '0'), 58, 17);

    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('BEST', 16, 34);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(String(highScore).padStart(5, '0'), 58, 34);

    // Level info
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`LVL ${levelId}/8:`, 130, 25);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(levelName.toUpperCase(), 185, 25);

    // --- Center: Banner Message ---
    if (bannerMessage) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';

      // Status color matching
      if (bannerMessage.includes('CRASH')) {
        ctx.fillStyle = '#ef4444';
      } else if (bannerMessage.includes('SUCCESS') || bannerMessage.includes('COMPLETE')) {
        ctx.fillStyle = '#10b981';
      } else if (bannerMessage.includes('FUEL LOW') || bannerMessage.includes('WARNING')) {
        ctx.fillStyle = '#f59e0b';
      } else {
        ctx.fillStyle = '#38bdf8';
      }
      ctx.fillText(bannerMessage, CANVAS_WIDTH / 2, 25);
    }

    // --- Right: Speed, Gear, Ammo & Fuel ---
    ctx.textAlign = 'right';
    const speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
    const speedColor = speed <= MAX_LANDING_SPEED ? '#10b981' : '#ef4444';

    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('SPD:', CANVAS_WIDTH - 280, 17);
    ctx.fillStyle = speedColor;
    ctx.fillText(`${speed.toFixed(1)} px/s`, CANVAS_WIDTH - 215, 17);

    // Gear indicator
    const isGearReady = rocket.gearExtension >= 0.95;
    const isGearTucked = rocket.gearExtension <= 0.05;
    const gearText = isGearReady
      ? 'DEPLOYED'
      : isGearTucked
      ? 'RETRACTED'
      : 'TRANSIT...';
    const gearColor = isGearReady
      ? '#10b981'
      : isGearTucked
      ? '#f59e0b'
      : '#fbbf24';

    ctx.fillStyle = '#94a3b8';
    ctx.fillText('GEAR [G]:', CANVAS_WIDTH - 280, 34);
    ctx.fillStyle = gearColor;
    ctx.fillText(gearText, CANVAS_WIDTH - 215, 34);

    // Ammo count
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('AMMO:', CANVAS_WIDTH - 150, 17);
    ctx.fillStyle = rocket.ammo > 3 ? '#ffffff' : '#ef4444';
    ctx.fillText(`${rocket.ammo}/${rocket.maxAmmo}`, CANVAS_WIDTH - 95, 17);

    // Target count
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('TARGETS:', CANVAS_WIDTH - 150, 34);
    ctx.fillStyle = targetsRemaining === 0 ? '#10b981' : '#f59e0b';
    ctx.fillText(String(targetsRemaining), CANVAS_WIDTH - 95, 34);

    // --- Fuel Bar (Far Right) ---
    const fuelPct = Math.max(0, rocket.fuel / rocket.maxFuel);
    const fuelBarW = 75;
    const fuelBarH = 12;
    const fuelBarX = CANVAS_WIDTH - 85;
    const fuelBarY = 16;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(fuelBarX, fuelBarY, fuelBarW, fuelBarH);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(fuelBarX, fuelBarY, fuelBarW, fuelBarH);

    // Color gradient based on fuel level
    let fuelFillColor = '#10b981';
    if (fuelPct < 0.25) fuelFillColor = '#ef4444';
    else if (fuelPct < 0.5) fuelFillColor = '#f59e0b';

    ctx.fillStyle = fuelFillColor;
    ctx.fillRect(fuelBarX + 1, fuelBarY + 1, (fuelBarW - 2) * fuelPct, fuelBarH - 2);

    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`FUEL ${Math.round(fuelPct * 100)}%`, fuelBarX + fuelBarW / 2, fuelBarY + 9);

    ctx.restore();
  }

  private renderCountdownOverlay(
    ctx: CanvasRenderingContext2D,
    seconds: number
  ) {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 3, 8, 0.6)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.font = '900 48px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 16;

    const text = seconds > 0 ? String(seconds) : 'LAUNCH!';
    ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.shadowBlur = 0;
    ctx.fillText('IGNITE THRUSTERS WITH [UP] / [W]', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
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
