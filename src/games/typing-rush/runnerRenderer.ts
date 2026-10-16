import type { Particle, FloatingNotice, SpeedOrb, RunnerState, GameMode } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 380;
const ROAD_Y = 280;

export class RunnerRenderer {
  private particles: Particle[] = [];
  private floatingNotices: FloatingNotice[] = [];
  private speedOrbs: SpeedOrb[] = [];
  private worldX: number = 0;
  private roadStripOffset: number = 0;
  private afterImages: { x: number; y: number; frame: number; alpha: number; color: string }[] = [];

  constructor() {
    this.initOrbs();
  }

  private initOrbs(): void {
    this.speedOrbs = [];
    for (let i = 0; i < 20; i++) {
      this.speedOrbs.push({
        x: 400 + i * 180 + (Math.random() * 40 - 20),
        y: ROAD_Y - 35 - Math.random() * 20,
        collected: false,
        type: i % 4 === 0 ? 'boost' : 'coin',
        floatOffset: Math.random() * Math.PI * 2
      });
    }
  }

  public reset(): void {
    this.particles = [];
    this.floatingNotices = [];
    this.afterImages = [];
    this.worldX = 0;
    this.roadStripOffset = 0;
    this.initOrbs();
  }

  public triggerWordBoost(x: number, y: number, combo: number): void {
    // Burst particles
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5) * 0.4;
      const speed = 2.5 + Math.random() * 4.5;
      this.particles.push({
        x,
        y: y - 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        size: 3 + Math.random() * 4,
        color: combo >= 5 ? '#38bdf8' : '#f97316',
        life: 0,
        maxLife: 28,
        alpha: 1,
        shape: i % 3 === 0 ? 'spark' : 'circle'
      });
    }

    const boostLabel = combo >= 10 ? '🔥 HYPER DRIVE!' : combo >= 5 ? '⚡ NITRO BOOST!' : '+BOOST!';
    this.addFloatingNotice(boostLabel, x + 30, y - 55, combo >= 5 ? '#38bdf8' : '#fbbf24');
  }

  public triggerMistakeGlitch(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: x + (Math.random() * 20 - 10),
        y: y - 20 + (Math.random() * 20 - 10),
        vx: (Math.random() - 0.5) * 4 - 2,
        vy: (Math.random() - 0.5) * 3,
        size: 3 + Math.random() * 3,
        color: '#ef4444',
        life: 0,
        maxLife: 20,
        alpha: 1,
        shape: 'spark'
      });
    }
  }

  public addFloatingNotice(text: string, x: number, y: number, color: string = '#f97316'): void {
    this.floatingNotices.push({
      id: Math.random().toString(),
      text,
      x,
      y,
      color,
      life: 0,
      maxLife: 45
    });
  }

  public update(
    dt: number,
    runner: RunnerState,
    wpm: number,
    _distance: number,
    targetDistance: number,
    mode: GameMode
  ): void {
    // Advance world scroll based on runner speed
    const advance = runner.speed * (dt * 60);
    this.worldX += advance;
    this.roadStripOffset = (this.roadStripOffset + advance) % 60;

    // Runner animation frame update
    if (runner.speed > 0.5) {
      const frameSpeedMultiplier = Math.max(0.6, runner.speed / 4.5);
      runner.animationTimer += dt * 14 * frameSpeedMultiplier;
      if (runner.animationTimer >= 1) {
        runner.animationFrame = (runner.animationFrame + 1) % 6;
        runner.animationTimer = 0;
      }
    } else {
      runner.animationFrame = 0;
      runner.animationTimer = 0;
    }

    // After-image trails when running at high WPM or during boost
    if ((wpm >= 65 || runner.boostTimer > 0) && Math.random() < 0.4) {
      this.afterImages.push({
        x: runner.x,
        y: runner.y,
        frame: runner.animationFrame,
        alpha: 0.55,
        color: runner.boostTimer > 0 ? '#38bdf8' : '#f97316'
      });
    }

    // Update after-images
    for (let i = this.afterImages.length - 1; i >= 0; i--) {
      const img = this.afterImages[i];
      img.x -= advance * 0.4;
      img.alpha -= dt * 2.2;
      if (img.alpha <= 0) {
        this.afterImages.splice(i, 1);
      }
    }

    // Heel exhaust particles
    if (runner.speed > 1.5 && Math.random() < 0.7) {
      const isSuper = wpm >= 75 || runner.boostTimer > 0;
      this.particles.push({
        x: runner.x - 12,
        y: runner.y + 4,
        vx: -runner.speed * 0.4 - Math.random() * 2,
        vy: -Math.random() * 1.5 - 0.2,
        size: 2.5 + Math.random() * 3.5,
        color: isSuper ? (Math.random() > 0.5 ? '#38bdf8' : '#0284c7') : (Math.random() > 0.5 ? '#f97316' : '#fbbf24'),
        life: 0,
        maxLife: 20,
        alpha: 0.9
      });
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 1 - p.life / p.maxLife;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating notices
    for (let i = this.floatingNotices.length - 1; i >= 0; i--) {
      const notice = this.floatingNotices[i];
      notice.y -= dt * 22;
      notice.life++;
      if (notice.life >= notice.maxLife) {
        this.floatingNotices.splice(i, 1);
      }
    }

    // Update Speed Orbs (recycle orbs smoothly as player runs)
    for (const orb of this.speedOrbs) {
      orb.floatOffset += dt * 4;
      // Check collection
      if (!orb.collected && Math.abs(orb.x - this.worldX - runner.x) < 32) {
        orb.collected = true;
        // Spawn sparkle particles
        for (let j = 0; j < 6; j++) {
          this.particles.push({
            x: runner.x + 10,
            y: orb.y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            size: 2.5 + Math.random() * 2,
            color: orb.type === 'boost' ? '#38bdf8' : '#fbbf24',
            life: 0,
            maxLife: 20,
            alpha: 1,
            shape: 'spark'
          });
        }
      }

      // Recycle orb when scrolled off screen to the left
      if (orb.x - this.worldX < -150) {
        // If in Speed Run mode, don't spawn past finish
        if (mode === 'speed-run' && (this.worldX + CANVAS_WIDTH + 200) / 10 > targetDistance) {
          continue;
        }
        orb.x += 20 * 180;
        orb.collected = false;
        orb.type = Math.random() > 0.3 ? 'coin' : 'boost';
      }
    }

    // Timers
    if (runner.stumbleTimer > 0) runner.stumbleTimer -= dt;
    if (runner.boostTimer > 0) runner.boostTimer -= dt;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    runner: RunnerState,
    wpm: number,
    _accuracy: number,
    distance: number,
    targetDistance: number,
    mode: GameMode,
    isComboActive: boolean
  ): void {
    ctx.save();
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Synthwave Cyber Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, ROAD_Y);
    skyGrad.addColorStop(0, '#06070c');
    skyGrad.addColorStop(0.35, '#120d22');
    skyGrad.addColorStop(0.7, '#2a1128');
    skyGrad.addColorStop(0.9, '#631f1c');
    skyGrad.addColorStop(1, '#ff6a00');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, ROAD_Y);

    // 2. Giant Retro Synthwave Sun
    this.renderSynthSun(ctx);

    // 3. Distant Geometric Mountains (Parallax layer 1: 0.08x)
    this.renderMountains(ctx, this.worldX * 0.08);

    // 4. Distant Cyber Skyline (Parallax layer 2: 0.22x)
    this.renderSkyline(ctx, this.worldX * 0.22);

    // 5. Overhead Highway Arches & Neon Signs (Parallax layer 3: 0.65x)
    this.renderOverheadTrusses(ctx, this.worldX * 0.65);

    // 6. Asphalt Racetrack & Roadside Markings
    this.renderRoad(ctx, this.roadStripOffset, distance, targetDistance, mode);

    // 7. Collectible Speed Orbs / Energy Rings
    this.renderOrbs(ctx);

    // 8. Runner After-Images (Ghost Trails)
    this.renderAfterImages(ctx);

    // 9. The Runner Hero ("Volt")
    this.renderRunner(ctx, runner, wpm, isComboActive);

    // 10. Particles & Exhaust Sparks
    this.renderParticles(ctx);

    // 11. Floating Score / Combo Notices
    this.renderFloatingNotices(ctx);

    // 12. High-speed Wind Streaks Overlay (when running fast)
    if (wpm >= 60 || runner.boostTimer > 0) {
      this.renderSpeedLines(ctx, wpm, runner.boostTimer > 0);
    }

    ctx.restore();
  }

  private renderSynthSun(ctx: CanvasRenderingContext2D): void {
    const sunX = CANVAS_WIDTH * 0.68;
    const sunY = 135;
    const radius = 54;

    ctx.save();
    const sunGrad = ctx.createLinearGradient(sunX, sunY - radius, sunX, sunY + radius);
    sunGrad.addColorStop(0, '#ffdf00');
    sunGrad.addColorStop(0.5, '#ff6200');
    sunGrad.addColorStop(1, '#ff0055');

    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Synthwave horizontal slice blind lines
    ctx.fillStyle = '#120d22';
    for (let i = 0; i < 6; i++) {
      const sliceY = sunY + 8 + i * 7;
      const height = 1.5 + i * 0.8;
      ctx.fillRect(sunX - radius - 2, sliceY, (radius + 2) * 2, height);
    }
    ctx.restore();
  }

  private renderMountains(ctx: CanvasRenderingContext2D, scrollX: number): void {
    ctx.save();
    ctx.fillStyle = '#191026';
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
    ctx.lineWidth = 1.5;

    const baseOffset = scrollX % 320;
    ctx.beginPath();
    ctx.moveTo(-50, ROAD_Y - 40);

    for (let x = -50 - baseOffset; x < CANVAS_WIDTH + 150; x += 160) {
      ctx.lineTo(x + 80, ROAD_Y - 110);
      ctx.lineTo(x + 160, ROAD_Y - 40);
    }
    ctx.lineTo(CANVAS_WIDTH + 50, ROAD_Y);
    ctx.lineTo(-50, ROAD_Y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private renderSkyline(ctx: CanvasRenderingContext2D, scrollX: number): void {
    ctx.save();
    const baseOffset = scrollX % 420;
    const buildingWidth = 35;

    for (let x = -100 - baseOffset; x < CANVAS_WIDTH + 120; x += buildingWidth) {
      const seed = Math.abs(Math.sin((x + baseOffset) * 999));
      const height = 45 + Math.floor(seed * 70);
      const bY = ROAD_Y - 20 - height;

      // Dark futuristic skyscraper silhouette
      ctx.fillStyle = '#0b0c16';
      ctx.fillRect(x, bY, buildingWidth - 3, height + 20);

      // Skyscraper roof neon antenna / accent
      ctx.fillStyle = seed > 0.5 ? '#f97316' : '#38bdf8';
      ctx.fillRect(x + 4, bY, buildingWidth - 11, 2);

      // Windows
      ctx.fillStyle = 'rgba(254, 215, 170, 0.25)';
      for (let wy = bY + 8; wy < ROAD_Y - 25; wy += 9) {
        if (seed * wy % 3 > 0.8) {
          ctx.fillRect(x + 6, wy, 4, 4);
          ctx.fillRect(x + 16, wy, 4, 4);
        }
      }
    }
    ctx.restore();
  }

  private renderOverheadTrusses(ctx: CanvasRenderingContext2D, scrollX: number): void {
    ctx.save();
    const spacing = 380;
    const offset = scrollX % spacing;

    for (let x = CANVAS_WIDTH + 100 - offset; x > -150; x -= spacing) {
      // Light pole arch
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, ROAD_Y);
      ctx.lineTo(x, ROAD_Y - 120);
      ctx.lineTo(x + 80, ROAD_Y - 150);
      ctx.stroke();

      // Neon street lamp
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x + 80, ROAD_Y - 150, 4, 0, Math.PI * 2);
      ctx.fill();

      // Cyber Billboard Sign
      if (Math.abs(Math.sin(x)) > 0.3) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1.5;
        const signW = 96;
        const signH = 26;
        ctx.fillRect(x - signW / 2, ROAD_Y - 130, signW, signH);
        ctx.strokeRect(x - signW / 2, ROAD_Y - 130, signW, signH);

        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const slogan = Math.sin(x) > 0 ? 'TURBO TYPING' : 'PLAYBREAK';
        ctx.fillText(slogan, x, ROAD_Y - 117);
      }
    }
    ctx.restore();
  }

  private renderRoad(
    ctx: CanvasRenderingContext2D,
    offset: number,
    _distance: number,
    targetDistance: number,
    mode: GameMode
  ): void {
    ctx.save();

    // 1. Shoulder curb
    ctx.fillStyle = '#1e1b29';
    ctx.fillRect(0, ROAD_Y - 10, CANVAS_WIDTH, 14);

    // Red & white reflective curb dashes
    const curbStep = 24;
    const curbOffset = offset % curbStep;
    for (let x = -curbStep; x < CANVAS_WIDTH + curbStep; x += curbStep) {
      const isRed = Math.floor((x + this.worldX) / curbStep) % 2 === 0;
      ctx.fillStyle = isRed ? '#ef4444' : '#ffffff';
      ctx.fillRect(x - curbOffset, ROAD_Y - 10, curbStep, 4);
    }

    // 2. Asphalt Road Body
    const roadGrad = ctx.createLinearGradient(0, ROAD_Y, 0, CANVAS_HEIGHT);
    roadGrad.addColorStop(0, '#0c0e17');
    roadGrad.addColorStop(0.3, '#141824');
    roadGrad.addColorStop(1, '#090a10');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, ROAD_Y, CANVAS_WIDTH, CANVAS_HEIGHT - ROAD_Y);

    // 3. Dashed Reflective Lane Dividers
    const dashLength = 36;
    const dashGap = 28;
    const cycle = dashLength + dashGap;
    const dashOffset = (offset * 1.5) % cycle;

    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
    ctx.shadowBlur = 6;

    for (let x = -cycle; x < CANVAS_WIDTH + cycle; x += cycle) {
      ctx.fillRect(x - dashOffset, ROAD_Y + 45, dashLength, 4);
    }
    ctx.shadowBlur = 0;

    // 4. Distance markers on road
    const markerInterval = 50; // every 50m
    const markerPixels = markerInterval * 10; // 500px per 50m
    const currentMarkerIdx = Math.floor(this.worldX / markerPixels);
    for (let i = currentMarkerIdx; i <= currentMarkerIdx + 2; i++) {
      const mX = i * markerPixels - this.worldX;
      if (mX >= -100 && mX <= CANVAS_WIDTH + 100 && i > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(mX, ROAD_Y + 10, 4, 60);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${i * markerInterval}m`, mX + 8, ROAD_Y + 25);
      }
    }

    // 5. Finish Line Arch (Speed Run mode)
    if (mode === 'speed-run') {
      const finishScreenX = targetDistance * 10 - this.worldX;
      if (finishScreenX >= -120 && finishScreenX <= CANVAS_WIDTH + 120) {
        // Finish Line on Ground (Checkered banner)
        const checkW = 10;
        const checkH = 10;
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 3; col++) {
            ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#000000';
            ctx.fillRect(finishScreenX + col * checkW, ROAD_Y + row * checkH, checkW, checkH);
          }
        }

        // Overhead Finish Arch Pillars
        ctx.fillStyle = '#f97316';
        ctx.fillRect(finishScreenX - 6, ROAD_Y - 140, 12, 140);
        ctx.fillRect(finishScreenX + 30, ROAD_Y - 140, 12, 140);

        // Header Banner
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(finishScreenX - 16, ROAD_Y - 170, 70, 32);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.strokeRect(finishScreenX - 16, ROAD_Y - 170, 70, 32);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'black 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FINISH', finishScreenX + 19, ROAD_Y - 150);
      }
    }

    ctx.restore();
  }

  private renderOrbs(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const orb of this.speedOrbs) {
      const screenX = orb.x - this.worldX;
      if (screenX >= -40 && screenX <= CANVAS_WIDTH + 40 && !orb.collected) {
        const floatY = orb.y + Math.sin(orb.floatOffset) * 5;

        ctx.save();
        ctx.shadowColor = orb.type === 'boost' ? '#38bdf8' : '#fbbf24';
        ctx.shadowBlur = 12;

        if (orb.type === 'boost') {
          // Blue energy ring
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(screenX, floatY, 8, 12, Math.PI / 4, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(screenX, floatY, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Gold coin
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(screenX, floatY, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(screenX - 1.5, floatY - 4, 3, 8);
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private renderAfterImages(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const img of this.afterImages) {
      ctx.globalAlpha = img.alpha * 0.45;
      ctx.fillStyle = img.color;

      // Render simplified runner silhouette as ghost trail
      const rX = img.x;
      const rY = img.y;
      ctx.beginPath();
      ctx.ellipse(rX, rY - 24, 10, 22, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderRunner(
    ctx: CanvasRenderingContext2D,
    runner: RunnerState,
    _wpm: number,
    isComboActive: boolean
  ): void {
    ctx.save();

    const rX = runner.x;
    const rY = runner.y;
    const frame = runner.animationFrame;
    const isStumbling = runner.stumbleTimer > 0;
    const isBoosting = runner.boostTimer > 0 || isComboActive;

    // Lean forward based on speed
    const lean = runner.speed > 0.5 ? Math.min(0.35, 0.12 + runner.speed * 0.02) : 0;

    ctx.translate(rX, rY);
    ctx.rotate(lean);

    // 1. Dynamic Runner Shadow on Asphalt
    ctx.save();
    ctx.scale(1, 0.4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 18, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Trailing Scarf / Wind Streamer (Reacts to running speed!)
    this.renderScarf(ctx, runner.speed, isBoosting);

    // 3. Stumble Glitch Flash
    if (isStumbling) {
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
    }

    // 4. Runner Body: Legs, Torso, Head, Visor
    this.renderRunnerLimbs(ctx, frame, runner.speed, isBoosting);

    ctx.restore();
  }

  private renderScarf(ctx: CanvasRenderingContext2D, speed: number, isBoosting: boolean): void {
    ctx.save();
    const scarfLength = 26 + Math.min(22, speed * 2.5);
    const wave = Math.sin(Date.now() * 0.018) * (3 + speed * 0.5);

    ctx.strokeStyle = isBoosting ? '#38bdf8' : '#f97316';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = isBoosting ? '#38bdf8' : '#f97316';
    ctx.shadowBlur = isBoosting ? 8 : 4;

    ctx.beginPath();
    ctx.moveTo(-6, -34);
    ctx.quadraticCurveTo(-scarfLength * 0.6, -34 + wave, -scarfLength, -32 - wave);
    ctx.stroke();
    ctx.restore();
  }

  private renderRunnerLimbs(
    ctx: CanvasRenderingContext2D,
    frame: number,
    speed: number,
    isBoosting: boolean
  ): void {
    ctx.save();

    // Gait angles for 6-frame run cycle
    const legCycle = [
      { left: -22, right: 26 },
      { left: -10, right: 12 },
      { left: 18, right: -18 },
      { left: 28, right: -25 },
      { left: 12, right: -8 },
      { left: -16, right: 20 }
    ];

    const currentGait = speed > 0.5 ? legCycle[frame] : { left: -4, right: 4 };

    // Back Leg
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2, -14);
    ctx.lineTo(currentGait.right * 0.7, -4);
    ctx.lineTo(currentGait.right, 4);
    ctx.stroke();

    // Back Shoe (Cyan or Orange accent)
    ctx.fillStyle = isBoosting ? '#38bdf8' : '#ea580c';
    ctx.fillRect(currentGait.right - 4, 3, 10, 5);

    // Torso / Jacket
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-8, -36, 16, 24, 4);
    ctx.fill();

    // Neon Chest Racing Stripe
    ctx.fillStyle = isBoosting ? '#38bdf8' : '#f97316';
    ctx.fillRect(-2, -34, 4, 18);

    // Front Leg
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(2, -14);
    ctx.lineTo(currentGait.left * 0.7, -4);
    ctx.lineTo(currentGait.left, 4);
    ctx.stroke();

    // Front Shoe
    ctx.fillStyle = isBoosting ? '#38bdf8' : '#ea580c';
    ctx.fillRect(currentGait.left - 4, 3, 10, 5);

    // Arms / Hands
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(-currentGait.left * 0.6, -22);
    ctx.lineTo(-currentGait.left * 0.9, -16);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(3, -42, 9, 0, Math.PI * 2);
    ctx.fill();

    // Visor Mask (Glowing cyan or fiery amber)
    ctx.fillStyle = isBoosting ? '#38bdf8' : '#f97316';
    ctx.shadowColor = isBoosting ? '#38bdf8' : '#f97316';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(4, -45, 9, 6, 2);
    ctx.fill();

    // Visor Glint
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(9, -44, 3, 2);

    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      if (p.shape === 'spark') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private renderFloatingNotices(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'black 14px monospace';

    for (const notice of this.floatingNotices) {
      const alpha = 1 - notice.life / notice.maxLife;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = notice.color;
      ctx.shadowColor = notice.color;
      ctx.shadowBlur = 8;
      ctx.fillText(notice.text, notice.x, notice.y);
    }
    ctx.restore();
  }

  private renderSpeedLines(ctx: CanvasRenderingContext2D, wpm: number, isBoosting: boolean): void {
    ctx.save();
    const count = isBoosting ? 18 : Math.floor((wpm - 50) / 4);
    ctx.strokeStyle = isBoosting ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < count; i++) {
      const y = 30 + (i * 27) % (ROAD_Y - 40);
      const x = ((Date.now() * 2 + i * 140) % (CANVAS_WIDTH + 200)) - 100;
      const length = 40 + (i % 4) * 20;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + length, y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
