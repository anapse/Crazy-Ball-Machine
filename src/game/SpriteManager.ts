// Sprite Manager for preloading and drawing official image assets in Crazy Ball Machine
// Authoritative, proportional, non-distorted rendering with visual boundaries separate from collision bounds.

class SpriteManager {
  private images: Record<string, HTMLImageElement> = {};
  private loadedKeys: Set<string> = new Set();

  private assetFiles: Record<string, string> = {
    fondo: 'fondo.png',
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
  public drawSpriteProportional(
    ctx: CanvasRenderingContext2D,
    key: string,
    col: number,
    row: number,
    cols: number,
    rows: number,
    cx: number,
    cy: number,
    targetWidth: number,
    targetHeight: number,
    rotation: number = 0
  ): boolean {
    const img = this.images[key];
    if (img && img.complete && img.naturalWidth > 0) {
      const sw = img.naturalWidth / cols;
      const sh = img.naturalHeight / rows;
      const sx = col * sw;
      const sy = row * sh;

      ctx.save();
      ctx.translate(cx, cy);
      if (rotation !== 0) {
        ctx.rotate(rotation);
      }
      ctx.drawImage(img, sx, sy, sw, sh, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
      ctx.restore();
      return true;
    }
    return false;
  }

  // --- RENDERING HELPERS ---

  // 1. Full Background (fondo.png)
  public drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const img = this.images['fondo'];
    if (img && img.complete && img.naturalWidth > 0) {
      const tileH = (w / img.naturalWidth) * img.naturalHeight;
      for (let y = 0; y < h; y += tileH) {
        ctx.drawImage(img, 0, y, w, tileH);
      }
      return true;
    }
    console.error('[SPRITE ERROR] fondo');
    return false;
  }

  // 2. Logo Title (logo.png)
  public drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const img = this.images['logo'];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
      return true;
    }
    console.error('[SPRITE ERROR] logo');
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
    const success = this.drawSpriteProportional(ctx, 'ladrillos', col, row, 4, 2, x, y, 44, 44, 0);
    if (!success) {
      console.error('[SPRITE ERROR] ladrillos');
    }
    return success;
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
      row = 1; // Empty box frame
    } else {
      switch (reward) {
        case 'ball_1':
        case 'ball_2':
        case 'ball_3':
          col = 2; row = 0; break; // 3-Balls box
        case 'points_500':
          col = 3; row = 0; break; // Coins/Points box
        case 'power_explosive':
          col = 2; row = 1; break; // Bomb box
        case 'power_double':
        case 'power_triple':
          col = 1; row = 0; break; // Star box
        default:
          col = 1; row = 1; break; // Question mark box
      }
    }

    // Boxes must be clearly visible, centered, and proportional (size 54x54)
    const success = this.drawSpriteProportional(ctx, 'cajas', col, row, 4, 2, x, y, 54, 54, 0);
    if (!success) {
      console.error('[SPRITE ERROR] cajas');
    }
    return success;
  }

  // 5. Globos (globos.png: 4 rows x 4 cols grid)
  public drawBalloon(
    ctx: CanvasRenderingContext2D,
    color: string,
    x: number,
    y: number,
    r: number
  ): boolean {
    let col = 0;
    let row = 0;
    switch (color) {
      case '#ef4444': col = 0; row = 0; break; // Red
      case '#3b82f6': col = 1; row = 0; break; // Blue
      case '#10b981': col = 2; row = 0; break; // Green
      case '#f59e0b': col = 3; row = 0; break; // Yellow
      case '#8b5cf6': col = 0; row = 1; break; // Purple
      case '#f97316': col = 1; row = 1; break; // Orange
      case '#ec4899': col = 2; row = 1; break; // Pink
      default: col = 0; row = 0; break;
    }

    // Globos must have premium visual presence (size 56x56)
    const success = this.drawSpriteProportional(ctx, 'globos', col, row, 4, 4, x, y, 56, 56, 0);
    if (!success) {
      console.error('[SPRITE ERROR] globos');
    }
    return success;
  }

  // 6. Flechas (flechas.png: 2 rows x 3 cols grid)
  public drawArrow(
    ctx: CanvasRenderingContext2D,
    angle: number,
    x: number,
    y: number,
    w: number,
    h: number,
    forceX?: number,
    forceY?: number
  ): boolean {
    let col = 0;
    let row = 0;

    // Use actual force vector or angle to determine the EXACT frame of the 6 available directions
    if (forceX !== undefined && forceY !== undefined) {
      if (forceY < -50 && Math.abs(forceX) < 100) {
        col = 0; row = 0; // Up
      } else if (forceX > 50 && Math.abs(forceY) < 100) {
        col = 1; row = 0; // Right
      } else if (forceX < -50 && Math.abs(forceY) < 100) {
        col = 2; row = 0; // Left
      } else if (forceY > 50 && Math.abs(forceX) < 100) {
        col = 0; row = 1; // Down
      } else if (forceX > 50 && forceY > 50) {
        col = 1; row = 1; // Down-Right
      } else if (forceX < -50 && forceY > 50) {
        col = 2; row = 1; // Down-Left
      } else {
        col = 0; row = 1; // Down
      }
    } else {
      const normAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (Math.abs(normAngle - 1.5 * Math.PI) < 0.25) {
        col = 0; row = 0; // Up
      } else if (normAngle < 0.25 || normAngle > 1.75 * Math.PI) {
        col = 1; row = 0; // Right
      } else if (Math.abs(normAngle - Math.PI) < 0.25) {
        col = 2; row = 0; // Left
      } else if (Math.abs(normAngle - 0.5 * Math.PI) < 0.25) {
        col = 0; row = 1; // Down
      } else if (normAngle > 0 && normAngle < 0.5 * Math.PI) {
        col = 1; row = 1; // Down-Right
      } else {
        col = 2; row = 1; // Down-Left
      }
    }

    // Visual arrows are drawn perfectly with zero rotation because orientation is already in sheet.
    // Scale is set to 48x48 so they are highly visible and professional.
    const success = this.drawSpriteProportional(ctx, 'flechas', col, row, 3, 2, x, y, 48, 48, 0);
    if (!success) {
      console.error('[SPRITE ERROR] flechas');
    }
    return success;
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
    const numericId = oilId ? (parseInt(oilId.replace(/\D/g, '')) || 0) : Math.floor(x);
    const col = numericId % 3;

    // Oil is flat horizontal centered puddle. Drawn with size 95x95 so puddle maintains its flat aspect ratio
    const success = this.drawSpriteProportional(ctx, 'aceite', col, 0, 3, 1, x, y, 95, 95, 0);
    if (!success) {
      console.error('[SPRITE ERROR] aceite');
    }
    return success;
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
    let col = 0;
    let size = r * 2;
    if (itemType === 'gear') {
      col = 0;
      size = r * 2.3; // Make gear details and teeth big and chunky!
    } else if (itemType === 'windmill') {
      col = 1;
      size = r * 2.4; // Beautiful wide propeller
    } else if (itemType === 'bumper') {
      col = 2;
      size = r * 2.6; // High visibility circular bumper
    }

    const success = this.drawSpriteProportional(ctx, 'aspa_engranaje', col, 0, 3, 1, x, y, size, size, angle);
    if (!success) {
      console.error('[SPRITE ERROR] aspa_engranaje');
    }
    return success;
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
    let col = 0;
    if (angle > 0.1) col = 1; // Slanted right
    else if (angle < -0.1) col = 2; // Slanted left
    else col = 0; // Horizontal

    // Trampolines must use their corresponding sprite cell drawn at 64x64 with zero rotation
    const success = this.drawSpriteProportional(ctx, 'trampolin', col, 0, 3, 1, x, y, 64, 64, 0);
    if (!success) {
      console.error('[SPRITE ERROR] trampolin');
    }
    return success;
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

    // Classify orientation of the plank to match horizontal, vertical, or diagonal cell
    let col = 2; // Diagonal
    const absAngle = Math.abs(angle);
    if (Math.abs(dy) < 5 || absAngle < 0.1 || Math.abs(absAngle - Math.PI) < 0.1) {
      col = 0; // Horizontal
    } else if (Math.abs(dx) < 5 || Math.abs(absAngle - Math.PI / 2) < 0.1) {
      col = 1; // Vertical
    }

    // Set fixed premium visual thickness so maderas are never squished to invisible lines
    const visualThickness = Math.max(16, thickness * 1.5);

    const success = this.drawSpriteProportional(ctx, 'trabesanos', col, 0, 3, 1, (x1 + x2) / 2, (y1 + y2) / 2, len, visualThickness, angle);
    if (!success) {
      console.error('[SPRITE ERROR] trabesanos');
    }
    return success;
  }

  // 11. Pelota / Metallic Ball (bolas.png 4x4 grid or pelota.png)
  public drawBall(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    ballType: string = 'standard'
  ): boolean {
    // If metallic standard, draw pelota.png
    if (ballType === 'standard') {
      const pelotaImg = this.images['pelota'];
      if (pelotaImg && pelotaImg.complete && pelotaImg.naturalWidth > 0) {
        ctx.save();
        ctx.translate(x, y);
        // Draw centered and perfectly circular (using square draw box r*2.1)
        ctx.drawImage(pelotaImg, 0, 0, pelotaImg.naturalWidth, pelotaImg.naturalHeight, -r * 1.05, -r * 1.05, r * 2.1, r * 2.1);
        ctx.restore();
        return true;
      }
    }

    // Otherwise draw special balls from bolas.png (Columns = 4, Rows = 4)
    let col = 0;
    let row = 0;
    switch (ballType) {
      case 'standard':  col = 0; row = 0; break;
      case 'fast':      col = 1; row = 0; break;
      case 'explosive': col = 2; row = 0; break;
      case 'shield':    col = 3; row = 0; break;
      case 'double':    col = 3; row = 3; break;
      case 'triple':    col = 3; row = 1; break;
      default:          col = 0; row = 0; break;
    }

    const success = this.drawSpriteProportional(ctx, 'bolas', col, row, 4, 4, x, y, r * 2.1, r * 2.1, 0);
    if (!success) {
      console.error('[SPRITE ERROR] bolas');
    }
    return success;
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
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    // Apply robust visual radius (pipe segment)
    const visualRadius = Math.max(16, radius * 1.3);

    const success = this.drawSpriteProportional(ctx, 'tuberias_dianas_bombas', 0, 0, 6, 2, (x1 + x2) / 2, (y1 + y2) / 2, len, visualRadius * 2, angle);
    if (!success) {
      console.error('[SPRITE ERROR] tuberias_dianas_bombas');
    }
    return success;
  }

  // 13. Target / Diana (tuberias_dianas_bombas.png: Row 1, Col 0 Red / Col 2 Yellow)
  public drawTarget(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    isSpecial: boolean
  ): boolean {
    const col = isSpecial ? 2 : 0; // Col 2 = Yellow, Col 0 = Red

    // Drawn with premium visual size (46x46)
    const success = this.drawSpriteProportional(ctx, 'tuberias_dianas_bombas', col, 1, 6, 2, x, y, 46, 46, 0);
    if (!success) {
      console.error('[SPRITE ERROR] tuberias_dianas_bombas');
    }
    return success;
  }

  // 14. Bomb / Bomba (tuberias_dianas_bombas.png: Row 1, Col 4)
  public drawBomb(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number
  ): boolean {
    // Bomb is drawn with high quality visual size (44x44)
    const success = this.drawSpriteProportional(ctx, 'tuberias_dianas_bombas', 4, 1, 6, 2, x, y, 44, 44, 0);
    if (!success) {
      console.error('[SPRITE ERROR] tuberias_dianas_bombas');
    }
    return success;
  }
}

export const spriteManager = new SpriteManager();
