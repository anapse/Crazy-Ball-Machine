import React from 'react';

type SpriteName = 'ball' | 'double' | 'triple' | 'fast' | 'explosive' | 'shield' | 'star' | 'coins';

interface SpriteIconProps {
  name: SpriteName;
  className?: string;
  size?: number;
}

export const SpriteIcon: React.FC<SpriteIconProps> = ({ name, className = 'w-5 h-5', size }) => {
  let posX = '0%';
  let posY = '0%';

  switch (name) {
    case 'ball':
      posX = '0%'; posY = '0%';
      break;
    case 'fast':
      posX = '33.333%'; posY = '0%';
      break;
    case 'explosive':
      posX = '66.666%'; posY = '66.666%';
      break;
    case 'shield':
      posX = '33.333%'; posY = '33.333%';
      break;
    case 'triple':
      posX = '100%'; posY = '33.333%';
      break;
    case 'double':
      posX = '100%'; posY = '66.666%';
      break;
    case 'star':
      posX = '0%'; posY = '66.666%';
      break;
    default:
      posX = '0%'; posY = '0%';
      break;
  }

  const style: React.CSSProperties = {
    backgroundImage: 'url(assets/sprites/bolas.png)',
    backgroundPosition: `${posX} ${posY}`,
    backgroundSize: '400% 400%',
    width: size ? `${size}px` : undefined,
    height: size ? `${size}px` : undefined,
  };

  return (
    <div
      style={style}
      className={`inline-block shrink-0 rounded-full drop-shadow-md transition-transform ${className}`}
    />
  );
};
