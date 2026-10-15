// 2D/3D Fast Simplex Noise implementation for procedural terrain generation
export class SimplexNoise {
  private p: Uint8Array = new Uint8Array(256);
  private perm: Uint8Array = new Uint8Array(512);
  private permMod12: Uint8Array = new Uint8Array(512);

  private static G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
  private static F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  private static grad3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
  ];

  constructor(seed = 1337) {
    this.init(seed);
  }

  public init(seed: number) {
    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }
    // LCG PRNG for deterministic seed shuffling
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const r = Math.floor((s / 2147483647) * (i + 1));
      const t = this.p[i];
      this.p[i] = this.p[r];
      this.p[r] = t;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = (this.perm[i] % 12);
    }
  }

  public noise2D(xin: number, yin: number): number {
    let n0 = 0, n1 = 0, n2 = 0;
    const s = (xin + yin) * SimplexNoise.F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * SimplexNoise.G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1: number, j1: number;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + SimplexNoise.G2;
    const y1 = y0 - j1 + SimplexNoise.G2;
    const x2 = x0 - 1.0 + 2.0 * SimplexNoise.G2;
    const y2 = y0 - 1.0 + 2.0 * SimplexNoise.G2;

    const ii = i & 255;
    const jj = j & 255;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const gi0 = this.permMod12[ii + this.perm[jj]];
      const g0 = SimplexNoise.grad3[gi0];
      t0 *= t0;
      n0 = t0 * t0 * (g0[0] * x0 + g0[1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
      const g1 = SimplexNoise.grad3[gi1];
      t1 *= t1;
      n1 = t1 * t1 * (g1[0] * x1 + g1[1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
      const g2 = SimplexNoise.grad3[gi2];
      t2 *= t2;
      n2 = t2 * t2 * (g2[0] * x2 + g2[1] * y2);
    }

    // Range [-1, 1]
    return 70.0 * (n0 + n1 + n2);
  }

  // Fractional Brownian Motion for natural multi-octave terrain
  public fbm2D(x: number, y: number, octaves = 4, persistence = 0.5, lacunarity = 2.0): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}
