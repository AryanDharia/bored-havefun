import type {
  CakeLayer,
  FallingSlice,
  CakeParticle,
  FloatingBanner
} from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LAYER_HEIGHT,
  BASE_PEDESTAL_Y,
  CAKE_FLAVORS
} from './physics';

export class CakeRenderer {
  private particles: CakeParticle[] = [];
  private floatingBanners: FloatingBanner[] = [];
  private sliceFlashes: { x: number; y: number; height: number; alpha: number }[] = [];
  private backgroundStars: { x: number; y: number; size: number; speed: number; alpha: number }[] = [];
  private shimmerTimer: number = 0;

  constructor() {
    this.initBackgroundStars();
  }

  private initBackgroundStars(): void {
    this.backgroundStars = [];
    for (let i = 0; i < 30; i++) {
      this.backgroundStars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: 1 + Math.random() * 2.5,
        speed: 0.2 + Math.random() * 0.4,
        alpha: 0.2 + Math.random() * 0.5
      });
    }
  }

  public reset(): void {
    this.particles = [];
    this.floatingBanners = [];
    this.sliceFlashes = [];
    this.shimmerTimer = 0;
  }

  public triggerPerfectBurst(x: number, y: number, width: number): void {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const px = x + (i / (count - 1)) * width;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 2.0 + Math.random() * 3.5;

      this.particles.push({
        x: px,
        y: y + LAYER_HEIGHT / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: i % 2 === 0 ? '#fbbf24' : '#fef08a',
        alpha: 1,
        life: 0,
        maxLife: 32,
        shape: Math.random() > 0.4 ? 'star' : 'spark'
      });
    }
  }

  public triggerCrumbs(x: number, y: number, color: string): void {
    for (let i = 0; i < 9; i++) {
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = 1.2 + Math.random() * 2.8;

      this.particles.push({
        x: x + (Math.random() * 4 - 2),
        y: y + (Math.random() * LAYER_HEIGHT),
        vx: Math.cos(angle) * speed,
        vy: -0.8 - Math.random() * 2.0,
        size: 2 + Math.random() * 3,
        color,
        alpha: 1,
        life: 0,
        maxLife: 24,
        shape: 'crumb'
      });
    }
  }

  public triggerSliceFlash(x: number, y: number, height: number): void {
    this.sliceFlashes.push({ x, y, height, alpha: 1.0 });
  }

  public triggerStrawberryBonus(x: number, y: number, width: number): void {
    for (let i = 0; i < 12; i++) {
      const px = x + Math.random() * width;
      this.particles.push({
        x: px,
        y: y + Math.random() * LAYER_HEIGHT,
        vx: (Math.random() - 0.5) * 2.0,
        vy: -1.5 - Math.random() * 2.2,
        size: 4 + Math.random() * 4,
        color: '#f43f5e',
        alpha: 1,
        life: 0,
        maxLife: 36,
        shape: 'heart'
      });
    }
  }

  public addBanner(x: number, y: number, text: string, color: string, isCombo: boolean = false): void {
    this.floatingBanners.push({
      id: Date.now() + Math.random(),
      x,
      y,
      text,
      color,
      scale: 0.6,
      alpha: 1,
      life: 0,
      maxLife: 42,
      isCombo
    });
  }

  public update(): void {
    this.shimmerTimer += 0.05;

    // Update background ambient stars
    for (const star of this.backgroundStars) {
      star.y -= star.speed;
      if (star.y < 0) {
        star.y = CANVAS_HEIGHT;
        star.x = Math.random() * CANVAS_WIDTH;
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // gravity
      p.life++;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update slice flash animations
    for (let i = this.sliceFlashes.length - 1; i >= 0; i--) {
      const flash = this.sliceFlashes[i];
      flash.alpha -= 0.12;
      if (flash.alpha <= 0) {
        this.sliceFlashes.splice(i, 1);
      }
    }

    // Update floating text banners
    for (let i = this.floatingBanners.length - 1; i >= 0; i--) {
      const b = this.floatingBanners[i];
      b.life++;
      b.y -= 1.2;

      // Pop in scale animation
      if (b.life < 8) {
        b.scale = 0.6 + (b.life / 8) * 0.55;
      } else {
        b.scale = 1.15;
      }

      b.alpha = Math.max(0, 1 - b.life / b.maxLife);

      if (b.life >= b.maxLife) {
        this.floatingBanners.splice(i, 1);
      }
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    stack: CakeLayer[],
    movingLayer: CakeLayer | null,
    fallingSlices: FallingSlice[],
    cameraY: number
  ): void {
    ctx.save();

    // 1. Draw chic dessert-shop ambient backdrop
    this.renderBackground(ctx);

    // 2. Camera Transformation
    ctx.save();
    ctx.translate(0, cameraY);

    // 3. Draw Pedestal / Cake Stand
    this.renderPedestal(ctx);

    // 4. Draw Stacked Cake Layers (bottom to top)
    for (let i = 0; i < stack.length; i++) {
      const layer = stack[i];
      const isTop = i === stack.length - 1 && movingLayer === null;
      this.renderLayer(ctx, layer, isTop);
    }

    // 5. Draw Guide Projection Shadow for Moving Layer
    if (movingLayer && stack.length > 0) {
      const topStack = stack[stack.length - 1];
      this.renderGuideShadow(ctx, movingLayer, topStack);
    }

    // 6. Draw Moving Layer
    if (movingLayer) {
      this.renderLayer(ctx, movingLayer, false, true);
    }

    // 7. Draw Falling Slices
    for (const slice of fallingSlices) {
      this.renderFallingSlice(ctx, slice);
    }

    // 8. Draw Slice Cut Flashes
    this.renderSliceFlashes(ctx);

    // 9. Draw Particle System
    this.renderParticles(ctx);

    // 10. Draw Floating Banners
    this.renderFloatingBanners(ctx);

    ctx.restore(); // Restore camera transform

    ctx.restore();
  }

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    // Rich bakery gradient: deep plum charcoal to espresso
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#130d17');
    bgGrad.addColorStop(0.5, '#0d0910');
    bgGrad.addColorStop(1, '#070509');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle pastry kitchen grid & ambient radial glow
    const radial = ctx.createRadialGradient(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT * 0.45,
      20,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT * 0.45,
      CANVAS_WIDTH * 0.8
    );
    radial.addColorStop(0, 'rgba(244, 63, 94, 0.08)');
    radial.addColorStop(0.5, 'rgba(249, 115, 22, 0.04)');
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Ambient floating confection sparkles
    ctx.save();
    for (const star of this.backgroundStars) {
      ctx.fillStyle = `rgba(255, 241, 242, ${star.alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderPedestal(ctx: CanvasRenderingContext2D): void {
    const y = BASE_PEDESTAL_Y;
    const centerX = CANVAS_WIDTH / 2;
    const plateWidth = 320;
    const plateHeight = 22;

    ctx.save();

    // Tabletop soft shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(centerX, y + 54, plateWidth * 0.55, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pedestal weighted base foot
    const baseGrad = ctx.createLinearGradient(centerX - 90, y + 42, centerX + 90, y + 52);
    baseGrad.addColorStop(0, '#475569');
    baseGrad.addColorStop(0.5, '#94a3b8');
    baseGrad.addColorStop(1, '#334155');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.roundRect(centerX - 80, y + 40, 160, 14, [6, 6, 2, 2]);
    ctx.fill();

    // Central decorative column
    const colGrad = ctx.createLinearGradient(centerX - 24, y + 16, centerX + 24, y + 40);
    colGrad.addColorStop(0, '#334155');
    colGrad.addColorStop(0.4, '#cbd5e1');
    colGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = colGrad;
    ctx.beginPath();
    ctx.moveTo(centerX - 35, y + 16);
    ctx.lineTo(centerX + 35, y + 16);
    ctx.lineTo(centerX + 24, y + 42);
    ctx.lineTo(centerX - 24, y + 42);
    ctx.closePath();
    ctx.fill();

    // Top porcelain/marble cake platter
    const plateGrad = ctx.createLinearGradient(centerX - plateWidth / 2, y, centerX + plateWidth / 2, y + plateHeight);
    plateGrad.addColorStop(0, '#64748b');
    plateGrad.addColorStop(0.3, '#f1f5f9');
    plateGrad.addColorStop(0.7, '#cbd5e1');
    plateGrad.addColorStop(1, '#475569');
    ctx.fillStyle = plateGrad;

    ctx.beginPath();
    ctx.ellipse(centerX, y + plateHeight / 2, plateWidth / 2, plateHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Scalloped gold / porcelain rim line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Platter surface lace paper doily
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(centerX, y + plateHeight / 2 - 2, plateWidth * 0.44, (plateHeight / 2) * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderLayer(
    ctx: CanvasRenderingContext2D,
    layer: CakeLayer,
    isTop: boolean,
    isMoving: boolean = false
  ): void {
    const flavor = CAKE_FLAVORS[layer.flavorIndex % CAKE_FLAVORS.length];
    const { x, y, width, height } = layer;
    const radius = 5;

    ctx.save();

    // Moving layer subtle pulsating aura
    if (isMoving) {
      ctx.shadowColor = layer.specialType === 'golden' ? '#fbbf24' : 'rgba(249, 115, 22, 0.45)';
      ctx.shadowBlur = 10;
    }

    // 1. Base Sponge Body
    const spongeGrad = ctx.createLinearGradient(x, y, x, y + height);
    if (layer.specialType === 'golden') {
      spongeGrad.addColorStop(0, '#fef08a');
      spongeGrad.addColorStop(0.5, '#f59e0b');
      spongeGrad.addColorStop(1, '#b45309');
    } else if (layer.specialType === 'rainbow') {
      spongeGrad.addColorStop(0, '#f472b6');
      spongeGrad.addColorStop(0.33, '#fde047');
      spongeGrad.addColorStop(0.66, '#4ade80');
      spongeGrad.addColorStop(1, '#38bdf8');
    } else {
      spongeGrad.addColorStop(0, flavor.spongeTop);
      spongeGrad.addColorStop(1, flavor.spongeBottom);
    }

    ctx.fillStyle = spongeGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();

    // 2. Middle Horizontal Cream / Ganache Ribbon
    const creamY = y + height * 0.46;
    const creamHeight = height * 0.22;
    ctx.fillStyle = layer.specialType === 'rainbow' ? '#ffffff' : flavor.cream;
    ctx.fillRect(x + 1, creamY, width - 2, creamHeight);

    // Cream piping pearl dots
    const dotSpacing = 14;
    const dotCount = Math.floor(width / dotSpacing);
    ctx.fillStyle = layer.specialType === 'golden' ? '#fffbeb' : flavor.cream;
    for (let d = 0; d < dotCount; d++) {
      const dotX = x + 7 + d * dotSpacing;
      ctx.beginPath();
      ctx.arc(dotX, creamY + creamHeight / 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Top Glaze / Frosting Cap
    const glazeGrad = ctx.createLinearGradient(x, y, x, y + height * 0.38);
    glazeGrad.addColorStop(0, layer.specialType === 'golden' ? '#fde047' : flavor.glaze);
    glazeGrad.addColorStop(1, layer.specialType === 'golden' ? '#d97706' : flavor.spongeTop);
    ctx.fillStyle = glazeGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height * 0.38, [radius, radius, 0, 0]);
    ctx.fill();

    // Frosting drips on bottom of glaze
    if (width > 24) {
      const dripCount = Math.min(6, Math.floor(width / 28));
      ctx.fillStyle = layer.specialType === 'golden' ? '#f59e0b' : flavor.glaze;
      for (let i = 0; i < dripCount; i++) {
        const dripX = x + 10 + i * (width / (dripCount + 1));
        const dripLen = 3 + (i % 3) * 2;
        ctx.beginPath();
        ctx.arc(dripX, y + height * 0.38 + dripLen, 2.0, 0, Math.PI);
        ctx.fill();
      }
    }

    // 4. Glossy Top Bevel Highlight (3D Pastry Sheen)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(x + radius, y + 1.5, Math.max(0, width - radius * 2), 2);

    // 5. Bottom Ambient Shadow against layer beneath
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(x + 1, y + height - 2.5, width - 2, 2.5);

    // 6. Special Shimmer Overlay for Golden / Strawberry
    if (layer.specialType === 'golden') {
      const shimmerX = x + ((Math.sin(this.shimmerTimer) + 1) / 2) * width;
      const shimmerGrad = ctx.createLinearGradient(shimmerX - 25, y, shimmerX + 25, y);
      shimmerGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      shimmerGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
      shimmerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = shimmerGrad;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.fill();
    } else if (layer.specialType === 'strawberry') {
      // Strawberry ruby accents on top
      const berryCount = Math.max(1, Math.floor(width / 36));
      for (let b = 0; b < berryCount; b++) {
        const bx = x + 12 + b * 32;
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(bx, y + 3, 3.5, 0, Math.PI * 2);
        ctx.fill();
        // Little mint leaf
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(bx - 1, y - 1, 2, 2);
      }
    }

    // 7. Decorative Topper on topmost layer (Cherries & Sprinkles!)
    if (isTop && width >= 20) {
      this.renderTopTopper(ctx, x, y, width);
    }

    ctx.restore();
  }

  private renderTopTopper(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
    const centerX = x + width / 2;

    // Whipped cream rosette in center
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, y - 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX, y - 8, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Glossy Red Maraschino Cherry
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(centerX, y - 10, 5, 0, Math.PI * 2);
    ctx.fill();

    // Cherry specular highlight
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(centerX - 1.5, y - 12, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Cherry curved stem
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, y - 15);
    ctx.quadraticCurveTo(centerX + 6, y - 22, centerX + 10, y - 20);
    ctx.stroke();

    // Side sprinkles
    if (width > 60) {
      const colors = ['#f43f5e', '#38bdf8', '#fbbf24', '#4ade80'];
      for (let s = 0; s < 4; s++) {
        const sx = centerX + (s % 2 === 0 ? -1 : 1) * (14 + s * 6);
        ctx.fillStyle = colors[s % colors.length];
        ctx.fillRect(sx, y - 2, 4, 2);
      }
    }
  }

  private renderGuideShadow(
    ctx: CanvasRenderingContext2D,
    movingLayer: CakeLayer,
    topStack: CakeLayer
  ): void {
    const overlapStart = Math.max(movingLayer.x, topStack.x);
    const overlapEnd = Math.min(movingLayer.x + movingLayer.width, topStack.x + topStack.width);
    const overlapWidth = overlapEnd - overlapStart;

    if (overlapWidth > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(249, 115, 22, 0.28)';
      ctx.fillRect(overlapStart, topStack.y, overlapWidth, 3);

      // Soft vertical guide lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(overlapStart, movingLayer.y + movingLayer.height);
      ctx.lineTo(overlapStart, topStack.y);
      ctx.moveTo(overlapEnd, movingLayer.y + movingLayer.height);
      ctx.lineTo(overlapEnd, topStack.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderFallingSlice(ctx: CanvasRenderingContext2D, slice: FallingSlice): void {
    const flavor = CAKE_FLAVORS[slice.flavorIndex % CAKE_FLAVORS.length];
    const { width, height } = slice;

    ctx.save();
    ctx.globalAlpha = slice.alpha;
    ctx.translate(slice.x + width / 2, slice.y + height / 2);
    ctx.rotate(slice.rotation);

    // Draw slice body centered at origin
    const halfW = width / 2;
    const halfH = height / 2;

    const spongeGrad = ctx.createLinearGradient(-halfW, -halfH, -halfW, halfH);
    if (slice.specialType === 'golden') {
      spongeGrad.addColorStop(0, '#fef08a');
      spongeGrad.addColorStop(1, '#b45309');
    } else if (slice.specialType === 'rainbow') {
      spongeGrad.addColorStop(0, '#f472b6');
      spongeGrad.addColorStop(1, '#38bdf8');
    } else {
      spongeGrad.addColorStop(0, flavor.spongeTop);
      spongeGrad.addColorStop(1, flavor.spongeBottom);
    }

    ctx.fillStyle = spongeGrad;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, width, height, 4);
    ctx.fill();

    // Cream filling
    ctx.fillStyle = flavor.cream;
    ctx.fillRect(-halfW + 1, -halfH + height * 0.4, width - 2, height * 0.22);

    // Glaze cap
    ctx.fillStyle = flavor.glaze;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, width, height * 0.35, [4, 4, 0, 0]);
    ctx.fill();

    ctx.restore();
  }

  private renderSliceFlashes(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const flash of this.sliceFlashes) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${flash.alpha})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(flash.x, flash.y - 4);
      ctx.lineTo(flash.x, flash.y + flash.height + 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'star') {
        this.drawStar(ctx, p.x, p.y, p.size);
      } else if (p.shape === 'heart') {
        this.drawHeart(ctx, p.x, p.y, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(
        cx + r * Math.cos(((18 + i * 72) * Math.PI) / 180),
        cy - r * Math.sin(((18 + i * 72) * Math.PI) / 180)
      );
      ctx.lineTo(
        cx + (r / 2) * Math.cos(((54 + i * 72) * Math.PI) / 180),
        cy - (r / 2) * Math.sin(((54 + i * 72) * Math.PI) / 180)
      );
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 2, x, y + size);
    ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.closePath();
    ctx.fill();
  }

  private renderFloatingBanners(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const b of this.floatingBanners) {
      ctx.globalAlpha = b.alpha;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(b.scale, b.scale);

      ctx.font = b.isCombo
        ? '900 20px "JetBrains Mono", ui-monospace, monospace'
        : 'bold 15px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Text glow shadow
      ctx.shadowColor = b.color;
      ctx.shadowBlur = b.isCombo ? 12 : 6;

      ctx.fillStyle = b.color;
      ctx.fillText(b.text, 0, 0);

      ctx.restore();
    }
    ctx.restore();
  }
}
