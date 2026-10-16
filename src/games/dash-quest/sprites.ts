import type { Player, Enemy, Coin, Spring, Checkpoint, MovingPlatform, Particle } from './types';

// Palette definitions for the 3 distinct themes
export const THEMES = {
  valley: {
    skyTop: '#1e293b',
    skyBottom: '#38bdf8',
    mountainFar: '#1e3a8a',
    mountainMid: '#0284c7',
    groundTop: '#22c55e',
    groundSide: '#15803d',
    dirt: '#78350f',
    dirtDark: '#451a03',
    platform: '#059669',
    accent: '#f59e0b',
  },
  cavern: {
    skyTop: '#090a0f',
    skyBottom: '#1e1b4b',
    mountainFar: '#2e1065',
    mountainMid: '#4c1d95',
    groundTop: '#d97706',
    groundSide: '#b45309',
    dirt: '#1c1917',
    dirtDark: '#0c0a09',
    platform: '#b45309',
    accent: '#fbbf24',
  },
  citadel: {
    skyTop: '#030712',
    skyBottom: '#111827',
    mountainFar: '#1f2937',
    mountainMid: '#374151',
    groundTop: '#f97316',
    groundSide: '#ea580c',
    dirt: '#18181b',
    dirtDark: '#09090b',
    platform: '#ea580c',
    accent: '#38bdf8',
  },
};

/**
 * Render multi-layer parallax background
 */
export function renderBackground(
  ctx: CanvasRenderingContext2D,
  themeName: 'valley' | 'cavern' | 'citadel',
  camX: number,
  _camY: number,
  viewW: number,
  viewH: number
): void {
  const theme = THEMES[themeName];

  // 1. Sky Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, viewH);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);

  // 2. Stars / Celestial particles in Cavern & Citadel
  if (themeName === 'citadel' || themeName === 'cavern') {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 35; i++) {
      const sx = ((i * 12347) % (viewW * 2) - camX * 0.05) % viewW;
      const sy = (i * 9871) % (viewH * 0.7);
      const px = sx < 0 ? sx + viewW : sx;
      const sz = (i % 3 === 0) ? 2 : 1;
      ctx.globalAlpha = 0.3 + (i % 5) * 0.15;
      ctx.fillRect(Math.floor(px), Math.floor(sy), sz, sz);
    }
    ctx.globalAlpha = 1.0;
  }

  // 3. Clouds in Valley
  if (themeName === 'valley') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let c = 0; c < 5; c++) {
      const cx = ((c * 220 - camX * 0.15) % (viewW + 200)) - 100;
      const cy = 30 + c * 25;
      const px = cx < -100 ? cx + viewW + 200 : cx;
      drawPixelCloud(ctx, px, cy);
    }
  }

  // 4. Far Mountain Silhouette (0.2 parallax)
  ctx.fillStyle = theme.mountainFar;
  ctx.beginPath();
  ctx.moveTo(0, viewH);
  const farOffset = (camX * 0.2) % 320;
  for (let x = -320; x <= viewW + 320; x += 160) {
    const peakX = x - farOffset;
    const peakY = viewH - 120 - Math.sin(peakX * 0.015) * 45;
    ctx.lineTo(peakX, peakY);
    ctx.lineTo(peakX + 80, viewH - 60);
  }
  ctx.lineTo(viewW, viewH);
  ctx.closePath();
  ctx.fill();

  // 5. Mid Mountain / Skyline Silhouette (0.4 parallax)
  ctx.fillStyle = theme.mountainMid;
  ctx.beginPath();
  ctx.moveTo(0, viewH);
  const midOffset = (camX * 0.4) % 240;
  for (let x = -240; x <= viewW + 240; x += 120) {
    const peakX = x - midOffset;
    if (themeName === 'citadel') {
      // Cyber building skyline
      const bHeight = 70 + ((x * 17) % 65);
      ctx.lineTo(peakX, viewH - bHeight);
      ctx.lineTo(peakX + 45, viewH - bHeight);
      ctx.lineTo(peakX + 45, viewH - 40);
    } else {
      // Natural rolling hills
      const peakY = viewH - 85 - Math.cos(peakX * 0.02) * 35;
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(peakX + 60, viewH - 45);
    }
  }
  ctx.lineTo(viewW, viewH);
  ctx.closePath();
  ctx.fill();
}

