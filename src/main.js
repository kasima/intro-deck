import { CHAPTERS } from './chapters.js';
import { ASSETS } from './assets.js';
import { bindKeyboard, showControls } from './controls.js';
import { makeSky, makeSkyline, makeGround, makePlayer, makePickup, makeGoal } from './art.js';

const W = 480;
const H = 270;
const GROUND_Y = 222;
const FONT = '"Press Start 2P", monospace';

const RUN_SPEED = 130;
const JUMP_VELOCITY = -380;
const COYOTE_MS = 90;
const JUMP_BUFFER_MS = 120;

function text(scene, x, y, str, size = 8, color = '#ffffff', opts = {}) {
  return scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    align: opts.align ?? 'left',
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    lineSpacing: opts.lineSpacing ?? 4,
    stroke: opts.stroke ?? '#000000',
    strokeThickness: opts.strokeThickness ?? 0,
  });
}

class Boot extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    for (const [id, path] of Object.entries(ASSETS.bg)) this.load.image(`bg-${id}`, path);
    this.load.image('poster', ASSETS.poster);
    this.load.image('logo', ASSETS.logo);
    ASSETS.spin.forEach((path, i) => this.load.image(`spin-${i}`, path));
    for (const [age, anims] of Object.entries(ASSETS.hero)) {
      for (const [name, frames] of Object.entries(anims)) {
        frames.forEach((path, i) => this.load.image(`hero-${age}-${name}-${i}`, path));
      }
    }
  }

  async create() {
    CHAPTERS.forEach((c, i) => {
      makeSky(this, `sky-${c.id}`, c.sky);
      const far = Phaser.Display.Color.IntegerToColor(c.sky[0]).darken(25).color;
      const near = Phaser.Display.Color.IntegerToColor(c.sky[0]).darken(45).color;
      makeSkyline(this, `far-${c.id}`, c.skyline, far, i * 97 + 1);
      makeSkyline(this, `near-${c.id}`, c.skyline, near, i * 131 + 7);
      makeGround(this, `ground-${c.id}`, c.ground);
    });
    for (const age of ['toddler', 'student', 'adult']) makePlayer(this, `player-${age}`, age);
    for (const p of ['mango', 'star', 'floppy', 'coffee', 'commit', 'block', 'paper']) makePickup(this, `pickup-${p}`, p);
    makeGoal(this, 'goal');

    for (const [age, anims] of Object.entries(ASSETS.hero)) {
      for (const [name, frames] of Object.entries(anims)) {
        this.anims.create({
          key: `hero-${age}-${name}`,
          frames: frames.map((_, i) => ({ key: `hero-${age}-${name}-${i}` })),
          frameRate: name === 'run' ? 12 : 6,
          repeat: name === 'jump' ? 0 : -1,
        });
      }
    }

    this.anims.create({
      key: 'spin',
      frames: ASSETS.spin.map((_, i) => ({ key: `spin-${i}` })),
      frameRate: 8,
      repeat: -1,
    });

    try {
      await Promise.all([document.fonts.load(`8px ${FONT}`), document.fonts.load('10px VT323')]);
    } catch {}
    // ?ch=N jumps straight to chapter N (1-based) for testing
    const ch = parseInt(new URLSearchParams(location.search).get('ch'), 10);
    if (ch >= 1 && ch <= CHAPTERS.length) this.scene.start('level', { index: ch - 1, score: 0 });
    else this.scene.start('title');
  }
}

class Title extends Phaser.Scene {
  constructor() {
    super('title');
  }

  // A static "movie poster" splash. Pressing start makes the hero leap off
  // the stage and drop into chapter 1.
  create() {
    showControls(false);
    this.leaving = false;

    this.add.image(W / 2, H, 'poster').setOrigin(0.5, 1).setScale(H / 224);

    // slowly turning light rays behind the hero
    const rays = this.add.graphics({ x: W / 2, y: 150 }).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      rays.fillStyle(0xffd27a, 0.07);
      rays.fillTriangle(0, 0, Math.cos(a) * 320, Math.sin(a) * 320, Math.cos(a + 0.18) * 320, Math.sin(a + 0.18) * 320);
    }
    this.rays = rays;
    this.raySpeed = 0.004;

