import type {
  Player,
  Enemy,
  Coin,
  Spring,
  Checkpoint,
  MovingPlatform,
  Particle,
  FloatingText,
  LevelConfig,
  GameStatus,
} from './types';
import { platformerAudio } from './audio';
import {
  renderBackground,
  renderTile,
  renderPlayer,
  renderEnemy,
  renderCoin,
  renderSpring,
  renderCheckpoint,
  renderFinishGate,
  renderMovingPlatform,
  renderParticle,
} from './sprites';

export const VIRTUAL_WIDTH = 640;
export const VIRTUAL_HEIGHT = 360;

// Physics Constants
const GRAVITY = 0.44;
const MAX_FALL_SPEED = 9.5;
const ACCEL = 0.65;
const FRICTION = 0.82;
const MAX_SPEED = 4.2;
const JUMP_FORCE = -8.6;
const SPRING_JUMP_FORCE = -12.8;
const STOMP_BOUNCE_FORCE = -7.5;
const COYOTE_TIME = 0.12; // seconds
const JUMP_BUFFER_TIME = 0.12; // seconds

export interface GameInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean; // Just triggered this frame
}

export class GameEngine {
  public status: GameStatus = 'title';
  public currentLevelIdx: number = 0;
  public score: number = 0;
  public lives: number = 3;
  public coinsCollected: number = 0;
  public levelCoinsTotal: number = 0;
  public levelCoinsCollected: number = 0;
  public levelTime: number = 0;
  public activeCheckpoint: { x: number; y: number } | null = null;

  // Level Entities
  public levelConfig!: LevelConfig;
  public player!: Player;
  public enemies: Enemy[] = [];
  public coins: Coin[] = [];
  public springs: Spring[] = [];
  public checkpoints: Checkpoint[] = [];
  public movingPlatforms: MovingPlatform[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];

  // Camera
  public camX: number = 0;
  public camY: number = 0;

  // Global game clock
  public globalTime: number = 0;

  private levels: LevelConfig[];

  constructor(levels: LevelConfig[]) {
    this.levels = levels;
    this.initLevel(0, false);
  }

  public initLevel(levelIdx: number, keepScoreAndLives: boolean = true): void {
    this.currentLevelIdx = levelIdx;
    this.levelConfig = this.levels[levelIdx];
    this.activeCheckpoint = null;
    this.levelTime = 0;
    this.levelCoinsCollected = 0;
    this.particles = [];
    this.floatingTexts = [];

    if (!keepScoreAndLives) {
      this.score = 0;
      this.lives = 3;
      this.coinsCollected = 0;
    }

    // Initialize Player
    this.player = {
      x: this.levelConfig.playerStart.x,
      y: this.levelConfig.playerStart.y,
      width: 14,
      height: 22,
      vx: 0,
      vy: 0,
      isGrounded: false,
      facing: 1,
      animState: 'idle',
      animTimer: 0,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      invulnerableTimer: 0,
      squash: 0,
      stretch: 0,
      ridingPlatform: null,
    };

    // Initialize Moving Platforms
    this.movingPlatforms = this.levelConfig.movingPlatforms.map((mp) => ({
      ...mp,
      progress: 0,
      direction: 1,
      dx: 0,
      dy: 0,
    }));

    // Initialize Springs
    this.springs = this.levelConfig.springs.map((sp, idx) => ({
      id: `spring-${idx}`,
      x: sp.x,
      y: sp.y,
      width: 24,
      height: 12,
      compression: 0,
      timer: 0,
    }));

    // Initialize Checkpoints
    this.checkpoints = [
      {
        id: `cp-${levelIdx}`,
        x: this.levelConfig.checkpoint.x,
        y: this.levelConfig.checkpoint.y,
        width: 24,
        height: 32,
        activated: false,
        sparkleTimer: 0,
      },
    ];

    // Initialize Coins
    this.coins = this.levelConfig.coins.map((c, idx) => ({
      id: `coin-${idx}`,
      x: c.x,
      y: c.y,
      collected: false,
      animFrame: idx * 0.4,
    }));
    this.levelCoinsTotal = this.coins.length;

    // Initialize Enemies
    this.enemies = this.levelConfig.enemies.map((e, idx) => ({
      id: `enemy-${idx}`,
      type: e.type,
      x: e.x,
      y: e.y,
      width: e.type === 'crawler' ? 18 : 16,
      height: e.type === 'crawler' ? 14 : 16,
      vx: e.type === 'crawler' ? 0.9 : 1.2,
      vy: 0,
      minX: e.minX,
      maxX: e.maxX,
      facing: 1,
      alive: true,
      deathTimer: 0,
      animTimer: idx * 0.5,
      startY: e.type === 'drone' ? e.y : undefined,
    }));

    // Center camera on start
    this.camX = Math.max(0, this.player.x - VIRTUAL_WIDTH / 3);
    this.camY = Math.max(0, this.player.y - VIRTUAL_HEIGHT / 2);
  }

