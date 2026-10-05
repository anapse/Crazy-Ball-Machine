// Sprite Manager for preloading and drawing official image assets in Crazy Ball Machine
// Authoritative, proportional, non-distorted rendering with visual boundaries separate from collision bounds.

class SpriteManager {
  private images: Record<string, HTMLImageElement> = {};
  private loadedKeys: Set<string> = new Set();

  private assetFiles: Record<string, string> = {
    fondo: 'fondo.png',
    fondomenu: 'fondomenu.png',
    logo: 'logo.png',
    ladrillos: 'ladrillos.png',
    cajas: 'cajas.png',
    globos: 'globos.png',
    flechas: 'flechas.png',
    aceite: 'aceite.png',
    aspa_engranaje: 'aspa_engranaje.png',
    trampolin: 'trampolin.png',
    trabesanos: 'trabesanos.png',
    pelota: 'pelota.png',
    bolas: 'bolas.png',
    tuberias_dianas_bombas: 'tuberias_dianas_bombas.png',
  };

  constructor() {
    this.loadAll();
  }

  public loadAll(): Promise<void> {
    const promises = Object.entries(this.assetFiles).map(([key, filename]) => {
      return this.loadImageWithFallbacks(key, filename);
    });

    return Promise.all(promises).then(() => {});
  }

  private loadImageWithFallbacks(key: string, filename: string): Promise<void> {
    // Try multiple candidate paths in case base path differs between Vite dev, preview, and GitHub Pages
    const candidates = [
      `assets/sprites/${filename}`,
      `./assets/sprites/${filename}`,
      `/assets/sprites/${filename}`,
    ];

    return new Promise<void>((resolve) => {
      let candidateIdx = 0;

      const tryNextCandidate = () => {
        if (candidateIdx >= candidates.length) {
          console.error(`[SPRITE ERROR] Failed to load sprite '${key}' (${filename}) across all candidate paths.`);
          resolve();
          return;
        }

        const url = candidates[candidateIdx++];
        const img = new Image();

        img.onload = () => {
          this.images[key] = img;
          this.loadedKeys.add(key);
          resolve();
        };

        img.onerror = () => {
          tryNextCandidate();
        };

        img.src = url;
      };

      tryNextCandidate();
    });
  }

  public getImage(key: string): HTMLImageElement | null {
    return this.images[key] || null;
  }

  public isLoaded(key: string): boolean {
    const img = this.images[key];
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  // --- CENTRAL AUTHORITATIVE RENDERING ENGINE ---
  // Guarantees perfect aspect ratio, uniform scale, precise centering, and custom rotation.
  private cellBoundsCache: Record<string, { x: number; y: number; w: number; h: number }> = {};

  private getCellBounds(key: string, col: number, row: number, cols: number, rows: number) {
    const img = this.images[key];
    const sw = Math.floor(img.naturalWidth / cols);
    const sh = Math.floor(img.naturalHeight / rows);
    const cacheKey = `${key}:${col}:${row}:${cols}:${rows}`;
    const cached = this.cellBoundsCache[cacheKey];
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const c = canvas.getContext('2d', { willReadFrequently: true });
    if (!c) return { x: 0, y: 0, w: sw, h: sh };
    c.clearRect(0, 0, sw, sh);
    c.drawImage(img, col * sw, row * sh, sw, sh, 0, 0, sw, sh);

    const data = c.getImageData(0, 0, sw, sh).data;
    let minX = sw, minY = sh, maxX = -1, maxY = -1;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        if (data[(y * sw + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const bounds = maxX < 0
      ? { x: 0, y: 0, w: sw, h: sh }
      : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    this.cellBoundsCache[cacheKey] = bounds;
    return bounds;
  }

  // Authoritative renderer: trims transparent padding, preserves the cell aspect ratio,
  // centers the visible artwork and NEVER rotates a sprite-sheet cell unless the caller
  // explicitly asks for physical rotation on an asset that has no native orientation.
  public drawSpriteProportional(
    ctx: CanvasRenderingContext2D,
    key: string,
    col: number,
    row: number,
    cols: number,
    rows: number,
    cx: number,
    cy: number,
    maxWidth: number,
    maxHeight: number,
    rotation: number = 0
  ): boolean {
    const img = this.images[key];
    if (!img || !img.complete || img.naturalWidth <= 0) return false;

    const sw = Math.floor(img.naturalWidth / cols);
    const sh = Math.floor(img.naturalHeight / rows);
    const b = this.getCellBounds(key, col, row, cols, rows);
    const scale = Math.min(maxWidth / b.w, maxHeight / b.h);
    const dw = b.w * scale;
    const dh = b.h * scale;

    ctx.save();
    ctx.translate(cx, cy);
    if (rotation !== 0) ctx.rotate(rotation);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      img,
      col * sw + b.x, row * sh + b.y, b.w, b.h,
      -dw / 2, -dh / 2, dw, dh
    );
    ctx.restore();
    return true;
  }

  // --- RENDERING HELPERS ---

  // 1. Full Background (fondo.png / fondomenu.png)
  public drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, isMenu: boolean = false) {
    const key = isMenu ? 'fondomenu' : 'fondo';
    const img = this.images[key];
    if (img && img.complete && img.naturalWidth > 0) {
      const tileH = (w / img.naturalWidth) * img.naturalHeight;
      for (let y = 0; y < h; y += tileH) {
        ctx.drawImage(img, 0, y, w, tileH);
      }
      return true;
    }
    return false;
  }

  // 2. Logo Title (logo.png)
  public drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const img = this.images['logo'];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
      return true;
    }
    return false;
  }

