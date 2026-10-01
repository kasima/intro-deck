// Procedural placeholder art. Every texture here is replaced by a PixelLab
// asset when one is listed in ASSETS (see assets.js).

const W = 480;
const H = 270;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shade(color, amt) {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const f = (v) => Phaser.Math.Clamp(Math.round(v + amt), 0, 255);
  return Phaser.Display.Color.GetColor(f(c.red), f(c.green), f(c.blue));
}

export function makeSky(scene, key, [top, bottom]) {
  const g = scene.make.graphics({ add: false });
  const steps = 12;
  const a = Phaser.Display.Color.IntegerToColor(top);
  const b = Phaser.Display.Color.IntegerToColor(bottom);
  for (let i = 0; i < steps; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, steps - 1, i);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
    g.fillRect(0, Math.floor((H / steps) * i), W, Math.ceil(H / steps) + 1);
  }
  g.generateTexture(key, W, H);
  g.destroy();
}

// Draws a repeating skyline strip (W x H, transparent above the shapes).
export function makeSkyline(scene, key, type, color, seed) {
  const g = scene.make.graphics({ add: false });
  const r = rng(seed);
  const base = H - 40;
  g.fillStyle(color);

  const box = (x, w, h) => g.fillRect(x, base - h, w, h + 40);

  switch (type) {
    case 'temple':
      for (let x = 0; x < W; x += 120) {
        const cx = x + 40 + r() * 40;
        box(cx - 30, 60, 30);
        box(cx - 18, 36, 50);
        g.fillTriangle(cx - 22, base - 50, cx + 22, base - 50, cx, base - 120);
        g.fillRect(cx - 1, base - 140, 3, 22);
        // palm
        const px = x + r() * 30;
        g.fillRect(px, base - 70, 3, 70);
        g.fillEllipse(px + 1, base - 72, 28, 10);
      }
      break;
    case 'clouds':
      for (let i = 0; i < 7; i++) {
        const x = r() * W;
        const y = 40 + r() * 140;
        g.fillEllipse(x, y, 60 + r() * 50, 18 + r() * 10);
        g.fillEllipse(x + 20, y - 8, 36, 20);
      }
      break;
    case 'campus':
      for (let x = 0; x < W; x += 96) {
        box(x + 4, 80, 40 + r() * 20);
        if (r() > 0.5) {
          g.fillEllipse(x + 44, base - 62, 30, 30);
          box(x + 30, 28, 60);
        }
        g.fillEllipse(x + 90, base - 40, 26, 34);
        g.fillRect(x + 89, base - 30, 3, 30);
      }
      break;
    case 'chicago':
    case 'office':
    case 'bangkok':
      for (let x = 0; x < W; ) {
        const w = 18 + Math.floor(r() * 30);
        const tall = type === 'office' ? 40 + r() * 60 : 50 + r() * (type === 'bangkok' ? 150 : 130);
        box(x, w, tall);
        if (type === 'chicago' && r() > 0.7) g.fillRect(x + w / 2 - 1, base - tall - 24, 2, 24);
        if (type === 'bangkok' && r() > 0.8) {
          // stepped "pixel" tower
          for (let k = 0; k < 5; k++) g.fillRect(x + (k % 2) * 4, base - tall - k * 10, w - 4, 10);
        }
        x += w + Math.floor(r() * 8);
      }
      break;
    case 'sf':
      g.fillEllipse(W * 0.25, base + 20, W * 0.7, 120);
      g.fillEllipse(W * 0.8, base + 30, W * 0.6, 100);
      // bridge tower + cables
      g.fillStyle(0xc0362c);
      g.fillRect(W * 0.6, base - 120, 6, 120);
      g.fillRect(W * 0.6 + 18, base - 120, 6, 120);
      g.fillRect(W * 0.6, base - 110, 24, 4);
      g.fillRect(0, base - 30, W, 4);
      g.lineStyle(1, 0xc0362c);
      g.beginPath();
      g.moveTo(0, base - 50);
      g.lineTo(W * 0.6, base - 116);
      g.lineTo(W, base - 50);
      g.strokePath();
      g.fillStyle(color);
      for (let x = 0; x < W; x += 22) box(x, 16, 10 + r() * 24);
      break;
    case 'camp':
      for (let x = 0; x < W; x += 30) {
        const h = 40 + r() * 50;
        g.fillTriangle(x, base, x + 24, base, x + 12, base - h);
      }
      g.fillTriangle(140, base, 200, base, 170, base - 34);
      g.fillTriangle(330, base, 380, base, 355, base - 28);
      break;
  }

  g.generateTexture(key, W, H);
  g.destroy();
}