function drawPixelCloud(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillRect(x + 10, y, 40, 12);
  ctx.fillRect(x + 4, y + 6, 52, 14);
  ctx.fillRect(x, y + 10, 60, 10);
}

/**
 * Render map tile
 */
export function renderTile(
  ctx: CanvasRenderingContext2D,
  tileType: number,
  x: number,
  y: number,
  size: number,
  themeName: 'valley' | 'cavern' | 'citadel'
): void {
  const theme = THEMES[themeName];

  if (tileType === 1) {
    // Solid Block
    // Base dirt
    ctx.fillStyle = theme.dirt;
    ctx.fillRect(x, y, size, size);

    // Inner bevel / texture
    ctx.fillStyle = theme.dirtDark;
    ctx.fillRect(x + 2, y + 6, size - 4, size - 8);

    // Top Surface Rim
    ctx.fillStyle = theme.groundTop;
    ctx.fillRect(x, y, size, 5);

    // Subtle grass blades / teeth or neon strip
    ctx.fillStyle = theme.groundSide;
    ctx.fillRect(x, y + 4, size, 2);
    ctx.fillRect(x + 3, y + 6, 3, 3);
    ctx.fillRect(x + 10, y + 6, 4, 2);
    ctx.fillRect(x + 18, y + 6, 3, 3);

    // High tech neon accent on citadel
    if (themeName === 'citadel') {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x + 4, y + 12, size - 8, 1);
    }
  } else if (tileType === 2) {
    // One-Way Jump-Through Platform
    ctx.fillStyle = theme.platform;
    ctx.fillRect(x, y, size, 6);

    // Top highlight rim
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.45;
    ctx.fillRect(x, y, size, 1.5);
    ctx.globalAlpha = 1.0;

    // Platform supports
    ctx.fillStyle = theme.groundSide;
    ctx.fillRect(x + 2, y + 6, 4, 3);
    ctx.fillRect(x + size - 6, y + 6, 4, 3);
  } else if (tileType === 3) {
    // Spike Hazard
    ctx.fillStyle = '#ef4444';
    const spikeW = size / 2;
    for (let s = 0; s < 2; s++) {
      const sx = x + s * spikeW;
      ctx.beginPath();
      ctx.moveTo(sx, y + size);
      ctx.lineTo(sx + spikeW / 2, y + 4);
      ctx.lineTo(sx + spikeW, y + size);
      ctx.closePath();
      ctx.fill();

      // Sharp highlight line
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.moveTo(sx + 2, y + size);
      ctx.lineTo(sx + spikeW / 2, y + 4);
      ctx.lineTo(sx + spikeW / 2, y + size);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ef4444';
    }
  }
}

/**
 * Render player hero: Dash (original agile cyber-fox runner)
 */