  // 3. Breakable Block (ladrillos.png: 2 rows x 4 cols grid)
  public drawBlock(
    ctx: CanvasRenderingContext2D,
    color: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): boolean {
    let col = 0;
    let row = 0;
    switch (color) {
      case 'rojo': col = 0; row = 0; break;
      case 'azul': col = 1; row = 0; break;
      case 'verde': col = 2; row = 0; break;
      case 'amarillo': col = 3; row = 0; break;
      case 'morado': col = 0; row = 1; break;
      case 'rosa': col = 1; row = 1; break;
      case 'naranja': col = 2; row = 1; break;
      case 'gris': col = 3; row = 1; break;
      default: col = 0; row = 0; break;
    }

    // Centered block with visual dimensions separate from physics bounds
    // Block size is drawn beautifully as a square layout of 44x44 centered over block
    return this.drawSpriteProportional(ctx, 'ladrillos', col, row, 4, 2, x, y, 44, 44, 0);
  }

  // 4. Cajas (cajas.png: 2 rows x 4 cols grid)
  public drawBox(
    ctx: CanvasRenderingContext2D,
    reward: string,
    opened: boolean,
    x: number,
    y: number,
    w: number,
    h: number
  ): boolean {
    let col = 0;
    let row = 0;

    if (opened) {
      col = 0;
      row = 1; // Empty box open frame
    } else {
      switch (reward) {
        case 'ball_1':
        case 'ball_2':
        case 'ball_3':
          col = 2; row = 0; break; // 3-Balls crate
        case 'points_500':
        case 'points_250':
          col = 3; row = 0; break; // Coins/Points crate
        case 'power_explosive':
          col = 2; row = 1; break; // Bomb box
        case 'power_double':
        case 'power_triple':
          col = 1; row = 0; break; // Star box
        case 'empty':
          col = 0; row = 0; break; // Plain closed wooden crate
        default:
          col = 1; row = 1; break; // Question mark crate
      }
    }

    // Boxes must be clearly visible, centered, and proportional (size 54x54)
    return this.drawSpriteProportional(ctx, 'cajas', col, row, 4, 2, x, y, 54, 54, 0);
  }

  // 5. Globos (globos.png: 4 rows x 4 cols grid)
  public drawBalloon(
    ctx: CanvasRenderingContext2D,
    color: string,
    x: number,
    y: number,
    r: number
  ): boolean {
    const colors: Record<string, [number, number]> = {
      '#ef4444': [0, 0], '#3b82f6': [1, 0], '#10b981': [2, 0], '#f59e0b': [3, 0],
      '#8b5cf6': [0, 1], '#f97316': [1, 1], '#ec4899': [2, 1],
    };
    const [col, row] = colors[color] || [0, 0];
    return this.drawSpriteProportional(ctx, 'globos', col, row, 4, 4, x, y, Math.max(76, r * 3.6), Math.max(92, r * 4.2), 0);
  }

  // 6. Flechas (flechas.png: 2 rows x 3 cols grid)
  // Strict rule: NO rotar sprites. Cada celda del sprite sheet representa su dirección exacta.
  public drawArrow(
    ctx: CanvasRenderingContext2D,
    direction: string | number | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    forceX?: number,
    forceY?: number
  ): boolean {
    let col = 0;
    let row = 0;

    const dir = typeof direction === 'string' ? direction.toUpperCase() : '';
    if (dir === 'UP') {
      col = 0; row = 0;
    } else if (dir === 'DOWN') {
      col = 0; row = 1;
    } else if (dir === 'RIGHT') {
      col = 1; row = 0;
    } else if (dir === 'LEFT') {
      col = 2; row = 0;
    } else if (dir === 'DIAG_RIGHT') {
      col = 1; row = 1;
    } else if (dir === 'DIAG_LEFT') {
      col = 2; row = 1;
    } else {
      const fx = forceX !== undefined ? forceX : (typeof direction === 'number' ? Math.cos(direction) : 0);
      const fy = forceY !== undefined ? forceY : (typeof direction === 'number' ? Math.sin(direction) : 1);
      if (Math.abs(fx) > Math.abs(fy) * 1.5) {
        col = fx > 0 ? 1 : 2; row = 0;
      } else if (Math.abs(fy) > Math.abs(fx) * 1.5) {
        col = 0; row = fy > 0 ? 1 : 0;
      } else {
        col = fx >= 0 ? 1 : 2; row = 1;
      }
    }

    const size = Math.max(w, h, 68);
    // Explicit angle 0: cell has the native arrow orientation
    return this.drawSpriteProportional(ctx, 'flechas', col, row, 3, 2, x, y, size, size, 0);
  }

