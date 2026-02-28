const display   = document.getElementById('display');
const displayText = display.querySelector('span');
const input     = document.getElementById('input');
const clearBtn  = document.getElementById('clear-btn');

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

  // Auto-resize textarea
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';
}

// ── Clear ──────────────────────────────────────────────────

function clear() {
  input.value = '';
  input.style.height = 'auto';
  update();
  input.focus();
}

// ── Fullscreen toggle ──────────────────────────────────────

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

// ── Event listeners ────────────────────────────────────────

input.addEventListener('input', update);
clearBtn.addEventListener('click', clear);
display.addEventListener('click', toggleFullscreen);

document.addEventListener('keydown', (e) => {
  // Ctrl+L — clear
  if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    clear();
    return;
  }

  // Any printable key when input isn't focused — redirect focus
  if (document.activeElement !== input && !e.ctrlKey && !e.metaKey && !e.altKey) {
    input.focus();
  }
});
