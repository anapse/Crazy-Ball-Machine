import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';

interface GameCanvasProps {
  engine: GameEngine;
  isPlaying?: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine, isPlaying = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set internal high-DPI canvas buffer resolution
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const logicalWidth = 450;
    const logicalHeight = isPlaying ? 720 : 800;

    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;

    engine.setViewportDimensions(logicalWidth, logicalHeight);
    engine.attachCanvas(canvas);
  }, [engine, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block cursor-pointer touch-none select-none bg-neutral-950"
      style={{ touchAction: 'none' }}
    />
  );
};