  public respawnPlayer(): void {
    const spawn = this.activeCheckpoint || this.levelConfig.playerStart;
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.isGrounded = false;
    this.player.invulnerableTimer = 1.8;
    this.player.animState = 'idle';
    this.player.ridingPlatform = null;

    // Poof particles at respawn
    this.spawnDust(this.player.x + 7, this.player.y + 11, '#38bdf8', 12);
  }

  public update(dt: number, input: GameInput): void {
    if (this.status !== 'playing') return;

    this.globalTime += dt;
    this.levelTime += dt;

    // Update Timers
    if (this.player.coyoteTimer > 0) this.player.coyoteTimer -= dt;
    if (this.player.jumpBufferTimer > 0) this.player.jumpBufferTimer -= dt;
    if (this.player.invulnerableTimer > 0) this.player.invulnerableTimer -= dt;

    // Buffer Jump Input
    if (input.jumpPressed) {
      this.player.jumpBufferTimer = JUMP_BUFFER_TIME;
    }

    // 1. Update Moving Platforms
    this.updateMovingPlatforms(dt);

    // 2. Update Player Horizontal Movement
    this.updatePlayerHorizontal(dt, input);

    // 3. Update Player Vertical Movement & Jumping
    this.updatePlayerVertical(dt, input);

    // 4. Update Juice (Squash & Stretch)
    this.player.squash += (0 - this.player.squash) * 0.15;
    this.player.stretch += (0 - this.player.stretch) * 0.15;

    // 5. Update Springs
    this.updateSprings(dt);

    // 6. Update Enemies
    this.updateEnemies(dt);

    // 7. Check Collisions (Coins, Springs, Hazards, Checkpoints, Finish)
    this.checkInteractions();

    // 8. Pit Fall Check
    const pitThreshold = this.levelConfig.height * this.levelConfig.tileSize + 30;
    if (this.player.y > pitThreshold) {
      this.handlePlayerDamage();
    }

    // 9. Update Particles & Popups
    this.updateParticles(dt);

    // 10. Update Camera with Smooth Lerp
    this.updateCamera(dt);
  }

