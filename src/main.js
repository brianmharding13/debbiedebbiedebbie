import './style.css';

// Extra 'E' entries bias the draw so the real word DEBBIE lands more often.
const VOWELS = ['A', 'E', 'E', 'I', 'O', 'U'];
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
const COLUMN_WIDTH = FONT_SIZE * 1.2;
const TRAIL_LENGTH = 16;
const FADE_ALPHA = 0.08;
const BG_COLOR = '16, 11, 2';
const TEXT_COLOR = '255, 191, 0';
const HEAD_COLOR = '255, 248, 214';
const FLASH_COLOR = '255, 255, 255';
const GLOW_COLOR = 'rgba(255, 176, 0, 0.9)';
const MAX_EXPORT_DIMENSION = 12000;
// Chrome tops out around 268M px, Firefox around 125M. 120M clears 10800x10800
// (36in @300dpi) with room to spare in Chrome; export from Chrome for full quality.
const SAFE_MAX_EXPORT_AREA = 120_000_000;

function buildColumns(width, height) {
  // The head's cycle length must depend only on the viewport, not on TRAIL_LENGTH — otherwise
  // a long trail (which extends *past* the cycle, and gets clipped by the on-screen check
  // below) makes the head spend most of its cycle off-screen waiting to scroll into view.
  const totalTravel = height + LINE_HEIGHT * 2;
  const count = Math.ceil(width / COLUMN_WIDTH) + 1;
  const columns = Array.from({ length: count }, () => ({
    pos: Math.random() * totalTravel,
    speed: 0.35 + Math.random() * 1.5,
    cache: new Map(),
  }));
  return { columns, totalTravel };
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

function drawStatic(ctx, width, height) {
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

  // Guard against a momentarily zero-size canvas (e.g. a minimized window mid-resize) —
  // drawImage throws on a 0-dimension source, which would otherwise kill the rAF loop for good.
  if (width > 0 && height > 0 && Math.random() < 0.09) {
    const bandHeight = Math.min(2 + Math.random() * 10, height);
    const y = Math.random() * (height - bandHeight);
    const shift = (Math.random() - 0.5) * 90;
    ctx.drawImage(ctx.canvas, 0, y, width, bandHeight, shift, y, width, bandHeight);
    ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.08})`;
    ctx.fillRect(0, y, width, bandHeight);
  }
}

function drawFrame(ctx, canvas, columns, totalTravel) {
  ctx.fillStyle = `rgba(${BG_COLOR}, ${FADE_ALPHA})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = `${FONT_SIZE}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const topOffset = canvas.height + LINE_HEIGHT;

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

  drawStatic(ctx, canvas.width, canvas.height);
}

function runLiveCanvas() {
  const canvas = document.getElementById('rain');
  const ctx = canvas.getContext('2d');
  let state = null;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    state = buildColumns(canvas.width, canvas.height);
  }

  function loop() {
    try {
      drawFrame(ctx, canvas, state.columns, state.totalTravel);
    } catch {
      // Never let one bad frame kill the loop — a frame is always followed by the next.
    }
    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);
  loop();
}

function showExportStatus(message) {
  let el = document.getElementById('export-status');
  if (!el) {
    el = document.createElement('div');
    el.id = 'export-status';
    el.className =
      'fixed left-1/2 -translate-x-1/2 bottom-4 px-3 py-1.5 text-xs font-mono tracking-wide rounded bg-black/70 text-yellow-300 border border-yellow-500/40 z-50';
    document.body.appendChild(el);
  }
  el.textContent = message;
  return el;
}

function hideExportStatus(delay) {
  const el = document.getElementById('export-status');
  if (!el) return;
  setTimeout(() => el.remove(), delay);
}

function clampExportSize(requestedWidth, requestedHeight) {
  let width = Math.min(requestedWidth, MAX_EXPORT_DIMENSION);
  let height = Math.min(requestedHeight, MAX_EXPORT_DIMENSION);

  if (width * height > SAFE_MAX_EXPORT_AREA) {
    const scale = Math.sqrt(SAFE_MAX_EXPORT_AREA / (width * height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const adjusted = width !== requestedWidth || height !== requestedHeight;
  return { width, height, adjusted };
}

function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) {
      showExportStatus(`Export failed: ${canvas.width}×${canvas.height} is too large for this browser to encode.`);
      hideExportStatus(5000);
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showExportStatus(`Saved ${canvas.width}×${canvas.height} PNG ✓`);
    hideExportStatus(2500);
  }, 'image/png');
}

function runExport(requestedWidth, requestedHeight) {
  const { width, height, adjusted } = clampExportSize(requestedWidth, requestedHeight);
  showExportStatus(
    adjusted
      ? `Rendering ${width}×${height} (scaled down from ${requestedWidth}×${requestedHeight} to stay within browser limits)…`
      : `Rendering ${width}×${height}…`
  );

  // Defer so the status message paints before the synchronous render loop blocks the main thread.
  setTimeout(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const { columns, totalTravel } = buildColumns(width, height);

    // Every trail row is already populated on frame 1 (drawFrame requests all of them each
    // pass). A fixed small count just adds some head-position/static variety — it must NOT
    // scale with TRAIL_LENGTH or canvas size, or this loop can freeze the tab for minutes.
    const warmupFrames = 20;
    for (let i = 0; i < warmupFrames; i++) {
      drawFrame(ctx, canvas, columns, totalTravel);
    }

    downloadCanvas(canvas, `debbie-${width}x${height}.png`);
  }, 50);
}

function parseExportParam(value) {
  const match = /^(\d+)(?:x(\d+))?$/.exec(value.trim());
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2] ?? match[1]) };
}

runLiveCanvas();

const exportParam = new URLSearchParams(window.location.search).get('export');
if (exportParam) {
  const size = parseExportParam(exportParam);
  if (size) runExport(size.width, size.height);
}
