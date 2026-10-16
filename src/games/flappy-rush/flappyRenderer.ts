import type { PipBird, PipePair, FlappyParticle, FloatingScore } from './types';

export const VIRTUAL_WIDTH = 400;
export const VIRTUAL_HEIGHT = 600;
export const GROUND_HEIGHT = 100;
export const PLAYABLE_HEIGHT = VIRTUAL_HEIGHT - GROUND_HEIGHT; // 500

export class FlappyRenderer {
  private particles: FlappyParticle[] = [];
  private floatingScores: FloatingScore[] = [];
  private cloudScroll: number = 0;
  private hillScroll: number = 0;
  private groundScroll: number = 0;

  public reset(): void {
    this.particles = [];
    this.floatingScores = [];
    this.cloudScroll = 0;
    this.hillScroll = 0;
    this.groundScroll = 0;
  }

  public triggerFlapParticles(x: number, y: number): void {
    // Air puff & feather particles
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x - 10,
        y: y + 4 + (Math.random() * 8 - 4),
        vx: -1.5 - Math.random() * 1.5,
        vy: 1.0 + Math.random() * 1.5,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.4 ? '#fef08a' : '#ffffff',
        alpha: 0.9,
        life: 0,
        maxLife: 22,
        shape: i === 0 ? 'feather' : 'circle'
      });
    }
  }

  public triggerScoreSparkles(x: number, y: number): void {
    // Star & coin sparkles
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.4;
      const speed = 1.5 + Math.random() * 2.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color: i % 2 === 0 ? '#fbbf24' : '#38bdf8',
        alpha: 1,
        life: 0,
        maxLife: 26,
        shape: 'spark'
      });
    }

    this.floatingScores.push({
      id: Math.random().toString(),
      text: '+1',
      x,
      y: y - 10,
      alpha: 1,
      life: 0,
      maxLife: 35
    });
  }

  public triggerHitSparks(x: number, y: number): void {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#f97316' : '#ef4444',
        alpha: 1,
        life: 0,
        maxLife: 30,
        shape: 'spark'
      });
    }
  }

  public update(dt: number, speed: number, isMoving: boolean): void {
    if (isMoving) {
      this.groundScroll = (this.groundScroll + speed * (dt * 60)) % 24;
      this.hillScroll = (this.hillScroll + speed * 0.3 * (dt * 60)) % 400;
      this.cloudScroll = (this.cloudScroll + speed * 0.12 * (dt * 60)) % 400;
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

    // Update floating scores
    for (let i = this.floatingScores.length - 1; i >= 0; i--) {
      const s = this.floatingScores[i];
      s.y -= dt * 30;
      s.life++;
      s.alpha = 1 - s.life / s.maxLife;
      if (s.life >= s.maxLife) {
        this.floatingScores.splice(i, 1);
      }
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    bird: PipBird,
    pipes: PipePair[],
    score: number,
    isReady: boolean
  ): void {
    ctx.save();
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // 1. Cheerful Daytime Arcade Sky
    this.renderSky(ctx);

    // 2. Parallax Floating Clouds
    this.renderClouds(ctx);

    // 3. Parallax Rolling Hills & Tree Silhouettes
    this.renderHills(ctx);

    // 4. Pipes & Obstacle Towers
    this.renderPipes(ctx, pipes);

    // 5. Two-Tier Animated Ground
    this.renderGround(ctx);

    // 6. Particles & Sparkles
    this.renderParticles(ctx);

    // 7. Floating Score Popups
    this.renderFloatingScores(ctx);

    // 8. Pip the Rocket Bird
    this.renderBird(ctx, bird);

    // 9. Retro In-Game Score Numerals (during active play)
    if (!isReady) {
      this.renderScore(ctx, score);
    }

    ctx.restore();
  }

  private renderSky(ctx: CanvasRenderingContext2D): void {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, PLAYABLE_HEIGHT);
    skyGrad.addColorStop(0, '#0284c7'); // Rich sky blue
    skyGrad.addColorStop(0.5, '#38bdf8');
    skyGrad.addColorStop(0.85, '#bae6fd');
    skyGrad.addColorStop(1, '#fef08a'); // Warm golden horizon
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, PLAYABLE_HEIGHT);

    // Distant arcade sun with soft glow
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(320, 75, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(320, 75, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderClouds(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const clouds = [
      { x: 40 - this.cloudScroll, y: 55, scale: 0.85 },
      { x: 190 - this.cloudScroll, y: 90, scale: 0.65 },
      { x: 330 - this.cloudScroll, y: 40, scale: 1.0 },
      { x: 40 - this.cloudScroll + 400, y: 55, scale: 0.85 },
      { x: 190 - this.cloudScroll + 400, y: 90, scale: 0.65 },
      { x: 330 - this.cloudScroll + 400, y: 40, scale: 1.0 }
    ];

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    for (const c of clouds) {
      if (c.x < -100 || c.x > VIRTUAL_WIDTH + 100) continue;
      this.drawCloud(ctx, c.x, c.y, c.scale);
    }
    ctx.restore();
  }

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    ctx.beginPath();
    ctx.arc(x, y, 16 * s, 0, Math.PI * 2);
    ctx.arc(x + 14 * s, y - 8 * s, 18 * s, 0, Math.PI * 2);
    ctx.arc(x + 32 * s, y - 4 * s, 15 * s, 0, Math.PI * 2);
    ctx.arc(x + 44 * s, y, 14 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderHills(ctx: CanvasRenderingContext2D, _unused?: number): void {
    ctx.save();
    // Far Hill Silhouette
    ctx.fillStyle = '#6ee7b7';
    ctx.beginPath();
    ctx.moveTo(0, PLAYABLE_HEIGHT);

    for (let x = 0; x <= VIRTUAL_WIDTH + 40; x += 40) {
      const hillY = PLAYABLE_HEIGHT - 65 - Math.sin((x + this.hillScroll * 0.5) * 0.015) * 25;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(VIRTUAL_WIDTH, PLAYABLE_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Near Hill with trees
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(0, PLAYABLE_HEIGHT);

    for (let x = 0; x <= VIRTUAL_WIDTH + 30; x += 30) {
      const hillY = PLAYABLE_HEIGHT - 35 - Math.sin((x + this.hillScroll) * 0.02) * 18;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(VIRTUAL_WIDTH, PLAYABLE_HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private renderPipes(ctx: CanvasRenderingContext2D, pipes: PipePair[]): void {
    ctx.save();
    for (const pipe of pipes) {
      if (pipe.x < -80 || pipe.x > VIRTUAL_WIDTH + 80) continue;

      const pW = pipe.width;
      const collarW = pW + 10;
      const collarH = 24;
      const collarOffset = 5;

      // 1. Top Pipe Shaft
      this.drawPipeShaft(ctx, pipe.x, 0, pW, pipe.topHeight - collarH);
      // Top Pipe Lip Collar
      this.drawPipeCollar(ctx, pipe.x - collarOffset, pipe.topHeight - collarH, collarW, collarH, false);

      // 2. Bottom Pipe Shaft
      this.drawPipeShaft(ctx, pipe.x, pipe.bottomY + collarH, pW, PLAYABLE_HEIGHT - (pipe.bottomY + collarH));
      // Bottom Pipe Lip Collar
      this.drawPipeCollar(ctx, pipe.x - collarOffset, pipe.bottomY, collarW, collarH, true);

      // 3. Floating Speed Gem inside the gap (if not collected yet)
      if (!pipe.gemCollected) {
        const gemX = pipe.x + pW / 2;
        const gemY = pipe.topHeight + pipe.gap / 2;
        this.drawSpeedGem(ctx, gemX, gemY);
      }
    }
    ctx.restore();
  }

  private drawPipeShaft(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (h <= 0) return;
    // Metallic Green / Emerald Gradient with specular highlight stripe
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#065f46'); // Deep forest shadow
    grad.addColorStop(0.2, '#059669');
    grad.addColorStop(0.45, '#34d399'); // Specular highlight
    grad.addColorStop(0.7, '#10b981');
    grad.addColorStop(1, '#047857'); // Shadow edge

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Pipe outline
    ctx.strokeStyle = '#064e3b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Subtle metallic rivets
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let ry = y + 25; ry < y + h - 10; ry += 35) {
      ctx.fillRect(x + 6, ry, 3, 3);
      ctx.fillRect(x + w - 9, ry, 3, 3);
    }
  }

  private drawPipeCollar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    _isBottom: boolean
  ): void {
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#065f46');
    grad.addColorStop(0.25, '#10b981');
    grad.addColorStop(0.5, '#6ee7b7');
    grad.addColorStop(0.75, '#10b981');
    grad.addColorStop(1, '#047857');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();

    ctx.strokeStyle = '#064e3b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Highlight line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(x + 8, y + 4, w - 16, 2.5);
  }

  private drawSpeedGem(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const bob = Math.sin(Date.now() * 0.007) * 4;
    const gY = y + bob;

    ctx.save();
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 12;

    // Golden Diamond
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(x, gY - 9);
    ctx.lineTo(x + 8, gY);
    ctx.lineTo(x, gY + 9);
    ctx.lineTo(x - 8, gY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Specular star glint
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 2, gY - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderGround(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // 1. Lush Green Grass Strip
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, PLAYABLE_HEIGHT, VIRTUAL_WIDTH, 14);

    // Grass blade highlights
    ctx.fillStyle = '#86efac';
    for (let x = -24; x < VIRTUAL_WIDTH + 24; x += 12) {
      const gx = x - this.groundScroll;
      ctx.beginPath();
      ctx.moveTo(gx, PLAYABLE_HEIGHT + 14);
      ctx.lineTo(gx + 4, PLAYABLE_HEIGHT + 3);
      ctx.lineTo(gx + 8, PLAYABLE_HEIGHT + 14);
      ctx.fill();
    }

    // Border line between grass and dirt
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, PLAYABLE_HEIGHT + 14, VIRTUAL_WIDTH, 3);

    // 2. Earth / Soil Body
    const soilGrad = ctx.createLinearGradient(0, PLAYABLE_HEIGHT + 17, 0, VIRTUAL_HEIGHT);
    soilGrad.addColorStop(0, '#78350f');
    soilGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = soilGrad;
    ctx.fillRect(0, PLAYABLE_HEIGHT + 17, VIRTUAL_WIDTH, GROUND_HEIGHT - 17);

    // 3. Diagonal Earth Strips (Scrolling)
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.28)';
    ctx.lineWidth = 3.5;
    const step = 24;
    for (let x = -step * 2; x < VIRTUAL_WIDTH + step * 2; x += step) {
      const sx = x - this.groundScroll;
      ctx.beginPath();
      ctx.moveTo(sx, PLAYABLE_HEIGHT + 17);
      ctx.lineTo(sx + 35, VIRTUAL_HEIGHT);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderBird(ctx: CanvasRenderingContext2D, bird: PipBird): void {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate((bird.rotation * Math.PI) / 180);

    const isFlapping = bird.wingFrame === 1;

    // 1. Bird Drop Shadow on ground when low
    if (bird.y > PLAYABLE_HEIGHT - 80) {
      ctx.save();
      ctx.scale(1, 0.3);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.arc(0, (PLAYABLE_HEIGHT - bird.y) * 3, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Round Golden Body
    const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, bird.radius);
    bodyGrad.addColorStop(0, '#fef08a'); // Highlight
    bodyGrad.addColorStop(0.4, '#f59e0b'); // Warm Amber
    bodyGrad.addColorStop(1, '#d97706'); // Shading

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Cream Chest Patch
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.ellipse(4, 5, 8, 5, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // 4. Fluttering Tail Feathers
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-bird.radius + 2, -2);
    ctx.lineTo(-bird.radius - 8, -6);
    ctx.lineTo(-bird.radius - 6, 2);
    ctx.lineTo(-bird.radius - 9, 8);
    ctx.lineTo(-bird.radius + 2, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Cute Aviator Leather Cap on Head
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(0, -5, bird.radius - 1, Math.PI, Math.PI * 2);
    ctx.fill();

    // Cyan Aviator Goggle Lenses
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(1, -12, 9, 7, 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, -12, 9, 7);

    // Goggle specular shine
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, -11, 3, 2);

    // 6. Large Expressive Cartoon Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, -2, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Iris & Pupil (Look forward)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(8, -2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye Glint
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(9, -3.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 7. Orange Beak
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(11, -3);
    ctx.lineTo(21, 2);
    ctx.lineTo(10, 6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Beak smile division
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(11, 2);
    ctx.lineTo(18, 2);
    ctx.stroke();

    // 8. Animated Wing
    ctx.save();
    const wingY = isFlapping ? -4 : 2;
    const wingAngle = isFlapping ? -0.35 : 0.15;
    ctx.translate(-3, wingY);
    ctx.rotate(wingAngle);

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 6, -Math.PI / 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      if (p.shape === 'spark') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.shape === 'feather') {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * 2, p.size, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private renderFloatingScores(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'black 18px monospace';

    for (const s of this.floatingScores) {
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fillText(s.text, s.x, s.y);
    }
    ctx.restore();
  }

  private renderScore(ctx: CanvasRenderingContext2D, score: number): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const text = score.toString();
    const x = VIRTUAL_WIDTH / 2;
    const y = 35;

    // Retro Arcade Outline & Fill
    ctx.font = 'black 48px monospace';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.strokeText(text, x, y);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);
    ctx.restore();
  }
}