export function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  globalTime: number
): void {
  ctx.save();

  // Handle invulnerability blinking (10Hz flash)
  if (player.invulnerableTimer > 0 && Math.floor(player.invulnerableTimer * 20) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }

  // Center point for squash & stretch
  const px = Math.floor(player.x + player.width / 2);
  const py = Math.floor(player.y + player.height);

  ctx.translate(px, py);

  // Apply juice squash and stretch
  ctx.scale(player.facing * (1 + player.squash - player.stretch), 1 - player.squash + player.stretch);

  // Draw Ground Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 0, player.width * 0.45, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fox body dimensions relative to anchor (0, 0 at feet)
  const isRunning = player.animState === 'run';
  const isJumping = player.animState === 'jump' || player.animState === 'fall';
  const isStomping = player.animState === 'stomp';

  if (isStomping) {
    // Spinning ball / roll attack
    const spinAngle = (globalTime * 25) % (Math.PI * 2);
    ctx.rotate(spinAngle);
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(0, -12, 11, 0, Math.PI * 2);
    ctx.fill();
    // Inner energy core
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, -12, 6, 0, Math.PI * 2);
    ctx.fill();
    // Scarf streak
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-12, -15, 6, 4);
    ctx.restore();
    return;
  }

  // Running gait offset
  const runFrame = Math.floor(player.animTimer * 12) % 4;
  const bobY = isRunning ? (runFrame % 2 === 0 ? -1 : 1) : 0;

  // 1. Bushy Tail
  const tailSway = Math.sin(globalTime * 8) * 3;
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.moveTo(-6, -12 + bobY);
  ctx.quadraticCurveTo(-16 + tailSway, -18, -14 + tailSway, -8);
  ctx.quadraticCurveTo(-10, -6, -6, -10 + bobY);
  ctx.closePath();
  ctx.fill();
  // White tail tip
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(-14 + tailSway, -11, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Legs / Feet
  ctx.fillStyle = '#334155'; // Dark runners
  if (isRunning) {
    if (runFrame === 0) {
      ctx.fillRect(-5, -6, 4, 6);
      ctx.fillRect(2, -4, 4, 4);
    } else if (runFrame === 1) {
      ctx.fillRect(-3, -5, 4, 5);
      ctx.fillRect(1, -5, 4, 5);
    } else if (runFrame === 2) {
      ctx.fillRect(2, -6, 4, 6);
      ctx.fillRect(-5, -4, 4, 4);
    } else {
      ctx.fillRect(0, -5, 4, 5);
      ctx.fillRect(-2, -5, 4, 5);
    }
  } else if (isJumping) {
    // Tucked jump legs
    ctx.fillRect(-4, -5, 4, 4);
    ctx.fillRect(1, -6, 4, 4);
  } else {
    // Idle feet
    ctx.fillRect(-5, -4, 4, 4);
    ctx.fillRect(1, -4, 4, 4);
  }

  // 3. Torso (Nimble Fox Body)
  ctx.fillStyle = '#f97316'; // Vibrant orange
  ctx.fillRect(-6, -18 + bobY, 12, 12);
  // White chest patch
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(-2, -16 + bobY, 7, 8);

  // 4. Fluttering Scarf / Headband (Trails behind when running/jumping)
  const scarfTrail = isRunning ? -6 : Math.sin(globalTime * 6) * 2 - 2;
  ctx.fillStyle = '#38bdf8'; // Cyan energy scarf
  ctx.fillRect(-7, -18 + bobY, 4, 3);
  ctx.fillRect(-12 + scarfTrail, -17 + bobY, 7, 3);
  ctx.fillRect(-16 + scarfTrail * 1.3, -16 + bobY, 6, 2.5);

  // 5. Head
  ctx.fillStyle = '#f97316';
  ctx.fillRect(-5, -27 + bobY, 12, 10);
  // Snout
  ctx.fillRect(4, -23 + bobY, 4, 4);
  ctx.fillStyle = '#0f172a'; // Nose
  ctx.fillRect(7, -23 + bobY, 2, 2);

  // 6. Pointy Ears
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.moveTo(-4, -27 + bobY);
  ctx.lineTo(-2, -33 + bobY);
  ctx.lineTo(1, -27 + bobY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fef08a'; // Inner ear
  ctx.fillRect(-2, -29 + bobY, 2, 3);

  // 7. Visor / Goggles (Cyan Cyber Lens)
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, -25 + bobY, 7, 4);
  ctx.fillStyle = '#7dd3fc'; // Glint
  ctx.fillRect(2, -25 + bobY, 2, 2);

  ctx.restore();
}

