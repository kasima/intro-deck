// PixelLab-generated assets that exist on disk. Anything not listed here
// falls back to the procedural placeholder in art.js.

const frames = (dir, idx) => idx.map((i) => `${dir}/${i}.png`);
const range = (n) => [...Array(n).keys()];

function hero(age) {
  const dir = `assets/hero/${age}`;
  return {
    idle: frames(`${dir}/idle`, range(4)),
    run: frames(`${dir}/run`, range(6)),
    // only the airborne frames of the jump template (rise → tuck → fall)
    jump: frames(`${dir}/jump`, [3, 4, 5]),
  };
}

export const ASSETS = {
  bg: Object.fromEntries(
    ['born', 'flight', 'umd', 'early', 'sf', 'github', 'camp', 'omg', 'typhoon', 'gulf'].map((id) => [
      id,
      `assets/bg/${id}.png`,
    ]),
  ),
  poster: 'assets/bg/poster.png',
  logo: 'assets/logo/oom.png',
  // adult rotations in turning order, for the title-screen spin
  spin: ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'].map(
    (d) => `assets/hero/adult/rotations/${d}.png`,
  ),
  hero: {
    toddler: hero('toddler'),
    student: hero('student'),
    adult: hero('adult'),
  },
};