    // spotlight pool on the stage
    this.add.ellipse(W / 2, 204, 90, 16, 0xfff1b8, 0.35).setBlendMode(Phaser.BlendModes.ADD);

    this.hero = this.add.sprite(W / 2, 210, 'spin-0').setOrigin(0.5, 1).setScale(2).play('spin');
    this.tweens.add({ targets: this.hero, y: 204, duration: 900, ease: 'Sine.InOut', yoyo: true, repeat: -1 });

    this.poster = this.add.dom(0, 0, posterElement()).setOrigin(0);

    // pixel-art ออม logo (PixelLab), drawn on the canvas so it scales crisply
    this.logo = this.add.image(W / 2, 11, 'logo').setOrigin(0.5, 0);

    const start = () => {
      if (this.leaving) return;
      this.leaving = true;
      if (this.sys.game.device.input.touch && !this.scale.isFullscreen) {
        try {
          this.scale.startFullscreen();
        } catch {}
      }
      this.leap();
    };
    this.input.once('pointerdown', start);
    this.input.keyboard.once('keydown', start);
  }

  update() {
    this.rays.rotation += this.raySpeed;
  }

  leap() {
    this.poster.node.classList.add('exit');
    this.tweens.add({ targets: this.logo, y: -80, duration: 450, ease: 'Back.In' });
    this.tweens.killTweensOf(this.hero);
    this.hero.stop().setTexture('hero-adult-jump-0');
    this.raySpeed = 0.03;
    // crouch-hop up, then plunge off the bottom of the screen
    this.tweens.chain({
      targets: this.hero,
      tweens: [
        { y: this.hero.y - 36, duration: 260, ease: 'Quad.Out' },
        {
          y: H + 160,
          duration: 520,
          ease: 'Quad.In',
          onStart: () => this.hero.setTexture('hero-adult-jump-2'),
        },
      ],
      onComplete: () => {
        this.cameras.main.flash(250, 255, 255, 255);
        this.time.delayedCall(180, () => this.scene.start('level', { index: 0, score: 0, dropIn: true }));
      },
    });
    this.cameras.main.shake(300, 0.004);
  }
}

const HEADLINES = {
  left: [
    ['FOUNDER', 'Typhoon, Thailand’s open-source frontier AI lab'],
    ['MOST DOWNLOADED', 'open-source Thai LLM family'],
    ['PUBLISHED', 'ACL · EMNLP · Interspeech'],
  ],
  right: [
    ['CTO', 'OMG Network · Ethereum L2'],
    ['EX-GITHUB', 'founded billing & payments'],
    ['25+ YEARS', 'startups in SF & Bangkok'],
  ],
};

function posterElement() {
  const col = (side) =>
    `<div class="col ${side}">${HEADLINES[side]
      .map(([big, small]) => `<div class="hl"><b>${big}</b><span>${small}</span></div>`)
      .join('')}</div>`;
  const el = document.createElement('div');
  el.className = 'poster';
  el.innerHTML = `
    <div class="kicker">A LIFE IN TEN LEVELS</div>
    <div class="surname">KASIMA</div>
    ${col('left')}
    ${col('right')}
    <div class="sticker">NOW AT<br>GULF!</div>
    <div class="press">PRESS SPACE · TAP TO PLAY</div>
    <div class="route">BANGKOK · MARYLAND · CHICAGO · SAN FRANCISCO · BANGKOK</div>`;
  return el;
}

class Level extends Phaser.Scene {
  constructor() {
    super('level');
  }

  init(data) {
    this.index = data.index;
    this.score = data.score;
    this.chapter = CHAPTERS[this.index];
    this.finished = false;
    this.dropIn = !!data.dropIn;
  }

