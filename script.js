const display      = document.getElementById('display');
const displayText  = display.querySelector('span');
const input        = document.getElementById('input');
const wallpaperBtn = document.getElementById('wallpaper-btn');
const controls     = document.getElementById('controls');

// ── Update display ─────────────────────────────────────────

function update() {
  const val = input.value.trim();

  if (val) {
    displayText.textContent = val;
    display.classList.remove('empty');
  } else {
    displayText.textContent = 'Start typing...';
    display.classList.add('empty');
  }
}

// ── Clear ──────────────────────────────────────────────────

function clear() {
  input.value = '';
  update();
  input.focus();
}

// ── Fullscreen toggle ──────────────────────────────────────

function enterFullscreen() {
  document.documentElement.requestFullscreen().catch(() => {});
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    enterFullscreen();
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    input.focus();
    document.getElementById('overlay')?.remove();
  } else {
    input.blur();
    controls.classList.remove('peek');
  }
});

// ── Auto-enter fullscreen on first interaction ─────────────

let _autoFSDone = false;
function _autoFS(e) {
  if (_autoFSDone) return;
  if (e.target && e.target.closest('#controls')) return;
  _autoFSDone = true;
  enterFullscreen();
  // On iOS, requestFullscreen is a no-op; focus input directly so the keyboard shows
  input.focus();
}
document.addEventListener('click',   _autoFS, { capture: true });
document.addEventListener('keydown', _autoFS, { capture: true });

// ── Reveal controls on mouse movement / touch in fullscreen ─

let _peekTimer = null;
function _showPeek() {
  if (!document.fullscreenElement) return;
  controls.classList.add('peek');
  clearTimeout(_peekTimer);
  _peekTimer = setTimeout(() => controls.classList.remove('peek'), 2000);
}
document.addEventListener('mousemove',  _showPeek);
document.addEventListener('touchstart', _showPeek, { passive: true });

// ── Shrink layout when virtual keyboard appears (iOS/Android) ─

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    document.body.style.height = window.visualViewport.height + 'px';
  });
}

// ── Canvas word-wrap (mirrors CSS word-break: break-word) ──

function wrapLines(ctx, text, maxW) {
  const result = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxW) {
        result.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    result.push(line);
  }
  return result;
}

// ── Save as Wallpaper ──────────────────────────────────────

async function saveAsWallpaper() {
  const text = input.value.trim().toUpperCase();
  if (!text) return;

  // Physical screen resolution
  const dpr = window.devicePixelRatio || 1;
  const W   = screen.width  * dpr;
  const H   = screen.height * dpr;

  // ── Step 1: snapshot DOM metrics NOW (fullscreen is still active) ──
  // Must happen before showSaveFilePicker, which exits fullscreen to show the OS dialog,
  // causing the browser to resize and the font/layout to change.
  const dispCS         = getComputedStyle(display);
  const dispRect       = display.getBoundingClientRect();
  const screenFontSize = parseFloat(getComputedStyle(displayText).fontSize);
  const screenTextW    = dispRect.width
                       - parseFloat(dispCS.paddingLeft)
                       - parseFloat(dispCS.paddingRight);
  const scaleX         = W / window.innerWidth;
  const canvasFontSize = screenFontSize * scaleX;
  const canvasTextW    = screenTextW    * scaleX;

  // ── Step 2: show Save As dialog (gesture still active, metrics already captured) ──
  let fileHandle = null;
  if (window.showSaveFilePicker) {
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: `bigtext-${W}x${H}.png`,
        types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }],
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      // API unavailable — fall through to download
    }
  }

  // ── Step 3: draw the canvas ──
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(0, 0, W, H);

  ctx.font = `800 ${canvasFontSize}px system-ui, sans-serif`;

  const lines  = wrapLines(ctx, text, canvasTextW);
  const lineH  = canvasFontSize * 1.1; // matches CSS line-height: 1.1
  const totalH = lineH * lines.length;

  ctx.fillStyle    = '#ffffff';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const startY = (H - totalH) / 2 + lineH / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, startY + i * lineH);
  });

  // ── Step 3: convert to blob and save ──
  canvas.toBlob(async (blob) => {
    if (fileHandle) {
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    } else {
      // Fallback: download to Downloads folder
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `bigtext-${W}x${H}.png`;
      link.href     = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
}

// ── Event listeners ────────────────────────────────────────

input.addEventListener('input', update);
wallpaperBtn.addEventListener('click', saveAsWallpaper);
display.addEventListener('click', () => { toggleFullscreen(); input.focus(); });

document.addEventListener('keydown', (e) => {
  // Ctrl+L — clear
  if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    clear();
    return;
  }

  // Ctrl+Shift+S — save as wallpaper
  if (e.key === 'S' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
    e.preventDefault();
    saveAsWallpaper();
    return;
  }

  // Any printable key — enter fullscreen first if needed, then capture input
  if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    if (!document.fullscreenElement) enterFullscreen();
    if (document.activeElement !== input) input.focus();
  }
});