/**
 * Render Enemy: Ground Crawler & Flying Drone
 */
export function renderEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  globalTime: number
): void {
  if (!enemy.alive) {
    // Defeated pop flash
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const cx = Math.floor(enemy.x + enemy.width / 2);
  const cy = Math.floor(enemy.y + enemy.height / 2);

  ctx.save();
  ctx.translate(cx, cy);

  if (enemy.type === 'crawler') {
    // Mecha-Slime Crawler
    const squish = Math.sin(enemy.animTimer * 10) * 1.5;
    ctx.scale(enemy.facing, 1);

    // Domed Shell
    ctx.fillStyle = '#ef4444'; // Red carapace
    ctx.beginPath();
    ctx.arc(0, -1 + squish, 9, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();

    // Bottom chassis
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(-9, -1 + squish, 18, 5);

    // Glowing cyclops eye
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(3, -5 + squish, 4, 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(5, -4 + squish, 2, 2);

    // Little crawler feet
    ctx.fillStyle = '#1e293b';
    const footOffset = Math.sin(enemy.animTimer * 14) * 2;
    ctx.fillRect(-7 + footOffset, 4, 3, 4);
    ctx.fillRect(4 - footOffset, 4, 3, 4);
  } else {
    // Flying Drone
    const hoverBob = Math.sin(globalTime * 6) * 2;
    ctx.translate(0, hoverBob);

    // Spinning rotor blade
    const rotorPhase = Math.floor((globalTime * 30) % 2);
    ctx.fillStyle = '#94a3b8';
    if (rotorPhase === 0) {
      ctx.fillRect(-11, -11, 22, 2);
    } else {
      ctx.fillRect(-5, -11, 10, 2);
    }
    // Rotor pole
    ctx.fillStyle = '#475569';
    ctx.fillRect(-1, -9, 2, 3);

    // Spherical Drone Body
    ctx.fillStyle = '#6366f1'; // Indigo body
    ctx.beginPath();
    ctx.arc(0, -1, 8, 0, Math.PI * 2);
    ctx.fill();

    // Red Scanner Eye
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(enemy.facing * 3, -1, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Exhaust particle flame
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-2, 7, 4, 3 + Math.floor(Math.sin(globalTime * 20) * 2));
  }

  ctx.restore();
}

/**
 * Render Coin: Spinning 3D gold coin with glint
 */
export function renderCoin(
  ctx: CanvasRenderingContext2D,
  coin: Coin,
  globalTime: number
): void {
  if (coin.collected) return;

  const cx = Math.floor(coin.x + 8);
  const cy = Math.floor(coin.y + 8);
  // Spin width cycle
  const spin = Math.cos(globalTime * 5 + coin.animFrame);
  const coinW = Math.max(2, Math.abs(spin) * 7);

  ctx.save();
  ctx.translate(cx, cy);

  // Outer gold rim
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.ellipse(0, 0, coinW, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner face
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(1, coinW - 2), 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glint star
  if (Math.abs(spin) > 0.7) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -2, 2, 4);
    ctx.fillRect(-2, -1, 4, 2);
  }

  ctx.restore();
}

/**
 * Render Spring: Bouncy mechanical launch pad
 */
export function renderSpring(
  ctx: CanvasRenderingContext2D,
  spring: Spring
): void {
  const x = Math.floor(spring.x);
  const y = Math.floor(spring.y);
  const comp = spring.compression; // 0 (rest) to 1 (compressed)

  // Iron Base
  ctx.fillStyle = '#475569';
  ctx.fillRect(x, y + 10, spring.width, 6);

  // Coiled Spring Stem
  const springH = Math.max(2, 6 * (1 - comp));
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(x + 5, y + 10 - springH, spring.width - 10, springH);

  // Neon Spring Launcher Cap
  ctx.fillStyle = comp > 0.3 ? '#f59e0b' : '#10b981';
  ctx.fillRect(x + 2, y + 10 - springH - 4, spring.width - 4, 4);

  // Upward Arrow Icon on Cap
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + spring.width / 2 - 1, y + 10 - springH - 3, 2, 2);
}

/**
 * Render Checkpoint: Flame Beacon
 */
export function renderCheckpoint(
  ctx: CanvasRenderingContext2D,
  checkpoint: Checkpoint,
  globalTime: number
): void {
  const x = Math.floor(checkpoint.x);
  const y = Math.floor(checkpoint.y);

  // Base stone
  ctx.fillStyle = '#334155';
  ctx.fillRect(x + 4, y + 26, 16, 6);

  // Beacon Staff
  ctx.fillStyle = '#64748b';
  ctx.fillRect(x + 10, y + 8, 4, 18);

  // Top Chalice
  ctx.fillStyle = '#475569';
  ctx.fillRect(x + 7, y + 8, 10, 4);

  if (checkpoint.activated) {
    // Blazing Golden Beacon
    const flameH = 9 + Math.sin(globalTime * 12) * 2;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(x + 12, y + 7 - flameH / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Hot Core
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(x + 12, y + 6 - flameH / 2, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Dormant Red Ember
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.arc(x + 12, y + 5, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Render Level Finish Flag / Arch
 */
export function renderFinishGate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  globalTime: number
): void {
  const fx = Math.floor(x);
  const fy = Math.floor(y);

  // Golden Arch Pillars
  ctx.fillStyle = '#d97706';
  ctx.fillRect(fx, fy + 6, 5, 26);
  ctx.fillRect(fx + 27, fy + 6, 5, 26);
  // Crossbar
  ctx.fillRect(fx, fy + 4, 32, 4);

  // Energy Portal Aura inside Arch
  const auraAlpha = 0.35 + Math.sin(globalTime * 8) * 0.15;
  ctx.fillStyle = `rgba(56, 189, 248, ${auraAlpha})`;
  ctx.fillRect(fx + 5, fy + 8, 22, 24);

  // Checkered Waving Flag on Top
  const wave = Math.sin(globalTime * 6) * 3;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(fx + 15, fy - 10, 2, 14);

  // Flag fabric 2x2 checkerboard
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(fx + 17, fy - 10 + wave * 0.5, 6, 4);
  ctx.fillRect(fx + 23, fy - 6 + wave * 0.8, 6, 4);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(fx + 23, fy - 10 + wave * 0.8, 6, 4);
  ctx.fillRect(fx + 17, fy - 6 + wave * 0.5, 6, 4);
}

/**
 * Render Moving Platform
 */
export function renderMovingPlatform(
  ctx: CanvasRenderingContext2D,
  platform: MovingPlatform
): void {
  const px = Math.floor(platform.x);
  const py = Math.floor(platform.y);

  // Main metallic body
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(px, py, platform.width, platform.height);

  // Top Neon Runner Surface
  ctx.fillStyle = '#f97316';
  ctx.fillRect(px, py, platform.width, 3);

  // Tech Chevron Details
  ctx.fillStyle = '#cbd5e1';
  for (let c = px + 8; c < px + platform.width - 8; c += 16) {
    ctx.fillRect(c, py + 4, 6, 2);
  }

  // Thruster Glow Underneath
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(px + 4, py + platform.height, 6, 2);
  ctx.fillRect(px + platform.width - 10, py + platform.height, 6, 2);
}

/**
 * Render Particle
 */
export function renderParticle(
  ctx: CanvasRenderingContext2D,
  p: Particle
): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, p.alpha);
  ctx.fillStyle = p.color;

  if (p.shape === 'sparkle') {
    ctx.fillRect(p.x - p.size, p.y - 1, p.size * 2, 2);
    ctx.fillRect(p.x - 1, p.y - p.size, 2, p.size * 2);
  } else if (p.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Square pixel
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
  }

  ctx.restore();
}