  create() {
    const c = this.chapter;
    const worldW = c.length + 160;
    showControls(true);
    // extends above the screen so the hero can fall in from the sky
    this.physics.world.setBounds(0, -200, worldW, H + 400);
    this.physics.world.checkCollision.down = false;

    this.buildBackground(c);
    this.platforms = this.physics.add.staticGroup();
    this.pickups = this.physics.add.staticGroup();
    this.buildLevel(c);

    // Player
    const age = c.age;
    this.heroAnims = ASSETS.hero[age];
    const key = this.heroAnims ? `hero-${age}-idle-0` : `player-${age}`;
    this.player = this.physics.add.sprite(this.dropIn ? 80 : 40, this.dropIn ? -40 : GROUND_Y - 40, key).setOrigin(0.5, 1);
    this.player.setCollideWorldBounds(true);
    this.player.body.setMaxVelocityY(600);
    if (this.heroAnims) {
      // PixelLab sprites sit on a padded 64x64 canvas; tighten the body to
      // the figure so the feet (y≈60) rest on the ground.
      this.player.body.setSize(20, 40);
      this.player.body.setOffset(22, 20);
      // all sprites share a 64px canvas; shrink the toddler so they read as little
      if (age === 'toddler') this.player.setScale(0.75);
    }
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.pickups, (_, p) => this.collect(p));
    this.physics.add.overlap(this.player, this.goal, () => this.reachGoal());

    this.lastGroundedAt = 0;
    this.jumpQueuedAt = -1000;
    this.safePoint = { x: 40, y: GROUND_Y - 40 };

