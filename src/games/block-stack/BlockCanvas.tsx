import React, { useEffect, useRef } from 'react';
import type { BoardGrid, Piece, Particle, FloatingNotice } from './types';
import { BOARD_WIDTH, BOARD_HEIGHT, PALETTES, getGhostY } from './gameLogic';

interface BlockCanvasProps {
  grid: BoardGrid;
  currentPiece: Piece | null;
  clearingRows: number[];
  clearProgress: number; // 0 to 1
  particles: Particle[];
  floatingNotices: FloatingNotice[];
  shakeOffset: { x: number; y: number };
  isPaused: boolean;
  isGameOver: boolean;
}

export const BlockCanvas: React.FC<BlockCanvasProps> = ({
  grid,
  currentPiece,
  clearingRows,
  clearProgress,
  particles,
  floatingNotices,
  shakeOffset,
  isPaused,
  isGameOver
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || 300;
    const displayHeight = canvas.clientHeight || 600;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Apply board shake
    ctx.translate(shakeOffset.x, shakeOffset.y);

    const cellW = displayWidth / BOARD_WIDTH;
    const cellH = displayHeight / BOARD_HEIGHT;

    // 1. Board Background
    ctx.fillStyle = '#070911';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // 2. Subtle Grid Matrix Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;

    for (let c = 1; c < BOARD_WIDTH; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellW, 0);
      ctx.lineTo(c * cellW, displayHeight);
      ctx.stroke();
    }
    for (let r = 1; r < BOARD_HEIGHT; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(displayWidth, r * cellH);
      ctx.stroke();
    }

    // Helper to draw a beveled block
    const drawBlock = (
      x: number,
      y: number,
      type: keyof typeof PALETTES,
      alpha = 1,
      isGhost = false,
      isClearing = false
    ) => {
      const palette = PALETTES[type];
      const px = x * cellW;
      const py = y * cellH;
      const pad = 1;
      const w = cellW - pad * 2;
      const h = cellH - pad * 2;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (isGhost) {
        // Translucent dashed ghost piece
        ctx.strokeStyle = palette.light;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(px + pad + 0.5, py + pad + 0.5, w - 1, h - 1);

        ctx.fillStyle = palette.primary;
        ctx.globalAlpha = 0.15;
        ctx.fillRect(px + pad, py + pad, w, h);
        ctx.restore();
        return;
      }

      if (isClearing) {
        // Glowing white/gold line-clear flash
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;
        ctx.fillRect(px, py, cellW, cellH);
        ctx.restore();
        return;
      }

      // Base block fill
      ctx.fillStyle = palette.primary;
      ctx.fillRect(px + pad, py + pad, w, h);

      // Top & Left Highlight Bevel
      ctx.fillStyle = palette.light;
      ctx.beginPath();
      ctx.moveTo(px + pad, py + pad);
      ctx.lineTo(px + pad + w, py + pad);
      ctx.lineTo(px + pad + w - 3, py + pad + 3);
      ctx.lineTo(px + pad + 3, py + pad + 3);
      ctx.lineTo(px + pad + 3, py + pad + h - 3);
      ctx.lineTo(px + pad, py + pad + h);
      ctx.closePath();
      ctx.fill();

      // Bottom & Right Shadow Bevel
      ctx.fillStyle = palette.dark;
      ctx.beginPath();
      ctx.moveTo(px + pad + w, py + pad + h);
      ctx.lineTo(px + pad, py + pad + h);
      ctx.lineTo(px + pad + 3, py + pad + h - 3);
      ctx.lineTo(px + pad + w - 3, py + pad + h - 3);
      ctx.lineTo(px + pad + w - 3, py + pad + 3);
      ctx.lineTo(px + pad + w, py + pad);
      ctx.closePath();
      ctx.fill();

      // Inner Gloss Accent
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(px + pad + 4, py + pad + 4, Math.max(1, w - 8), 2);

      ctx.restore();
    };

    // 3. Render Locked Grid Blocks
    const clearingSet = new Set(clearingRows);
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      const isClearing = clearingSet.has(r);
      for (let c = 0; c < BOARD_WIDTH; c++) {
        const cell = grid[r][c];
        if (cell) {
          drawBlock(c, r, cell, isClearing ? 1 - clearProgress * 0.5 : 1, false, isClearing);
        }
      }
    }

    // 4. Render Ghost Piece (Drop Shadow)
    if (currentPiece && !isPaused && !isGameOver) {
      const ghostY = getGhostY(grid, currentPiece);
      // Only draw ghost if it's below the current piece position
      if (ghostY > currentPiece.y) {
        for (let r = 0; r < currentPiece.shape.length; r++) {
          for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c] !== 0) {
              const bx = currentPiece.x + c;
              const by = ghostY + r;
              if (by >= 0 && by < BOARD_HEIGHT && bx >= 0 && bx < BOARD_WIDTH) {
                drawBlock(bx, by, currentPiece.type, 0.45, true);
              }
            }
          }
        }
      }

      // 5. Render Active Falling Piece
      ctx.save();
      ctx.shadowColor = PALETTES[currentPiece.type].glow;
      ctx.shadowBlur = 6;
      for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
          if (currentPiece.shape[r][c] !== 0) {
            const bx = currentPiece.x + c;
            const by = currentPiece.y + r;
            if (by >= 0 && by < BOARD_HEIGHT && bx >= 0 && bx < BOARD_WIDTH) {
              drawBlock(bx, by, currentPiece.type, 1, false);
            }
          }
        }
      }
      ctx.restore();
    }

    // 6. Line Clear Beam Wave Overlay
    if (clearingRows.length > 0) {
      clearingRows.forEach((row) => {
        const py = row * cellH;
        const grad = ctx.createLinearGradient(0, py, displayWidth, py);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.5, `rgba(255, 255, 255, ${1 - clearProgress})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, py - 2, displayWidth, cellH + 4);
      });
    }

    // 7. Exploding Block Particles
    particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    });

    // 8. Floating Action Notices (+800 QUAD!, COMBO, etc.)
    floatingNotices.forEach((n) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, n.alpha);
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillStyle = n.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fillText(n.text, n.x, n.y);
      ctx.restore();
    });

    // 9. Pause / Game Over Overlay on Canvas
    if (isPaused) {
      ctx.fillStyle = 'rgba(7, 9, 17, 0.75)';
      ctx.fillRect(0, 0, displayWidth, displayHeight);
      ctx.font = 'black 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#f97316';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', displayWidth / 2, displayHeight / 2 - 10);
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Press P or Tap to Resume', displayWidth / 2, displayHeight / 2 + 15);
    }

    ctx.restore();
  }, [
    grid,
    currentPiece,
    clearingRows,
    clearProgress,
    particles,
    floatingNotices,
    shakeOffset,
    isPaused,
    isGameOver
  ]);

  return (
    <div className="relative w-full aspect-[1/2] max-w-[280px] xs:max-w-[310px] sm:max-w-[340px] md:max-w-[360px] rounded-2xl p-1 bg-gradient-to-b from-slate-800/80 via-slate-900/90 to-slate-950 border-2 border-orange-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-xl block cursor-pointer"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};