  private updatePlayerHorizontal(dt: number, input: GameInput): void {
    const p = this.player;

    if (input.left) {
      p.vx -= ACCEL;
      p.facing = -1;
      if (p.isGrounded) {
        p.animState = 'run';
        p.animTimer += dt;
        if (Math.random() < 0.2) {
          this.spawnDust(p.x + p.width / 2 + 5, p.y + p.height, '#cbd5e1', 1);
        }
      }
    } else if (input.right) {
      p.vx += ACCEL;
      p.facing = 1;
      if (p.isGrounded) {
        p.animState = 'run';
        p.animTimer += dt;
        if (Math.random() < 0.2) {
          this.spawnDust(p.x + p.width / 2 - 5, p.y + p.height, '#cbd5e1', 1);
        }
      }
    } else {
      p.vx *= FRICTION;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
      if (p.isGrounded && p.animState !== 'stomp') {
        p.animState = 'idle';
      }
    }

    // Clamp speed
    p.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, p.vx));

    // Platform riding horizontal offset
    let totalDx = p.vx;
    if (p.ridingPlatform) {
      totalDx += p.ridingPlatform.dx;
    }

    // Resolve Horizontal Tile Collisions
    const newX = p.x + totalDx;
    if (!this.checkTileCollision(newX, p.y, p.width, p.height, true)) {
      p.x = newX;
    } else {
      // Wall collision
      p.vx = 0;
    }

    // Clamp inside left level boundary
    if (p.x < 0) {
      p.x = 0;
      p.vx = 0;
    }
  }

  private updatePlayerVertical(_dt: number, input: GameInput): void {
    const p = this.player;

    // Apply Gravity
    p.vy += GRAVITY;
    if (p.vy > MAX_FALL_SPEED) p.vy = MAX_FALL_SPEED;

    // Jump Execution (Checks Ground or Coyote Time + Jump Buffer)
    const canJump = p.isGrounded || p.coyoteTimer > 0;
    if (p.jumpBufferTimer > 0 && canJump) {
      p.vy = JUMP_FORCE;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
      p.isGrounded = false;
      p.ridingPlatform = null;
      p.stretch = 0.25;
      p.animState = 'jump';
      platformerAudio.playJump();
      this.spawnDust(p.x + p.width / 2, p.y + p.height, '#f8fafc', 4);
    }

    // Variable Jump Height: early release reduces jump apex
    if (!input.jump && p.vy < -2.5) {
      p.vy *= 0.65;
    }

    const prevY = p.y;
    const newY = p.y + p.vy;

    // Check Vertical Tile and One-Way Platform Collision
    const collision = this.resolveVerticalCollision(p.x, prevY, newY, p.width, p.height, p.vy);

    if (collision.hitFloor) {
      p.y = collision.clampedY;
      if (!p.isGrounded) {
        // Just landed!
        p.squash = 0.22;
        this.spawnDust(p.x + p.width / 2, p.y + p.height, '#94a3b8', 3);
      }
      p.vy = 0;
      p.isGrounded = true;
      p.coyoteTimer = COYOTE_TIME;
    } else if (collision.hitCeiling) {
      p.y = collision.clampedY;
      p.vy = 0;
      p.isGrounded = false;
      p.ridingPlatform = null;
    } else {
      p.y = newY;
      p.isGrounded = false;
      p.ridingPlatform = null;
      if (p.animState !== 'stomp') {
        p.animState = p.vy < 0 ? 'jump' : 'fall';
      }
    }
  }

  private updateMovingPlatforms(_dt: number): void {
    for (const mp of this.movingPlatforms) {
      const prevX = mp.x;
      const prevY = mp.y;

      const totalDistX = mp.endX - mp.startX;
      const totalDistY = mp.endY - mp.startY;
      const totalDist = Math.hypot(totalDistX, totalDistY);

      if (totalDist > 0) {
        mp.progress += (mp.speed / totalDist) * mp.direction;
        if (mp.progress >= 1) {
          mp.progress = 1;
          mp.direction = -1;
        } else if (mp.progress <= 0) {
          mp.progress = 0;
          mp.direction = 1;
        }

        // Smooth cosine ease
        const ease = (1 - Math.cos(mp.progress * Math.PI)) / 2;
        mp.x = mp.startX + totalDistX * ease;
        mp.y = mp.startY + totalDistY * ease;
      }

      mp.dx = mp.x - prevX;
      mp.dy = mp.y - prevY;

      // Check if player is standing on this platform
      const p = this.player;
      const onPlatform =
        p.isGrounded &&
        p.x + p.width > mp.x &&
        p.x < mp.x + mp.width &&
        Math.abs(p.y + p.height - mp.y) < 3.5;

      if (onPlatform) {
        p.ridingPlatform = mp;
        p.y = mp.y - p.height;
      }
    }
  }

  private updateSprings(dt: number): void {
    for (const sp of this.springs) {
      if (sp.compression > 0) {
        sp.compression -= dt * 3.5;
        if (sp.compression < 0) sp.compression = 0;
      }
    }
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      enemy.animTimer += dt;

      if (enemy.type === 'crawler') {
        enemy.x += enemy.vx * enemy.facing;
        if (enemy.x <= enemy.minX) {
          enemy.x = enemy.minX;
          enemy.facing = 1;
        } else if (enemy.x + enemy.width >= enemy.maxX) {
          enemy.x = enemy.maxX - enemy.width;
          enemy.facing = -1;
        }
      } else if (enemy.type === 'drone') {
        enemy.x += enemy.vx * enemy.facing;
        if (enemy.x <= enemy.minX) {
          enemy.x = enemy.minX;
          enemy.facing = 1;
        } else if (enemy.x + enemy.width >= enemy.maxX) {
          enemy.x = enemy.maxX - enemy.width;
          enemy.facing = -1;
        }
        // Hover sine motion
        if (enemy.startY !== undefined) {
          enemy.y = enemy.startY + Math.sin(enemy.animTimer * 4) * 8;
        }
      }
    }
  }

  private checkInteractions(): void {
    const p = this.player;

    // 1. Coin Collection
    for (const coin of this.coins) {
      if (!coin.collected) {
        if (
          p.x + p.width > coin.x &&
          p.x < coin.x + 16 &&
          p.y + p.height > coin.y &&
          p.y < coin.y + 16
        ) {
          coin.collected = true;
          this.score += 100;
          this.coinsCollected++;
          this.levelCoinsCollected++;
          platformerAudio.playCoin();
          this.spawnSparkle(coin.x + 8, coin.y + 8, '#fde047', 8);
          this.addFloatingText(coin.x + 8, coin.y, '+100', '#fde047');

          // Extra Life on 50 coins
          if (this.coinsCollected % 50 === 0) {
            this.lives++;
            this.addFloatingText(p.x + p.width / 2, p.y - 10, '+1 LIFE!', '#22c55e');
          }
        }
      }
    }

    // 2. Spring Pad Bounces
    for (const sp of this.springs) {
      if (
        p.x + p.width > sp.x - 2 &&
        p.x < sp.x + sp.width + 2 &&
        p.y + p.height >= sp.y - 8 &&
        p.y + p.height <= sp.y + 26
      ) {
        sp.compression = 1;
        p.vy = SPRING_JUMP_FORCE;
        p.isGrounded = false;
        p.ridingPlatform = null;
        p.stretch = 0.35;
        p.animState = 'jump';
        platformerAudio.playSpring();
        this.spawnDust(sp.x + sp.width / 2, sp.y + 6, '#10b981', 8);
      }
    }

    // 3. Enemy Stomping & Damage
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      if (
        p.x + p.width > enemy.x &&
        p.x < enemy.x + enemy.width &&
        p.y + p.height > enemy.y &&
        p.y < enemy.y + enemy.height + 4
      ) {
        // Stomp condition: player's center is above enemy center, or falling into top
        const isStomping = p.y + p.height <= enemy.y + enemy.height || p.vy > 0;

        if (isStomping) {
          enemy.alive = false;
          p.vy = STOMP_BOUNCE_FORCE;
          p.animState = 'stomp';
          p.stretch = 0.2;
          this.score += 200;
          platformerAudio.playStomp();
          this.spawnDust(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ef4444', 12);
          this.addFloatingText(enemy.x + enemy.width / 2, enemy.y, '+200', '#ffffff');
        } else if (p.invulnerableTimer <= 0) {
          this.handlePlayerDamage();
        }
      }
    }

    // 4. Spike Hazard Collision
    const tileR1 = Math.floor(p.y / this.levelConfig.tileSize);
    const tileR2 = Math.floor((p.y + p.height - 1) / this.levelConfig.tileSize);
    const tileC1 = Math.floor(p.x / this.levelConfig.tileSize);
    const tileC2 = Math.floor((p.x + p.width - 1) / this.levelConfig.tileSize);

    for (let r = tileR1; r <= tileR2; r++) {
      for (let c = tileC1; c <= tileC2; c++) {
        if (this.getTile(r, c) === 3 && p.invulnerableTimer <= 0) {
          this.handlePlayerDamage();
          return;
        }
      }
    }

    // 5. Checkpoint Trigger
    for (const cp of this.checkpoints) {
      if (!cp.activated) {
        if (
          p.x + p.width > cp.x &&
          p.x < cp.x + cp.width &&
          p.y + p.height > cp.y &&
          p.y < cp.y + cp.height
        ) {
          cp.activated = true;
          this.activeCheckpoint = { x: cp.x, y: cp.y };
          this.score += 250;
          platformerAudio.playCheckpoint();
          this.spawnSparkle(cp.x + 12, cp.y + 10, '#f59e0b', 18);
          this.addFloatingText(cp.x + 12, cp.y - 10, 'CHECKPOINT!', '#f59e0b');
        }
      }
    }

    // 6. Finish Flag / Archway
    const finish = this.levelConfig.finish;
    if (
      p.x + p.width > finish.x &&
      p.x < finish.x + 32 &&
      p.y + p.height > finish.y &&
      p.y < finish.y + 32
    ) {
      this.handleLevelVictory();
    }
  }

  private handlePlayerDamage(): void {
    this.lives--;
    platformerAudio.playHurt();
    this.spawnDust(this.player.x + 7, this.player.y + 11, '#ef4444', 14);

    if (this.lives > 0) {
      this.respawnPlayer();
    } else {
      this.status = 'game_over';
      platformerAudio.playGameOver();
    }
  }

  private handleLevelVictory(): void {
    this.status = this.currentLevelIdx >= this.levels.length - 1 ? 'victory' : 'level_complete';
    this.score += 500;
    platformerAudio.playLevelComplete();

    // Victory celebration fireworks
    for (let i = 0; i < 40; i++) {
      this.spawnSparkle(
        this.levelConfig.finish.x + 16 + (Math.random() - 0.5) * 60,
        this.levelConfig.finish.y + (Math.random() - 0.5) * 40,
        i % 2 === 0 ? '#38bdf8' : '#f59e0b',
        1
      );
    }
  }

  // ------------------------------------------
  // Collision Detection Helpers
  // ------------------------------------------
  private getTile(r: number, c: number): number {
    if (r < 0 || r >= this.levelConfig.height || c < 0 || c >= this.levelConfig.width) {
      return 0;
    }
    return this.levelConfig.tiles[r][c];
  }

  private checkTileCollision(
    x: number,
    y: number,
    w: number,
    h: number,
    solidOnly: boolean
  ): boolean {
    const ts = this.levelConfig.tileSize;
    const r1 = Math.floor(y / ts);
    const r2 = Math.floor((y + h - 1) / ts);
    const c1 = Math.floor(x / ts);
    const c2 = Math.floor((x + w - 1) / ts);

    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const t = this.getTile(r, c);
        if (t === 1) return true; // Solid wall
        if (!solidOnly && t === 2) return true; // One-way platform
      }
    }
    return false;
  }

  private resolveVerticalCollision(
    x: number,
    oldY: number,
    newY: number,
    w: number,
    h: number,
    vy: number
  ): { hitFloor: boolean; hitCeiling: boolean; clampedY: number } {
    const ts = this.levelConfig.tileSize;

    if (vy >= 0) {
      // Falling Down: check floor tiles & one-way platforms
      const footY = newY + h;
      const oldFootY = oldY + h;
      const r = Math.floor(footY / ts);
      const c1 = Math.floor(x / ts);
      const c2 = Math.floor((x + w - 1) / ts);

      for (let c = c1; c <= c2; c++) {
        const t = this.getTile(r, c);
        if (t === 1) {
          // Solid floor
          return { hitFloor: true, hitCeiling: false, clampedY: r * ts - h };
        }
        if (t === 2 && oldFootY <= r * ts + 6 && footY >= r * ts) {
          // Landed on one-way platform from above!
          return { hitFloor: true, hitCeiling: false, clampedY: r * ts - h };
        }
      }

      // Check moving platforms
      for (const mp of this.movingPlatforms) {
        if (
          x + w > mp.x &&
          x < mp.x + mp.width &&
          oldFootY <= mp.y + 6 &&
          footY >= mp.y
        ) {
          return { hitFloor: true, hitCeiling: false, clampedY: mp.y - h };
        }
      }
    } else {
      // Moving Up: check solid ceiling tiles (one-way platforms are ignored)
      const headY = newY;
      const r = Math.floor(headY / ts);
      const c1 = Math.floor(x / ts);
      const c2 = Math.floor((x + w - 1) / ts);

      for (let c = c1; c <= c2; c++) {
        const t = this.getTile(r, c);
        if (t === 1) {
          return { hitFloor: false, hitCeiling: true, clampedY: (r + 1) * ts };
        }
      }
    }

    return { hitFloor: false, hitCeiling: false, clampedY: newY };
  }

  // ------------------------------------------
  // Camera & Particle Systems
  // ------------------------------------------
  private updateCamera(_dt: number): void {
    const targetX = this.player.x - VIRTUAL_WIDTH / 2.5 + this.player.facing * 35;
    const targetY = this.player.y - VIRTUAL_HEIGHT / 2;

    this.camX += (targetX - this.camX) * 0.1;
    this.camY += (targetY - this.camY) * 0.08;

    // Clamp camera within level bounds
    const maxCamX = this.levelConfig.width * this.levelConfig.tileSize - VIRTUAL_WIDTH;
    const maxCamY = this.levelConfig.height * this.levelConfig.tileSize - VIRTUAL_HEIGHT;

    this.camX = Math.max(0, Math.min(Math.max(0, maxCamX), this.camX));
    this.camY = Math.max(0, Math.min(Math.max(0, maxCamY), this.camY));
  }

  public spawnDust(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -Math.random() * 1.5 - 0.5,
        size: Math.random() > 0.5 ? 3 : 2,
        color,
        alpha: 0.8,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2,
      });
    }
  }

  public spawnSparkle(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3 - 1,
        size: 3,
        color,
        alpha: 1.0,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3,
        shape: 'sparkle',
      });
    }
  }

  public addFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      alpha: 1.0,
      life: 0,
      maxLife: 0.8,
      vy: -1.2,
    });
  }

  private updateParticles(dt: number): void {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = 1 - p.life / p.maxLife;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.y += ft.vy;
      ft.alpha = 1 - ft.life / ft.maxLife;

      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  // ------------------------------------------
  // Main Render Pass
  // ------------------------------------------
  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // 1. Render Parallax Background
    renderBackground(ctx, this.levelConfig.theme, this.camX, this.camY, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // 2. Camera Transformation
    ctx.translate(-Math.floor(this.camX), -Math.floor(this.camY));

    // Visible tile ranges for efficient clipping
    const ts = this.levelConfig.tileSize;
    const startCol = Math.max(0, Math.floor(this.camX / ts));
    const endCol = Math.min(this.levelConfig.width - 1, Math.ceil((this.camX + VIRTUAL_WIDTH) / ts));
    const startRow = Math.max(0, Math.floor(this.camY / ts));
    const endRow = Math.min(this.levelConfig.height - 1, Math.ceil((this.camY + VIRTUAL_HEIGHT) / ts));

    // 3. Render Map Tiles
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const t = this.getTile(r, c);
        if (t !== 0) {
          renderTile(ctx, t, c * ts, r * ts, ts, this.levelConfig.theme);
        }
      }
    }

    // 4. Render Checkpoints
    for (const cp of this.checkpoints) {
      renderCheckpoint(ctx, cp, this.globalTime);
    }

    // 5. Render Finish Flag
    renderFinishGate(ctx, this.levelConfig.finish.x, this.levelConfig.finish.y, this.globalTime);

    // 6. Render Springs
    for (const sp of this.springs) {
      renderSpring(ctx, sp);
    }

    // 7. Render Moving Platforms
    for (const mp of this.movingPlatforms) {
      renderMovingPlatform(ctx, mp);
    }

    // 8. Render Coins
    for (const coin of this.coins) {
      renderCoin(ctx, coin, this.globalTime);
    }

    // 9. Render Enemies
    for (const enemy of this.enemies) {
      renderEnemy(ctx, enemy, this.globalTime);
    }

    // 10. Render Player Hero
    renderPlayer(ctx, this.player, this.globalTime);

    // 11. Render Particles
    for (const p of this.particles) {
      renderParticle(ctx, p);
    }

    // 12. Render Floating Score Texts
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, Math.floor(ft.x), Math.floor(ft.y));
      ctx.restore();
    }

    ctx.restore();
  }
}