    this.cameras.main.setBounds(0, 0, worldW, H);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, -60, 0);
    this.cameras.main.setRoundPixels(true);
    if (this.dropIn) this.cameras.main.fadeIn(400, 255, 255, 255);
    else this.cameras.main.fadeIn(300, 0, 0, 0);

    // HUD
    text(this, 8, 8, `${c.year}  ${c.title}`, 8, '#ffffff', { stroke: '#000', strokeThickness: 3 }).setScrollFactor(0);
    this.scoreText = text(this, W - 8, 8, '', 8, '#ffe14d', { stroke: '#000', strokeThickness: 3 })
      .setOrigin(1, 0)
      .setScrollFactor(0);
    this.updateScore();
    const prog = this.add.graphics().setScrollFactor(0);
    CHAPTERS.forEach((_, i) => {
      prog.fillStyle(i < this.index ? 0xffe14d : i === this.index ? 0xffffff : 0x000000, i > this.index ? 0.35 : 1);
      prog.fillRect(8 + i * 10, 22, 7, 3);
    });

    this.readInput = bindKeyboard(this);
  }

  buildBackground(c) {
    this.add.image(0, 0, `sky-${c.id}`).setOrigin(0).setScrollFactor(0);
    if (this.textures.exists(`bg-${c.id}`)) {
      // Generated backdrops are one screen wide and don't tile cleanly, so
      // they stay put; the ground and props scrolling over them carry the motion.
      const img = this.textures.get(`bg-${c.id}`).getSourceImage();
      this.add
        .image(W / 2, H, `bg-${c.id}`)
        .setOrigin(0.5, 1)
        .setScale(H / img.height)
        .setScrollFactor(0);
      this.far = null;
      this.near = null;
    } else {
      this.far = this.add.tileSprite(0, 0, W, H, `far-${c.id}`).setOrigin(0).setScrollFactor(0).setAlpha(0.6);
      this.near = this.add.tileSprite(0, 20, W, H, `near-${c.id}`).setOrigin(0).setScrollFactor(0);
      this.farFactor = 0.15;
    }
  }

  // Deterministic layout: solid runs separated by small gaps, with floating
  // ledges carrying pickups. Difficulty ramps gently by chapter.
  buildLevel(c) {
    const rand = new Phaser.Math.RandomDataGenerator([c.id]);
    const difficulty = Math.min(1, this.index / 6);
    const groundKey = `ground-${c.id}`;
    const end = c.length + 160;

    const addSolid = (x, y, w, h = H - y + 40) => {
      const ts = this.add.tileSprite(x, y, w, h, groundKey).setOrigin(0);
      this.physics.add.existing(ts, true);
      this.platforms.add(ts);
      return ts;
    };
    const addPickup = (x, y) => {
      const p = this.pickups.create(x, y, `pickup-${c.pickup}`);
      this.tweens.add({ targets: p, y: y - 3, duration: 500 + rand.between(0, 200), yoyo: true, repeat: -1 });
    };

    if (c.clouds) {
      // Airplane chapter: hop across cloud platforms over the sky.
      let x = 0;
      addSolid(0, GROUND_Y, 200, 16);
      x = 200;
      let y = GROUND_Y;
      while (x < c.length - 120) {
        x += rand.between(40, 64);
        y = Phaser.Math.Clamp(y + rand.between(-40, 40), 130, GROUND_Y);
        const w = rand.between(80, 140);
        addSolid(x, y, w, 16);
        addPickup(x + w / 2, y - 22);
        x += w;
      }
      addSolid(x, GROUND_Y, end - x, 16);
    } else {
      let x = 0;
      let run = 320;
      while (x < c.length) {
        const w = Math.min(run, end - x);
        addSolid(x, GROUND_Y, w);
        // little steps & ledges
        if (w > 160 && rand.frac() < 0.8) {
          const lx = x + rand.between(40, w - 100);
          const ly = GROUND_Y - rand.between(58, 70); // underside clears a 40px-tall hero
          const lw = rand.between(48, 80);
          addSolid(lx, ly, lw, 16);
          for (let i = 0; i < 3; i++) addPickup(lx + 10 + i * ((lw - 20) / 2), ly - 14);
        } else {
          addPickup(x + w / 2, GROUND_Y - 14);
        }
        x += w;
        if (x >= c.length) break;
        // gap (the first chapter gets a tiny bump instead of a gap)
        if (this.index === 0) {
          addSolid(x, GROUND_Y - 16, 32, 16);
        } else {
          x += Math.round(32 + 32 * difficulty + rand.between(0, 16));
        }
        run = rand.between(160, 300);
      }
      if (x < end) addSolid(x, GROUND_Y, end - x);
    }

    this.goal = this.physics.add.staticImage(c.length, GROUND_Y, 'goal').setOrigin(0.5, 1);
    this.goal.refreshBody();
  }

  collect(p) {
    p.disableBody(true, false);
    this.tweens.add({ targets: p, y: p.y - 16, alpha: 0, duration: 250, onComplete: () => p.destroy() });
    this.score += 1;
    this.updateScore();
  }

  updateScore() {
    this.scoreText.setText(`★ ${this.score}`);
  }

  update(time) {
    const p = this.player;
    if (this.far) this.far.tilePositionX = this.cameras.main.scrollX * this.farFactor;
    if (this.near) this.near.tilePositionX = this.cameras.main.scrollX * 0.4;
    if (this.finished) return;

    const inp = this.readInput();
    const onGround = p.body.blocked.down;
    if (onGround) {
      this.lastGroundedAt = time;
      if (p.x > this.safePoint.x + 48) this.safePoint = { x: p.x, y: p.y - 4 };
    }

    if (inp.left) {
      p.setVelocityX(-RUN_SPEED);
      p.setFlipX(true);
    } else if (inp.right) {
      p.setVelocityX(RUN_SPEED);
      p.setFlipX(false);
    } else {
      p.setVelocityX(0);
    }

    if (inp.jumpPressed) this.jumpQueuedAt = time;
    const canJump = time - this.lastGroundedAt < COYOTE_MS;
    if (canJump && time - this.jumpQueuedAt < JUMP_BUFFER_MS) {
      p.setVelocityY(JUMP_VELOCITY);
      this.jumpQueuedAt = -1000;
      this.lastGroundedAt = -1000;
    }
    // variable jump height: release early to hop lower
    if (!inp.jump && p.body.velocity.y < -120) p.setVelocityY(-120);

    this.animate(onGround);

    if (p.y > H + 60) this.respawn();
  }

  animate(onGround) {
    const p = this.player;
    const moving = Math.abs(p.body.velocity.x) > 1;
    if (this.heroAnims) {
      const age = this.chapter.age;
      if (!onGround) {
        // pick rise / apex / fall frame from vertical speed
        const vy = p.body.velocity.y;
        p.anims.stop();
        p.setTexture(`hero-${age}-jump-${vy < -80 ? 0 : vy < 80 ? 1 : 2}`);
        return;
      }
      const key = `hero-${age}-${moving ? 'run' : 'idle'}`;
      // anims.stop() in the air keeps currentAnim set, so also check isPlaying
      if (!p.anims.isPlaying || p.anims.currentAnim?.key !== key) p.play(key);
      return;
    }
    // placeholder: bob while running, stretch while airborne
    if (!onGround) p.setScale(0.9, 1.1);
    else if (moving) p.setScale(1, 1 + Math.sin(this.time.now / 50) * 0.06);
    else p.setScale(1, 1);
  }

  respawn() {
    const p = this.player;
    p.setVelocity(0, 0);
    p.setPosition(this.safePoint.x - 24, this.safePoint.y - 20);
    this.cameras.main.flash(150, 255, 255, 255);
  }

  reachGoal() {
    if (this.finished) return;
    this.finished = true;
    this.player.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    showControls(false);
    this.showCard();
  }

  showCard() {
    const c = this.chapter;
    const cw = 360;
    const ch = 150;
    const box = this.add.container(W / 2, H / 2).setScrollFactor(0).setDepth(100);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRect(-cw / 2, -ch / 2, cw, ch);
    bg.lineStyle(3, 0xffffff);
    bg.strokeRect(-cw / 2, -ch / 2, cw, ch);
    box.add(bg);
    box.add(text(this, 0, -ch / 2 + 18, c.year, 16, '#ffe14d').setOrigin(0.5, 0));
    box.add(text(this, 0, -ch / 2 + 44, c.title, 10, '#ffffff').setOrigin(0.5, 0));
    box.add(
      text(this, 0, -ch / 2 + 66, c.caption, 8, '#cccccc', { align: 'center', wrap: cw - 40, lineSpacing: 6 }).setOrigin(0.5, 0),
    );
    const more = this.index < CHAPTERS.length - 1;
    const prompt = text(this, 0, ch / 2 - 18, more ? 'TAP TO CONTINUE ▶' : 'TAP TO FINISH ▶', 8, '#ffffff').setOrigin(0.5);
    box.add(prompt);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    box.setScale(0);
    this.tweens.add({ targets: box, scale: 1, duration: 250, ease: 'Back.Out' });

    // brief delay so a held jump/tap doesn't skip the card
    this.time.delayedCall(600, () => {
      const next = () => {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          if (more) this.scene.start('level', { index: this.index + 1, score: this.score });
          else this.scene.start('end', { score: this.score });
        });
      };
      this.input.once('pointerdown', next);
      this.input.keyboard.once('keydown', next);
    });
  }
}

