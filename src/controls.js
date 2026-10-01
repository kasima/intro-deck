// Merges keyboard + on-screen touch buttons into one input state.
export const input = { left: false, right: false, jump: false, jumpPressed: false };

const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add('touch');

for (const btn of document.querySelectorAll('#controls button')) {
  const key = btn.dataset.key;
  const press = (e) => {
    e.preventDefault();
    btn.setPointerCapture?.(e.pointerId);
    if (key === 'jump' && !input.jump) input.jumpPressed = true;
    input[key] = true;
    btn.classList.add('down');
  };
  const release = (e) => {
    e.preventDefault();
    input[key] = false;
    btn.classList.remove('down');
  };
  btn.addEventListener('pointerdown', press);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('lostpointercapture', release);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function bindKeyboard(scene) {
  const k = scene.input.keyboard.addKeys('LEFT,RIGHT,UP,SPACE,A,D,W');
  return () => {
    const kbLeft = k.LEFT.isDown || k.A.isDown;
    const kbRight = k.RIGHT.isDown || k.D.isDown;
    const kbJumpPressed =
      Phaser.Input.Keyboard.JustDown(k.UP) ||
      Phaser.Input.Keyboard.JustDown(k.SPACE) ||
      Phaser.Input.Keyboard.JustDown(k.W);
    const kbJump = k.UP.isDown || k.SPACE.isDown || k.W.isDown;
    const state = {
      left: input.left || kbLeft,
      right: input.right || kbRight,
      jump: input.jump || kbJump,
      jumpPressed: input.jumpPressed || kbJumpPressed,
    };
    input.jumpPressed = false;
    return state;
  };
}

export function showControls(show) {
  document.body.classList.toggle('hide-controls', !show);
}