  // 7. Aceite (aceite.png: 1 row x 3 cols)
  public drawOil(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    oilId: string = ''
  ): boolean {
    const numericId = oilId ? (parseInt(oilId.replace(/\D/g, ''), 10) || 0) : Math.round(x + y);
    const col = Math.abs(numericId) % 3;
    return this.drawSpriteProportional(ctx, 'aceite', col, 0, 3, 1, x, y, Math.max(w, 76), Math.max(h, 46), 0);
  }

  // 8. Gear / Propeller / Shield Bumper (aspa_engranaje.png: 1 row x 3 items)
  public drawGearOrPropeller(
    ctx: CanvasRenderingContext2D,
    itemType: 'gear' | 'windmill' | 'bumper',
    angle: number,
    x: number,
    y: number,
    r: number
  ): boolean {
    const col = itemType === 'gear' ? 0 : itemType === 'windmill' ? 1 : 2;
    const size = itemType === 'gear' ? Math.max(88, r * 2.8) : itemType === 'windmill' ? Math.max(104, r * 3.0) : Math.max(74, r * 3.0);
    // These assets are designed to rotate physically, so rotation is retained here.
    return this.drawSpriteProportional(ctx, 'aspa_engranaje', col, 0, 3, 1, x, y, size, size, angle);
  }

  // 9. Trampolin (trampolin.png: 1 row x 3 items)
  public drawTrampoline(
    ctx: CanvasRenderingContext2D,
    angle: number,
    x: number,
    y: number,
    w: number,
    h: number
  ): boolean {
    const col = angle > 0.1 ? 1 : angle < -0.1 ? 2 : 0;
    const size = Math.max(88, w + 24, h + 24);
    return this.drawSpriteProportional(ctx, 'trampolin', col, 0, 3, 1, x, y, size, size, 0);
  }

  // 10. Trabesaños / Wooden Plank (trabesanos.png: 1 row x 3 items)
  public drawPlank(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const abs = Math.abs(angle);
    let col = 2;
    if (abs < 0.12 || Math.abs(abs - Math.PI) < 0.12) col = 0;
    else if (Math.abs(abs - Math.PI / 2) < 0.12) col = 1;
    const size = Math.max(88, len + 20, thickness * 5);
    // Native horizontal/vertical/diagonal cells. No rotation.
    return this.drawSpriteProportional(ctx, 'trabesanos', col, 0, 3, 1, (x1 + x2) / 2, (y1 + y2) / 2, size, size, 0);
  }

  // 11. Pelota / Metallic Ball (Always the official standard metallic ball: bolas.png [col=0, row=0])
  public drawBall(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number
  ): boolean {
    const size = Math.max(28, r * 2.5);
    return this.drawSpriteProportional(ctx, 'bolas', 0, 0, 4, 4, x, y, size, size, 0);
  }

  // 12. Pipe / Tubería (tuberias_dianas_bombas.png: Row 0, Col 0)
  public drawPipe(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radius: number
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const a = Math.atan2(dy, dx);
    const abs = Math.abs(a);
    let col = 0;
    if (abs < 0.25 || abs > Math.PI - 0.25) col = 0;
    else if (Math.abs(abs - Math.PI / 2) < 0.25) col = 1;
    else if (dy >= 0 && dx >= 0) col = 2;
    else if (dy >= 0 && dx < 0) col = 3;
    else col = dx >= 0 ? 2 : 3;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const size = Math.max(88, Math.hypot(dx, dy) + radius * 2.5);
    return this.drawSpriteProportional(ctx, 'tuberias_dianas_bombas', col, 0, 6, 2, cx, cy, size, size, 0);
  }

  // 13. Target / Diana (tuberias_dianas_bombas.png: Row 1, Col 0 Red / Col 2 Yellow)
  public drawTarget(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    isSpecial: boolean,
    hitTimer: number = 0
  ): boolean {
    const col = isSpecial ? 2 : 0; // Col 2 = Yellow, Col 0 = Red
    const baseSize = Math.max(70, r * 3.3);
    const pulseScale = hitTimer > 0 ? 1 + (hitTimer / 0.3) * 0.25 : 1.0;
    const size = baseSize * pulseScale;
    return this.drawSpriteProportional(ctx, 'tuberias_dianas_bombas', col, 1, 6, 2, x, y, size, size, 0);
  }

  // 14. Bomb / Bomba (tuberias_dianas_bombas.png: Row 1, Col 4)
  public drawBomb(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number
  ): boolean {
    return this.drawSpriteProportional(ctx, 'tuberias_dianas_bombas', 4, 1, 6, 2, x, y, Math.max(74, r * 3.6), Math.max(74, r * 3.6), 0);
  }
}

export const spriteManager = new SpriteManager();