export function makeGround(scene, key, color) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(shade(color, -20));
  g.fillRect(0, 0, 16, 16);
  g.fillStyle(color);
  g.fillRect(0, 0, 16, 5);
  g.fillStyle(shade(color, 35));
  g.fillRect(0, 0, 16, 2);
  g.fillStyle(shade(color, -45));
  g.fillRect(3, 9, 2, 2);
  g.fillRect(11, 12, 2, 2);
  g.generateTexture(key, 16, 16);
  g.destroy();
}

// A tiny pixel person. Sizes grow with age.
export function makePlayer(scene, key, age) {
  const dims = { toddler: [14, 20], student: [16, 32], adult: [16, 34] }[age];
  const [w, h] = dims;
  const g = scene.make.graphics({ add: false });
  const head = Math.round(h * (age === 'toddler' ? 0.5 : 0.33));
  // hair (curly, chunky)
  g.fillStyle(0x111111);
  g.fillRect(1, 0, w - 2, Math.ceil(head * 0.5));
  g.fillRect(0, 2, 2, head - 2);
  g.fillRect(w - 3, 2, 3, head - 2);
  // face
  g.fillStyle(0xd9a271);
  g.fillRect(3, Math.ceil(head * 0.4), w - 6, head - Math.ceil(head * 0.4));
  // glasses (grown-ups)
  if (age === 'student' || age === 'adult') {
    g.fillStyle(0x000000);
    g.fillRect(4, Math.ceil(head * 0.55), w - 7, 2);
  } else {
    g.fillStyle(0x000000);
    g.fillRect(w - 6, Math.ceil(head * 0.6), 2, 2);
  }
  // body
  const bodyColor = { toddler: 0xffd23f, student: 0xb5122e, adult: 0x1f2f5c }[age];
  g.fillStyle(bodyColor);
  g.fillRect(2, head, w - 4, Math.round((h - head) * 0.6));
  if (age === 'adult') {
    g.fillStyle(0x111111);
    g.fillRect(w / 2 - 2, head, 4, Math.round((h - head) * 0.5));
  }
  // legs
  g.fillStyle(age === 'toddler' ? 0xc0362c : 0x2b3a55);
  const legTop = head + Math.round((h - head) * 0.6);
  g.fillRect(3, legTop, 4, h - legTop);
  g.fillRect(w - 7, legTop, 4, h - legTop);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function makePickup(scene, key, type) {
  const g = scene.make.graphics({ add: false });
  const colors = {
    mango: [0xffc23d, 0x5aa02c],
    star: [0xffe14d, 0xffffff],
    floppy: [0x2a5bd7, 0xdddddd],
    coffee: [0xffffff, 0x6b3e1f],
    commit: [0x2ea44f, 0xffffff],
    block: [0x8a5cf6, 0xffffff],
    paper: [0xffffff, 0x3b2a7a],
  }[type];
  g.fillStyle(colors[0]);
  if (type === 'star' || type === 'mango') {
    g.fillCircle(6, 6, 5);
    g.fillStyle(colors[1]);
    g.fillRect(5, 0, 3, 2);
  } else if (type === 'commit') {
    g.fillCircle(6, 6, 5);
    g.fillStyle(colors[1]);
    g.fillCircle(6, 6, 2);
  } else {
    g.fillRect(1, 1, 10, 10);
    g.fillStyle(colors[1]);
    g.fillRect(3, 2, 6, 3);
  }
  g.generateTexture(key, 12, 12);
  g.destroy();
}

export function makeGoal(scene, key) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0xeeeeee);
  g.fillRect(2, 0, 3, 56);
  g.fillStyle(0xffd23f);
  g.fillTriangle(5, 2, 5, 22, 30, 12);
  g.fillStyle(0x666666);
  g.fillRect(0, 54, 8, 4);
  g.generateTexture(key, 32, 58);
  g.destroy();
}
