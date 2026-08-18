import './style.css';

const canvas = document.getElementById('rain');
const ctx = canvas.getContext('2d');

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
// DEBBIE, with only the first E swapped for a random vowel each spawn. The
// trailing "IE" stays put, so a random draw of "E" reforms the real word.
const TEMPLATE = ['D', null, 'B', 'B', 'I', 'E'];

function randomVowel() {
  return VOWELS[Math.floor(Math.random() * VOWELS.length)];
}

function generateWord() {
  return TEMPLATE.map((c) => c ?? randomVowel()).join('');
}

const FONT_SIZE = 16;
const LINE_HEIGHT = FONT_SIZE * 0.62;
const COLUMN_WIDTH = FONT_SIZE * 1.5;
const TRAIL_LENGTH = 16;
const FADE_ALPHA = 0.08;
const BG_COLOR = '12, 5, 22';
const TEXT_COLOR = '206, 110, 255';
const HEAD_COLOR = '238, 205, 255';
const FLASH_COLOR = '255, 255, 255';
const GLOW_COLOR = 'rgba(196, 90, 255, 0.9)';

let columns = [];
let totalTravel = 0;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  totalTravel = canvas.height + LINE_HEIGHT * (TRAIL_LENGTH + 2);
  const count = Math.ceil(canvas.width / COLUMN_WIDTH) + 1;
  columns = Array.from({ length: count }, () => makeColumn());
}

function makeColumn() {
  return {
    pos: Math.random() * totalTravel,
    speed: 0.35 + Math.random() * 1.5,
    cache: new Map(),
  };
}

function rowInfo(col, rowIndex) {
  if (!col.cache.has(rowIndex)) {
    const word = generateWord();
    col.cache.set(rowIndex, {
      word,
      jitter: (Math.random() - 0.5) * COLUMN_WIDTH * 0.6,
      flash: word === 'DEBBIE',
    });
    if (col.cache.size > TRAIL_LENGTH + 6) {
      const oldestKey = Math.min(...col.cache.keys());
      col.cache.delete(oldestKey);
    }
  }
  return col.cache.get(rowIndex);
}

function drawStatic(width, height) {
  const dotCount = Math.floor((width * height) / 1600);
  for (let i = 0; i < dotCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() < 0.75 ? 1 : 2;
    const white = Math.random() < 0.4;
    const alpha = Math.random() * 0.25;
    ctx.fillStyle = white ? `rgba(255,255,255,${alpha})` : `rgba(${TEXT_COLOR}, ${alpha})`;
    ctx.fillRect(x, y, size, size);
  }

  if (Math.random() < 0.09) {
    const bandHeight = 2 + Math.random() * 10;
    const y = Math.random() * height;
    const shift = (Math.random() - 0.5) * 90;
    ctx.drawImage(canvas, 0, y, width, bandHeight, shift, y, width, bandHeight);
    ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.08})`;
    ctx.fillRect(0, y, width, bandHeight);
  }
}

function draw() {
  ctx.fillStyle = `rgba(${BG_COLOR}, ${FADE_ALPHA})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = `${FONT_SIZE}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const topOffset = canvas.height + LINE_HEIGHT * (TRAIL_LENGTH + 1);

  columns.forEach((col, i) => {
    const baseX = i * COLUMN_WIDTH + COLUMN_WIDTH / 2;
    const wrapped = col.pos % totalTravel;
    const headY = topOffset - wrapped;
    const headRow = Math.floor(col.pos / LINE_HEIGHT);

    for (let k = 0; k < TRAIL_LENGTH; k++) {
      const y = headY + k * LINE_HEIGHT;
      if (y < -LINE_HEIGHT || y > canvas.height + LINE_HEIGHT) continue;

      const rowIndex = headRow - k;
      const { word, jitter, flash } = rowInfo(col, rowIndex);
      const alpha = Math.max(0, 1 - k / TRAIL_LENGTH) ** 1.3;
      const x = baseX + jitter;

      if (flash) {
        ctx.shadowColor = 'rgba(255,255,255,0.95)';
        ctx.shadowBlur = 14;
        ctx.fillStyle = `rgba(${FLASH_COLOR}, ${Math.max(alpha, 0.85)})`;
      } else if (k === 0) {
        ctx.shadowColor = GLOW_COLOR;
        ctx.shadowBlur = 10;
        ctx.fillStyle = `rgba(${HEAD_COLOR}, ${alpha})`;
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(${TEXT_COLOR}, ${alpha})`;
      }
      ctx.fillText(word, x, y);
    }
    ctx.shadowBlur = 0;

    col.pos += col.speed;
  });

  drawStatic(canvas.width, canvas.height);

  requestAnimationFrame(draw);
}

resize();
window.addEventListener('resize', resize);
draw();
