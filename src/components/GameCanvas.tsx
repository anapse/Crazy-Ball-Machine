import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';

interface GameCanvasProps {
  engine: GameEngine;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set internal high-DPI canvas buffer resolution
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 450 * dpr;
    canvas.height = 800 * dpr;

    engine.attachCanvas(canvas);
  }, [engine]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block cursor-pointer touch-none select-none bg-neutral-950"
      style={{ touchAction: 'none' }}
    />
  );
};
