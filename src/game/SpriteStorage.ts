// Sprite storage and image loader for Crazy Ball Machine
// Supports loading official sprites with seamless fallback to canvas-drawn carnival arcade graphics

export const REQUIRED_SPRITES = [
  'logo.png',
  'ball.png',
  'ball_fast.png',
  'ball_explosive.png',
  'ball_power.png',
  'launcher.png',
  'channel.png',
  'trampoline.png',
  'bumper.png',
  'breakable_block.png',
  'bomb.png',
  'balloon.png',
  'oil.png',
  'fan.png',
  'gear.png',
  'target.png',
  'box.png',
  'box_powerup.png',
  'box_balls.png',
  'box_empty.png',
  'box_special.png',
];

class SpriteStorage {
  private images: Map<string, HTMLImageElement> = new Map();
  private loaded: boolean = false;

  public async preloadSprites(): Promise<void> {
    const promises = REQUIRED_SPRITES.map((spriteName) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.images.set(spriteName, img);
          resolve();
        };
        img.onerror = () => {
          // Sprite not provided yet - will fallback to high-quality procedural canvas drawing
          resolve();
        };
        // Use relative path for GitHub Pages compatibility
        img.src = `./assets/sprites/${spriteName}`;
      });
    });

    await Promise.all(promises);
    this.loaded = true;
  }

  public getSprite(name: string): HTMLImageElement | null {
    return this.images.get(name) || null;
  }

  public hasSprite(name: string): boolean {
    return this.images.has(name);
  }

  public isLoaded(): boolean {
    return this.loaded;
  }
}

export const spriteStorage = new SpriteStorage();
