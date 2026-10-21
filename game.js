'use strict';

const CELLS = 20;
const START_SPEED_MS = 140;
const MIN_SPEED_MS = 60;

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const KEYS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const cell = canvas.width / CELLS;
const css = getComputedStyle(document.documentElement);
const color = (name) => css.getPropertyValue(name).trim();

let snake, dir, queue, food, score, speed, timer, paused, over;
let best = loadBest();
bestEl.textContent = best;

function loadBest() {
  try { return Number(localStorage.getItem('snake-best')) || 0; } catch { return 0; }
}

function saveBest() {
  try { localStorage.setItem('snake-best', String(best)); } catch { /* storage unavailable */ }
}

function reset() {
  const mid = Math.floor(CELLS / 2);
  snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
  dir = DIRS.right;
  queue = [];
  score = 0;
  speed = START_SPEED_MS;
  paused = false;
  over = false;
  scoreEl.textContent = score;
  placeFood();
  restartTimer();
  draw();
}

function placeFood() {
  const free = [];
  for (let y = 0; y < CELLS; y++) {
    for (let x = 0; x < CELLS; x++) {
      if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    }
  }
  food = free[Math.floor(Math.random() * free.length)];
}

function restartTimer() {
  clearInterval(timer);
  timer = setInterval(tick, speed);
}

function turn(name) {
  if (over) return reset();
  const last = queue.length ? queue[queue.length - 1] : dir;
  const next = DIRS[name];
  // Ignore reversing into yourself and repeated presses.
  if (next.x === -last.x && next.y === -last.y) return;
  if (next === last) return;
  if (queue.length < 3) queue.push(next);
}

function tick() {
  if (paused || over) return;
  if (queue.length) dir = queue.shift();

  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  const eating = head.x === food.x && head.y === food.y;
  const body = eating ? snake : snake.slice(0, -1);
  const hitWall = head.x < 0 || head.y < 0 || head.x >= CELLS || head.y >= CELLS;
  const hitSelf = body.some((s) => s.x === head.x && s.y === head.y);

  if (hitWall || hitSelf) {
    over = true;
    draw();
    return;
  }

  snake.unshift(head);
  if (eating) {
    score++;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      saveBest();
    }
    speed = Math.max(MIN_SPEED_MS, speed - 3);
    restartTimer();
    placeFood();
  } else {
    snake.pop();
  }
  draw();
}

function drawCell(x, y, fill, inset = 1) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x * cell + inset, y * cell + inset, cell - inset * 2, cell - inset * 2, 5);
  ctx.fill();
}

function draw() {
  ctx.fillStyle = color('--panel');
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = color('--grid');
  for (let y = 0; y < CELLS; y++) {
    for (let x = (y % 2); x < CELLS; x += 2) {
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  if (food) drawCell(food.x, food.y, color('--food'), 3);
  snake.forEach((s, i) => drawCell(s.x, s.y, i === 0 ? color('--head') : color('--snake')));

  if (paused || over) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color('--text');
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillText(over ? 'Game Over' : 'Paused', canvas.width / 2, canvas.height / 2);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(over ? 'Press any direction to restart' : 'Press Space to resume',
      canvas.width / 2, canvas.height / 2 + 32);
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (over) return reset();
    paused = !paused;
    draw();
    return;
  }
  const name = KEYS[e.code];
  if (name) {
    e.preventDefault();
    turn(name);
  }
});

document.querySelectorAll('.pad button').forEach((btn) => {
  btn.addEventListener('click', () => turn(btn.dataset.dir));
});

let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
  if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 'right' : 'left');
  else turn(dy > 0 ? 'down' : 'up');
});

reset();
