import React, { useRef, useEffect } from 'react';
import type { CakeLayer, FallingSlice } from './types';
import { CakeRenderer } from './cakeRenderer';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './physics';

interface CakeCanvasProps {
  stack: CakeLayer[];
  movingLayer: CakeLayer | null;
  fallingSlices: FallingSlice[];
  cameraY: number;
  renderer: CakeRenderer;
  onDrop: () => void;
  isInteractive: boolean;
}

export const CakeCanvas: React.FC<CakeCanvasProps> = ({
  stack,
  movingLayer,
  fallingSlices,
  cameraY,
  renderer,
  onDrop,
  isInteractive
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // High-DPI Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions respecting display pixel ratio
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);

    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    renderer.render(ctx, stack, movingLayer, fallingSlices, cameraY);
  }, [stack, movingLayer, fallingSlices, cameraY, renderer]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    // Primary click or touch only
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    onDrop();
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className={`relative w-full max-w-[440px] aspect-[480/700] mx-auto select-none touch-none rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0d0910] ${
        isInteractive ? 'cursor-pointer active:scale-[0.998] transition-transform duration-75' : ''
      }`}
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