class End extends Phaser.Scene {
  constructor() {
    super('end');
  }

  init(data) {
    this.score = data.score;
  }

  create() {
    showControls(false);
    this.add.image(0, 0, 'sky-gulf').setOrigin(0);
    this.add.image(0, 20, 'far-gulf').setOrigin(0).setAlpha(0.6);
    text(this, W / 2, 60, 'KASIMA THARNPIPITCHAI', 12, '#ffffff', { stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    text(
      this,
      W / 2,
      100,
      'Bangkok → Maryland → Chicago →\nSan Francisco → Bangkok',
      8,
      '#ffffff',
      { align: 'center', stroke: '#000', strokeThickness: 3, lineSpacing: 8 },
    ).setOrigin(0.5);
    text(this, W / 2, 150, `★ ${this.score} collected`, 10, '#ffe14d', { stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    const again = text(this, W / 2, 210, 'TAP TO PLAY AGAIN', 8, '#ffffff', { stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    this.tweens.add({ targets: again, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    this.time.delayedCall(800, () => {
      const restart = () => this.scene.start('title');
      this.input.once('pointerdown', restart);
      this.input.keyboard.once('keydown', restart);
    });
  }
}

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  pixelArt: true,
  dom: { createContainer: true },
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: 900 }, debug: false } },
  input: { activePointers: 3 },
  scene: [Boot, Title, Level, End],
});
