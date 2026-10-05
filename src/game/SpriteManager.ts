// Sprite Manager for preloading and drawing official image assets in Crazy Ball Machine

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
          console.warn(`[SpriteManager] Failed to load sprite '${key}' (${filename}) across all candidate paths.`);
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
    const img = this.images['ladrillos'];
    if (img && img.complete && img.naturalWidth > 0) {
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

      const sw = img.naturalWidth / 4;
      const sh = img.naturalHeight / 2;

      ctx.drawImage(img, col * sw, row * sh, sw, sh, x - w / 2, y - h / 2, w, h);
      return true;
    }
    return false;
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
    const img = this.images['cajas'];
    if (img && img.complete && img.naturalWidth > 0) {
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

      const sw = img.naturalWidth / 4;
      const sh = img.naturalHeight / 2;

      ctx.drawImage(img, col * sw, row * sh, sw, sh, x - w / 2, y - h / 2, w, h);
      return true;
    }
    return false;
  }

  // 5. Globos (globos.png: 4 rows x 4 cols grid)
  public drawBalloon(
    ctx: CanvasRenderingContext2D,
    color: string,
    x: number,
    y: number,
    r: number
  ): boolean {
    const img = this.images['globos'];
    if (img && img.complete && img.naturalWidth > 0) {
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

      const sw = img.naturalWidth / 4;
      const sh = img.naturalHeight / 4;

      ctx.drawImage(img, col * sw, row * sh, sw, sh, x - r, y - r, r * 2, r * 2);
      return true;
    }
    return false;
  }

  // 6. Flechas (flechas.png: 2 rows x 3 cols grid)
  public drawArrow(
    ctx: CanvasRenderingContext2D,
    angle: number,
    x: number,
    y: number,
    w: number,
    h: number
  ): boolean {
    const img = this.images['flechas'];
    if (img && img.complete && img.naturalWidth > 0) {
      let col = 0;
      let row = 0;

      if (angle > 0.1) {
        col = 1; row = 1; // Down-Right
      } else if (angle < -0.1) {
        col = 2; row = 1; // Down-Left
      } else {
        col = 0; row = 1; // Down
      }

      const sw = img.naturalWidth / 3;
      const sh = img.naturalHeight / 2;

      ctx.drawImage(img, col * sw, row * sh, sw, sh, x - w / 2, y - h / 2, w, h);
      return true;
    }
    return false;
  }

  // 7. Aceite (aceite.png: 1 row x 3 cols)
  public drawOil(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): boolean {
    const img = this.images['aceite'];
    if (img && img.complete && img.naturalWidth > 0) {
      const sw = img.naturalWidth / 3;
      const sh = img.naturalHeight;
      ctx.drawImage(img, 0, 0, sw, sh, x - w / 2, y - h / 2, w, h);
      return true;
    }
    return false;
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
    const img = this.images['aspa_engranaje'];
    if (img && img.complete && img.naturalWidth > 0) {
      let col = 0;
      if (itemType === 'gear') col = 0;
      else if (itemType === 'windmill') col = 1;
      else if (itemType === 'bumper') col = 2;

      const sw = img.naturalWidth / 3;
      const sh = img.naturalHeight;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.drawImage(img, col * sw, 0, sw, sh, -r, -r, r * 2, r * 2);
      ctx.restore();
      return true;
    }
    return false;
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
    const img = this.images['trampolin'];
    if (img && img.complete && img.naturalWidth > 0) {
      let col = 0;
      if (angle > 0.1) col = 1; // Slanted right
      else if (angle < -0.1) col = 2; // Slanted left
      else col = 0; // Horizontal

      const sw = img.naturalWidth / 3;
      const sh = img.naturalHeight;

      ctx.drawImage(img, col * sw, 0, sw, sh, x - w / 2, y - h / 2, w, h * 1.6);
      return true;
    }
    return false;
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
    const img = this.images['trabesanos'];
    if (img && img.complete && img.naturalWidth > 0) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      const sw = img.naturalWidth / 3;
      const sh = img.naturalHeight;

      ctx.save();
      ctx.translate(x1, y1);
      ctx.rotate(angle);
      ctx.drawImage(img, 0, 0, sw, sh, 0, -thickness / 2, len, thickness * 1.5);
      ctx.restore();
      return true;
    }
    return false;
  }

  // 11. Pelota / Metallic Ball (bolas.png 4x4 grid or pelota.png)
  public drawBall(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    ballType: string = 'standard'
  ): boolean {
    const bolasImg = this.images['bolas'];
    if (bolasImg && bolasImg.complete && bolasImg.naturalWidth > 0) {
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

      const sw = bolasImg.naturalWidth / 4;
      const sh = bolasImg.naturalHeight / 4;

      ctx.drawImage(bolasImg, col * sw, row * sh, sw, sh, x - r, y - r, r * 2, r * 2);
      return true;
    }

    const pelotaImg = this.images['pelota'];
    if (pelotaImg && pelotaImg.complete && pelotaImg.naturalWidth > 0) {
      ctx.drawImage(pelotaImg, 0, 0, pelotaImg.naturalWidth, pelotaImg.naturalHeight, x - r, y - r, r * 2, r * 2);
      return true;
    }

    return false;
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
    const img = this.images['tuberias_dianas_bombas'];
    if (img && img.complete && img.naturalWidth > 0) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      const sw = img.naturalWidth / 6;
      const sh = img.naturalHeight / 2;

      ctx.save();
      ctx.translate(x1, y1);
      ctx.rotate(angle);
      ctx.drawImage(img, 0, 0, sw, sh, 0, -radius, len, radius * 2);
      ctx.restore();
      return true;
    }
    return false;
  }

  // 13. Target / Diana (tuberias_dianas_bombas.png: Row 1, Col 0 Red / Col 2 Yellow)
  public drawTarget(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    isSpecial: boolean
  ): boolean {
    const img = this.images['tuberias_dianas_bombas'];
    if (img && img.complete && img.naturalWidth > 0) {
      const col = isSpecial ? 2 : 0; // Col 2 = Yellow, Col 0 = Red
      const sw = img.naturalWidth / 6;
      const sh = img.naturalHeight / 2;

      ctx.drawImage(img, col * sw, sh, sw, sh, x - r, y - r, r * 2, r * 2);
      return true;
    }
    return false;
  }

  // 14. Bomb / Bomba (tuberias_dianas_bombas.png: Row 1, Col 4)
  public drawBomb(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number
  ): boolean {
    const img = this.images['tuberias_dianas_bombas'];
    if (img && img.complete && img.naturalWidth > 0) {
      const sw = img.naturalWidth / 6;
      const sh = img.naturalHeight / 2;

      ctx.drawImage(img, 4 * sw, sh, sw, sh, x - r, y - r, r * 2, r * 2);
      return true;
    }
    return false;
  }
}

export const spriteManager = new SpriteManager();
