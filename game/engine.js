/* Pixel History — игровой движок.
   Получает описание игры (JSON) и запускает 2D-платформер:
   открытка → титульный экран → уровни (воспоминания, диалоги) → финальное письмо.
   Зависит от PX (assets/pixel.js) — им рисуются герои. */
function PHEngineFactory(global) {
  'use strict';
  const W = 640, H = 360, T = 20, ROWS = H / T;
  const FONT = '"Press Start 2P", monospace', MONO = '"JetBrains Mono", monospace';

  /* ---------------- темы уровней ---------------- */
  const THEMES = {
    forest:    { sky: ['#161B12', '#1E2618', '#283321', '#33422A'], far: '#2F4A26', mid: '#47603A', top: '#6E9145', top2: '#5B7A3A', soil: '#4A3626', soil2: '#3B2B1E', deco: ['tree', 'mushroom', 'fern', 'mushroom'], fireflies: true },
    mountains: { sky: ['#2B3A4A', '#3E5568', '#5C7A8C', '#8FA9B5'], far: '#6B7F8C', cap: '#EDE4CF', mid: '#4A5E4A', top: '#7A9A5A', top2: '#5B7A3A', soil: '#6B6B6B', soil2: '#575757', deco: ['pine', 'rock', 'pine'], peaks: true },
    city:      { sky: ['#141626', '#1E2238', '#2B2F4A', '#3A3A5A'], far: '#23263D', mid: '#2E3250', top: '#8A8A8A', top2: '#6B6B6B', soil: '#3B3B46', soil2: '#33333D', deco: ['lamp', 'bench', 'lamp'], stars: true, buildings: true },
    lake:      { sky: ['#3C5A78', '#5B7FA0', '#8FB2C8', '#C9DCE3'], far: '#4A6E5A', mid: '#3E5E4A', top: '#8FB25A', top2: '#6E9145', soil: '#8A6A3A', soil2: '#6E5430', deco: ['reed', 'tree', 'reed'], water: '#4A6E9C' },
    beach:     { sky: ['#4A8FC0', '#6FAFD8', '#A8D4EC', '#F2E3A0'], far: '#3E7FB0', mid: '#4A9CC8', top: '#F2D9A0', top2: '#E8C887', soil: '#D9B877', soil2: '#C9A867', deco: ['palm', 'shell', 'palm'], water: '#3E8FC0', sun: true },
    night:     { sky: ['#0B0E1A', '#121730', '#1A2142', '#232B52'], far: '#1A2238', mid: '#232E48', top: '#3E5E4A', top2: '#2F4A3A', soil: '#2A2420', soil2: '#211C19', deco: ['tree', 'lantern', 'tree'], stars: true, moon: true, fireflies: true },
    snow:      { sky: ['#5C6E8C', '#7A8CA8', '#A8B8CC', '#D8E0EA'], far: '#C9D4E0', mid: '#9FB0C4', top: '#F4F7FA', top2: '#DDE5EE', soil: '#8A9AB0', soil2: '#7A8AA0', deco: ['pine', 'snowman', 'pine'], peaks: true, cap: '#FFFFFF', snowfall: true },
    home:      { sky: ['#3A2A20', '#4A3626', '#5A4230', '#6A4E38'], far: '#5E4530', mid: '#4A3626', top: '#8A5A2E', top2: '#7A4E28', soil: '#4A3626', soil2: '#3B2B1E', deco: ['plant', 'lamp', 'plant'], interior: true }
  };
  const THEME_NAMES = Object.keys(THEMES);

  /* ---------------- утилиты ---------------- */
  function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/), lines = []; let line = '';
    words.forEach(w => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line); return lines;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- звук ---------------- */
  function Sound(mood) {
    let ac = null, muted = true, timer = null, step = 0; // звук выключен по умолчанию
    const scales = { 'Романтичная': [0, 4, 7, 9, 12, 16], 'Уютная': [0, 2, 4, 7, 9, 12], 'Смешная': [0, 4, 7, 12, 14, 16], 'Ностальгия': [0, 3, 5, 7, 10, 12], 'Загадочная': [0, 3, 6, 7, 10, 13] };
    const sc = scales[mood] || scales['Уютная'];
    const r = rng(hash(mood || 'x'));
    const melody = Array.from({ length: 16 }, (_, i) => (i % 4 === 3 && r() < 0.5) ? null : sc[Math.floor(r() * sc.length)]);
    const bass = [0, 0, 5, 5, 7, 7, 3, 3].map(n => n - 12);
    function ensure() { if (!ac) { const C = global.AudioContext || global.webkitAudioContext; if (C) ac = new C(); } if (ac && ac.state === 'suspended') ac.resume(); }
    function tone(freq, dur, type = 'square', vol = 0.05, when = 0) {
      if (!ac || muted) return;
      const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
    }
    const note = n => 261.63 * Math.pow(2, n / 12);
    return {
      unlock() { ensure(); },
      jump() { ensure(); tone(note(7), 0.12, 'square', 0.04); tone(note(14), 0.08, 'square', 0.03, 0.05); },
      collect() { ensure(); [12, 16, 19, 24].forEach((n, i) => tone(note(n), 0.1, 'square', 0.04, i * 0.06)); },
      blip() { ensure(); tone(note(19), 0.03, 'square', 0.015); },
      fall() { ensure(); tone(note(0), 0.25, 'triangle', 0.06); },
      music(on) {
        clearInterval(timer); if (!on) return; ensure();
        timer = setInterval(() => {
          if (!ac || muted) return;
          const m = melody[step % 16]; if (m !== null) tone(note(m + 12), 0.18, 'square', 0.022);
          if (step % 2 === 0) tone(note(bass[(step / 2) % 8]), 0.3, 'triangle', 0.05);
          step++;
        }, 220);
      },
      toggle() { muted = !muted; return muted; },
      get muted() { return muted; }
    };
  }

  /* ---------------- построение уровня ---------------- */
  function buildLevel(L, idx) {
    const r = rng(hash((L.title || '') + '|' + idx) + idx * 977);
    const mems = L.memories || [];
    const len = Math.max(70, 44 + mems.length * 22);
    const ground = new Array(len).fill(null), plats = [];
    let gy = 14, x = 0;
    while (x < len) {
      if (x < 10 || x >= len - 14) { ground[x++] = gy; continue; }
      const v = r();
      if (v < 0.16 && ground[x - 1] !== null) {
        const gw = 2 + Math.floor(r() * 2);
        for (let i = 0; i < gw && x < len - 14; i++) ground[x++] = null;
      } else {
        if (v < 0.5) gy = clamp(gy + (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 2)), 11, 15);
        const sw = 5 + Math.floor(r() * 7), start = x;
        for (let i = 0; i < sw && x < len - 14; i++) ground[x++] = gy;
        if (r() < 0.4 && x - start >= 4) plats.push({ x: start + 1, y: gy - 4, w: 3 + Math.floor(r() * 2) });
      }
    }
    for (let i = len - 14; i < len; i++) ground[i] = ground[len - 15] !== null ? ground[len - 15] : gy;
    // воспоминания
    const items = mems.map((m, i) => {
      let mx = Math.round(14 + (i + 0.5) * (len - 32) / Math.max(1, mems.length));
      while (ground[mx] === null) mx++;
      const plat = plats.find(p => mx >= p.x && mx < p.x + p.w);
      const surf = plat ? plat.y : ground[mx];
      const high = !plat && r() < 0.4;
      return { x: mx * T + T / 2, y: surf * T - (high ? 78 : 40), text: m.text || m, who: m.who, got: false };
    });
    // декорации
    const theme = THEMES[L.theme] || THEMES.forest, deco = [];
    for (let i = 3; i < len - 3; i += 4 + Math.floor(r() * 6)) if (ground[i] !== null) deco.push({ x: i * T, type: theme.deco[Math.floor(r() * theme.deco.length)], s: r() });
    return { len, ground, plats, items, deco, theme, goalX: (len - 6) * T, startX: 3 * T };
  }

  function solidAt(lv, tx, ty) {
    if (tx < 0 || tx >= lv.len) return true;
    if (ty < 0) return false;
    const g = lv.ground[tx];
    if (g !== null && ty >= g) return true;
    return lv.plats.some(p => ty === p.y && tx >= p.x && tx < p.x + p.w);
  }
  function surfaceY(lv, tx) { const g = lv.ground[clamp(tx, 0, lv.len - 1)]; return g === null ? null : g * T; }

  /* ---------------- рисование окружения ---------------- */
  function drawBackground(ctx, th, cam, t) {
    const band = H / th.sky.length;
    th.sky.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, Math.floor(i * band * 0.7), W, Math.ceil(band * 0.7) + 1); });
    ctx.fillStyle = th.sky[th.sky.length - 1]; ctx.fillRect(0, Math.floor(band * 0.7 * th.sky.length), W, H);
    if (th.stars) for (let i = 0; i < 40; i++) { const sx = (i * 97 + 13) % W, sy = (i * 53) % 150; if ((Math.sin(t / 500 + i) + 1) > 0.4) { ctx.fillStyle = '#EDE4CF'; ctx.fillRect(sx, sy, 2, 2); } }
    if (th.moon) { ctx.fillStyle = '#F2E3A0'; ctx.fillRect(520, 40, 36, 36); ctx.fillStyle = th.sky[0]; ctx.fillRect(536, 36, 26, 30); }
    if (th.sun) { ctx.fillStyle = '#FFE98A'; ctx.fillRect(500, 50, 48, 48); ctx.fillStyle = '#FFD23F'; ctx.fillRect(508, 58, 32, 32); }
    // дальний слой
    const fx = cam * 0.2;
    if (th.peaks) {
      for (let i = -1; i < 6; i++) {
        const bx = Math.floor(i * 160 - (fx % 160)), ph = 110 + ((i + Math.floor(fx / 160)) * 37 % 60);
        for (let y = 0; y < ph; y += 4) { const w = Math.floor(y * 1.3); ctx.fillStyle = y < 24 ? th.cap : th.far; ctx.fillRect(bx + 80 - w, 260 - ph + y, w * 2, 4); }
      }
    } else if (th.buildings) {
      for (let i = -1; i < 12; i++) {
        const k = i + Math.floor(fx / 70), bx = Math.floor(i * 70 - (fx % 70)), bh = 90 + (Math.abs(k * 53) % 110);
        ctx.fillStyle = th.far; ctx.fillRect(bx, 270 - bh, 60, bh);
        for (let wy = 270 - bh + 10; wy < 260; wy += 16) for (let wx = bx + 8; wx < bx + 52; wx += 14) if (((wx + wy + k * 7) % 5) < 2) { ctx.fillStyle = '#D4B95E'; ctx.fillRect(wx, wy, 6, 8); }
      }
    } else if (th.interior) {
      ctx.fillStyle = th.far; for (let i = -1; i < 8; i++) { const bx = Math.floor(i * 110 - (fx % 110)); ctx.fillRect(bx + 20, 90, 60, 70); ctx.fillStyle = '#C9DCE3'; ctx.fillRect(bx + 26, 96, 48, 58); ctx.fillStyle = th.far; ctx.fillRect(bx + 48, 96, 4, 58); }
    } else {
      ctx.fillStyle = th.far;
      for (let x = 0; x < W; x += 4) { const h = 70 + Math.sin((x + fx) / 40) * 18 + Math.sin((x + fx) / 13) * 6; ctx.fillRect(x, 250 - h, 4, h + 20); }
    }
    if (th.water) { ctx.fillStyle = th.water; ctx.fillRect(0, 230, W, 60); ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 0; x < W; x += 24) ctx.fillRect((x + t / 40 + cam * 0.3) % W, 236 + (x % 3) * 12, 10, 2); }
    // средний слой
    const mx = cam * 0.5; ctx.fillStyle = th.mid;
    if (!th.interior && !th.water) for (let x = 0; x < W; x += 4) { const h = 40 + Math.sin((x + mx) / 30) * 12 + Math.cos((x + mx) / 11) * 5; ctx.fillRect(x, 290 - h, 4, h + 80); }
  }

  const P = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  function drawDeco(ctx, d, sx, gy) {
    const s = 4, b = gy;
    switch (d.type) {
      case 'tree': P(ctx, '#4A3626', sx + 12, b - 70, 12, 70); P(ctx, '#2F4A26', sx - 12, b - 120, 60, 56); P(ctx, '#3E5E30', sx - 4, b - 132, 44, 20); P(ctx, '#47603A', sx, b - 110, 16, 12); break;
      case 'pine': P(ctx, '#4A3626', sx + 14, b - 24, 8, 24); for (let i = 0; i < 4; i++) P(ctx, '#2F4A3A', sx + 18 - (i + 1) * 8, b - 100 + i * 18, (i + 1) * 16, 18); P(ctx, '#FFFFFF', sx + 14, b - 104, 8, 6); break;
      case 'mushroom': P(ctx, '#E3D6B5', sx + 8, b - 20, 8, 20); P(ctx, '#C0593A', sx, b - 32, 24, 12); P(ctx, '#C0593A', sx + 4, b - 36, 16, 4); P(ctx, '#EDE4CF', sx + 4, b - 30, 4, 4); P(ctx, '#EDE4CF', sx + 14, b - 34, 4, 4); break;
      case 'fern': for (let i = 0; i < 4; i++) { P(ctx, '#6E9145', sx + 10, b - 8 - i * 8, 4, 8); P(ctx, '#5B7A3A', sx + 2 + (i % 2) * 2, b - 12 - i * 8, 8, 4); P(ctx, '#5B7A3A', sx + 14, b - 12 - i * 8, 8, 4); } break;
      case 'rock': P(ctx, '#7A7A7A', sx, b - 16, 32, 16); P(ctx, '#959595', sx + 4, b - 22, 20, 8); P(ctx, '#5E5E5E', sx + 24, b - 12, 8, 12); break;
      case 'lamp': P(ctx, '#2A2420', sx + 10, b - 80, 4, 80); P(ctx, '#2A2420', sx + 4, b - 88, 16, 8); P(ctx, '#F2E3A0', sx + 6, b - 84, 12, 6); P(ctx, 'rgba(242,227,160,.12)', sx - 20, b - 80, 64, 80); break;
      case 'bench': P(ctx, '#8A5A2E', sx, b - 16, 44, 6); P(ctx, '#8A5A2E', sx, b - 28, 44, 4); P(ctx, '#2A2420', sx + 4, b - 10, 4, 10); P(ctx, '#2A2420', sx + 36, b - 10, 4, 10); break;
      case 'reed': for (let i = 0; i < 3; i++) { P(ctx, '#6E9145', sx + i * 8, b - 36 + i * 4, 3, 36 - i * 4); P(ctx, '#8A5A2E', sx + i * 8 - 1, b - 44 + i * 4, 5, 10); } break;
      case 'palm': P(ctx, '#8A6A3A', sx + 14, b - 90, 8, 90); P(ctx, '#5B7A3A', sx - 16, b - 96, 68, 8); P(ctx, '#6E9145', sx - 4, b - 104, 44, 8); P(ctx, '#5B7A3A', sx - 20, b - 88, 12, 12); P(ctx, '#5B7A3A', sx + 44, b - 88, 12, 12); break;
      case 'shell': P(ctx, '#F2B5A0', sx, b - 8, 16, 8); P(ctx, '#E39B86', sx + 4, b - 12, 8, 4); break;
      case 'lantern': P(ctx, '#2A2420', sx + 10, b - 50, 4, 50); P(ctx, '#4A3626', sx + 2, b - 66, 20, 18); P(ctx, '#F2E3A0', sx + 6, b - 62, 12, 10); P(ctx, 'rgba(242,227,160,.15)', sx - 16, b - 80, 56, 56); break;
      case 'snowman': P(ctx, '#FFFFFF', sx, b - 24, 28, 24); P(ctx, '#FFFFFF', sx + 4, b - 42, 20, 18); P(ctx, '#12150E', sx + 9, b - 36, 3, 3); P(ctx, '#12150E', sx + 16, b - 36, 3, 3); P(ctx, '#C0593A', sx + 13, b - 32, 6, 3); break;
      case 'plant': P(ctx, '#8A5A2E', sx + 4, b - 18, 20, 18); P(ctx, '#6E9145', sx, b - 36, 12, 18); P(ctx, '#5B7A3A', sx + 14, b - 40, 12, 22); break;
    }
  }

  function drawTerrain(ctx, lv, cam) {
    const th = lv.theme, t0 = Math.floor(cam / T), t1 = t0 + Math.ceil(W / T) + 1;
    for (let tx = t0; tx <= t1; tx++) {
      if (tx < 0 || tx >= lv.len) continue;
      const g = lv.ground[tx]; if (g === null) continue;
      const sx = tx * T - cam;
      for (let ty = g; ty < ROWS; ty++) {
        if (ty === g) { P(ctx, th.top, sx, ty * T, T, 8); P(ctx, th.top2, sx, ty * T + 8, T, 4); P(ctx, (tx % 2) ? th.top : th.top2, sx + 4, ty * T - 4, 4, 4); P(ctx, th.soil, sx, ty * T + 12, T, 8); }
        else { P(ctx, (tx + ty) % 2 ? th.soil : th.soil2, sx, ty * T, T, T); if ((tx * 7 + ty * 3) % 11 === 0) P(ctx, th.soil2, sx + 6, ty * T + 6, 6, 6); }
      }
    }
    lv.plats.forEach(p => {
      const sx = p.x * T - cam; if (sx > W || sx + p.w * T < 0) return;
      P(ctx, OUTLINE, sx - 2, p.y * T - 2, p.w * T + 4, T + 4); P(ctx, th.top, sx, p.y * T, p.w * T, 8); P(ctx, th.soil, sx, p.y * T + 8, p.w * T, 12);
      for (let i = 0; i < p.w; i++) P(ctx, th.top2, sx + i * T + 2, p.y * T + 8, 4, 4);
    });
  }
  const OUTLINE = '#1A140F';

  /* ---------------- рисование героев ---------------- */
  const gridCache = new Map();
  function heroGrid(h) { const k = JSON.stringify(h); if (!gridCache.has(k)) gridCache.set(k, PX.charGrid(h, 'front')); return gridCache.get(k); }
  // герой в позе: x — центр, footY — линия земли
  function drawHero(ctx, h, x, footY, s, flip, bob, shadow, view, pose) {
    PX.drawPose(ctx, h, s, Math.round(x - 10 * s), Math.round(footY - 27 * s + (bob || 0)), view || 'front', pose || null, flip, shadow);
  }
  function emoteOf(h, kinds) { return (h.emotes || []).find(id => PX.ANIMS[id] && kinds.includes(PX.ANIMS[id].kind)); }
  function drawHead(ctx, h, x, y, s) {
    const g = heroGrid(h);
    for (const k in g) { const i = k.indexOf(','); const gx = +k.slice(0, i), gy = +k.slice(i + 1); if (gy <= 12) { ctx.fillStyle = g[k]; ctx.fillRect(x + gx * s, y + gy * s, s, s); } }
  }
  function drawMemory(ctx, x, y, t) {
    const b = Math.round(Math.sin(t / 250) * 3);
    ctx.fillStyle = 'rgba(242,227,160,.25)'; ctx.fillRect(x - 16, y - 16 + b, 32, 32);
    const heart = ['.rr.rr.', 'rrwrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
    heart.forEach((row, j) => [...row].forEach((c, i) => { if (c !== '.') { ctx.fillStyle = c === 'w' ? '#EDE4CF' : '#C0593A'; ctx.fillRect(x - 14 + i * 4, y - 12 + j * 4 + b, 4, 4); } }));
    if (Math.floor(t / 200) % 3 === 0) { ctx.fillStyle = '#F2E3A0'; ctx.fillRect(x + 12, y - 16 + b, 4, 4); }
  }

  /* ---------------- запуск игры ---------------- */
  function start(container, game, opts = {}) {
    const heroes = {}; (game.heroes || []).forEach(h => heroes[h.id] = h);
    const playerHero = heroes[game.player] || game.heroes[0];
    const partnerHero = heroes[game.partner] || game.heroes[1] || game.heroes[0];
    const levels = (game.levels || []).map((L, i) => Object.assign({}, L, { theme: THEMES[L.theme] ? L.theme : THEME_NAMES[i % 3] }));
    const totalMem = levels.reduce((n, L) => n + (L.memories || []).length, 0);
    // Звук пока отключён (добавим позже): заглушка вместо Sound(game.mood)
    const sound = { unlock() {}, jump() {}, collect() {}, blip() {}, fall() {}, music() {}, toggle() { return true; } };

    container.innerHTML = '';
    container.classList.add('phg');
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; container.appendChild(canvas);
    const mainCtx = canvas.getContext('2d'); mainCtx.imageSmoothingEnabled = false;
    let ctx = mainCtx;
    // 8-бит: мир рисуется в половинном разрешении и растягивается (крупные пиксели); текст — в полном
    const eight = /8/.test(game.style || '');
    const off = document.createElement('canvas'); off.width = W / 2; off.height = H / 2;
    const offCtx = off.getContext('2d'); offCtx.imageSmoothingEnabled = false; offCtx.scale(0.5, 0.5);
    function worldBegin() { ctx = eight ? offCtx : mainCtx; ctx.imageSmoothingEnabled = false; }
    function worldEnd() { if (eight) { mainCtx.imageSmoothingEnabled = false; mainCtx.drawImage(off, 0, 0, W, H); } ctx = mainCtx; }
    // фото реальных мест → пиксельный фон уровня
    levels.forEach(L => { if (L.photo) { const im = new Image(); im.src = L.photo; L._img = im; } });
    const ui = document.createElement('div'); ui.className = 'phg-ui';
    ui.innerHTML = '<div class="phg-touch"><div class="phg-pad"><button data-k="left">◀</button><button data-k="right">▶</button></div><div class="phg-ab"><button data-k="act">B</button><button data-k="jump">A</button></div></div>';
    container.appendChild(ui);

    // ввод
    const keys = { left: false, right: false, jump: false, act: false }; let jumpPressed = false, actPressed = false;
    const map = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', Enter: 'act', KeyE: 'act', KeyZ: 'act', KeyX: 'act' };
    function press(k, v) {
      if (v && !keys[k]) { if (k === 'jump') jumpPressed = true; if (k === 'act') actPressed = true; }
      keys[k] = v; if (v) { sound.unlock(); if (!musicOn) { musicOn = true; sound.music(true); } }
    }
    const typing = e => e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable);
    const kd = e => { if (typing(e)) return; const k = map[e.code]; if (k) { e.preventDefault(); press(k, true); } };
    const ku = e => { const k = map[e.code]; if (k) press(k, false); };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    ui.querySelectorAll('[data-k]').forEach(b => {
      const k = b.dataset.k;
      b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); press(k, true); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, () => press(k, false)));
    });
    canvas.addEventListener('pointerdown', () => { press('act', true); setTimeout(() => press('act', false), 60); });
    let musicOn = false;

    // состояние
    let state = game.card ? 'card' : 'title', li = 0, lv = null, cam = 0, collected = 0, banner = 0, dlg = null, t = 0, finaleChars = 0;
    const pl = { x: 0, y: 0, vx: 0, vy: 0, w: 22, h: 54, on: false, flip: false, safeX: 0, walk: 0 };

    function say(lines, done) { dlg = { lines: lines.filter(l => l && l.text), i: 0, chars: 0, done }; if (!dlg.lines.length) { dlg = null; done && done(); } }
    function who(id) { if (id === 'memory') return { name: 'ВОСПОМИНАНИЕ' }; return heroes[id] || null; }

    function loadLevel(i) {
      li = i; lv = buildLevel(levels[i], i);
      pl.x = lv.startX; pl.y = surfaceY(lv, 3) - pl.h; pl.vx = pl.vy = 0; pl.safeX = pl.x; cam = 0;
      state = 'banner'; banner = 150;
    }
    function nextLevel() { if (li + 1 < levels.length) loadLevel(li + 1); else { state = 'finale'; finaleChars = 0; } }

    function update() {
      t += 16.7;
      if (dlg) {
        const line = dlg.lines[dlg.i];
        if (dlg.chars < line.text.length) { dlg.chars += 1.2; if (Math.floor(dlg.chars) % 3 === 0) sound.blip(); }
        if (actPressed || jumpPressed) {
          if (dlg.chars < line.text.length) dlg.chars = line.text.length;
          else if (++dlg.i >= dlg.lines.length) { const d = dlg.done; dlg = null; d && d(); } else dlg.chars = 0;
        }
        actPressed = jumpPressed = false; return;
      }
      if (state === 'card' || state === 'title') { if (actPressed || jumpPressed) { if (state === 'card') state = 'title'; else loadLevel(0); } actPressed = jumpPressed = false; return; }
      if (state === 'banner') { if (--banner <= 0 || actPressed || jumpPressed) { state = 'play'; say(levels[li].intro || [], null); } actPressed = jumpPressed = false; return; }
      if (state === 'finale') { const len = (game.finale && game.finale.letter || '').length; if (finaleChars < len) finaleChars += 0.8; if ((actPressed || jumpPressed) && finaleChars >= len) { state = 'title'; collected = 0; } else if (actPressed || jumpPressed) finaleChars = len; actPressed = jumpPressed = false; return; }
      if (state !== 'play') return;

      // движение
      const acc = 0.6, max = 2.8;
      if (keys.left) { pl.vx = Math.max(pl.vx - acc, -max); pl.flip = true; } else if (keys.right) { pl.vx = Math.min(pl.vx + acc, max); pl.flip = false; } else pl.vx *= 0.7;
      if (Math.abs(pl.vx) < 0.05) pl.vx = 0;
      if (jumpPressed && pl.on) { pl.vy = -9.6; pl.on = false; sound.jump(); }
      if (!keys.jump && pl.vy < -3) pl.vy = -3; // короткий прыжок
      jumpPressed = actPressed = false;
      pl.vy = Math.min(pl.vy + 0.5, 12);
      // X
      pl.x += pl.vx;
      const rows = [Math.floor(pl.y / T), Math.floor((pl.y + pl.h - 1) / T)];
      if (pl.vx > 0) { const tx = Math.floor((pl.x + pl.w) / T); for (let ty = rows[0]; ty <= rows[1]; ty++) if (solidAt(lv, tx, ty)) { pl.x = tx * T - pl.w - 0.01; pl.vx = 0; break; } }
      if (pl.vx < 0) { const tx = Math.floor(pl.x / T); for (let ty = rows[0]; ty <= rows[1]; ty++) if (solidAt(lv, tx, ty)) { pl.x = (tx + 1) * T + 0.01; pl.vx = 0; break; } }
      // Y
      pl.y += pl.vy; pl.on = false;
      const cols = [Math.floor(pl.x / T), Math.floor((pl.x + pl.w - 1) / T)];
      if (pl.vy > 0) { const ty = Math.floor((pl.y + pl.h) / T); for (let tx = cols[0]; tx <= cols[1]; tx++) if (solidAt(lv, tx, ty)) { pl.y = ty * T - pl.h; pl.vy = 0; pl.on = true; break; } }
      if (pl.vy < 0) { const ty = Math.floor(pl.y / T); for (let tx = cols[0]; tx <= cols[1]; tx++) if (solidAt(lv, tx, ty)) { pl.y = (ty + 1) * T; pl.vy = 0; break; } }
      if (pl.on) { const c = Math.floor((pl.x + pl.w / 2) / T); if (lv.ground[c - 1] !== null && lv.ground[c + 1] !== null && lv.ground[c] !== null) pl.safeX = pl.x; pl.walk += Math.abs(pl.vx); }
      // упал — мягко возвращаем
      if (pl.y > H + 40) { sound.fall(); pl.x = pl.safeX; pl.y = surfaceY(lv, Math.floor((pl.x + pl.w / 2) / T)) - pl.h - 2; pl.vx = pl.vy = 0; }
      // воспоминания
      lv.items.forEach(it => {
        if (!it.got && Math.abs(pl.x + pl.w / 2 - it.x) < 22 && Math.abs(pl.y + pl.h / 2 - it.y) < 40) {
          it.got = true; collected++; sound.collect();
          say([{ who: it.who || 'memory', text: it.text }], null);
        }
      });
      // финиш уровня
      if (pl.x + pl.w > lv.goalX - 30) {
        pl.vx = 0; state = 'outro';
        const L = levels[li]; const out = (L.outro && L.outro.length) ? L.outro : [{ who: partnerHero.id, text: 'Идём дальше?' }];
        say(out, nextLevel);
      }
      cam = clamp(pl.x - W * 0.4, 0, lv.len * T - W);
    }

    function drawDialog() {
      const line = dlg.lines[dlg.i], h = who(line.who), x = 16, y = H - 108, w = W - 32;
      P(ctx, '#EDE4CF', x - 4, y - 4, w + 8, 100); P(ctx, '#12150E', x, y, w, 92);
      let tx = x + 16;
      if (h && h.skin) { P(ctx, '#3B4630', x + 10, y + 10, 72, 72); drawHead(ctx, h, x + 16, y + 14, 3); tx = x + 96; }
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      if (h) { ctx.fillStyle = '#D4B95E'; ctx.font = '10px ' + FONT; ctx.fillText((h.name || '').toUpperCase() + ':', tx, y + 12); }
      ctx.fillStyle = '#EDE4CF'; ctx.font = '14px ' + MONO;
      wrap(ctx, line.text.slice(0, Math.floor(dlg.chars)), x + w - tx - 16).slice(0, 3).forEach((l, i) => ctx.fillText(l, tx, y + 32 + i * 18));
      if (dlg.chars >= line.text.length && Math.floor(t / 400) % 2) { ctx.fillStyle = '#D4B95E'; ctx.fillText('▼', x + w - 24, y + 70); }
    }

    function centerText(txt, y, size, color, font) { ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = color; ctx.font = size + 'px ' + (font || FONT); ctx.fillText(txt, W / 2, y); }

    function draw() {
      worldBegin();
      if (state === 'card') {
        drawBackground(ctx, THEMES.night, t / 20, t);
        worldEnd();
        P(ctx, 'rgba(18,21,14,.7)', 0, 0, W, H);
        P(ctx, '#D4B95E', 96, 54, 448, 252); P(ctx, '#272E1F', 100, 58, 440, 244);
        centerText('ТЕБЕ ПОСЛАНИЕ', 78, 14, '#D4B95E');
        ctx.font = '15px ' + MONO; ctx.fillStyle = '#EDE4CF'; ctx.textAlign = 'center';
        wrap(ctx, game.card, 380).slice(0, 7).forEach((l, i) => ctx.fillText(l, W / 2, 116 + i * 22));
        if (game.from) centerText('— ' + game.from, 268, 12, '#A9A68C', MONO);
        if (Math.floor(t / 500) % 2) centerText('НАЖМИ, ЧТОБЫ ОТКРЫТЬ', 320, 10, '#EDE4CF');
        return;
      }
      if (state === 'title') {
        const th = THEMES[levels[0] ? levels[0].theme : 'forest'];
        drawBackground(ctx, th, t / 15, t);
        for (let x = 0; x < W; x += T) { P(ctx, th.top, x, 280, T, 8); P(ctx, th.soil, x, 288, T, 72); }
        drawHero(ctx, playerHero, W / 2 - 40, 280, 3, false, Math.round(Math.sin(t / 300) * 2));
        drawHero(ctx, partnerHero, W / 2 + 40, 280, 3, true, Math.round(Math.cos(t / 300) * 2));
        worldEnd();
        P(ctx, 'rgba(18,21,14,.72)', 0, 34, W, 110);
        centerText((game.title || 'ИГРА').toUpperCase(), 62, game.title && game.title.length > 18 ? 16 : 24, '#D4B95E');
        if (game.subtitle) centerText(game.subtitle, 106, 13, '#EDE4CF', MONO);
        if (Math.floor(t / 500) % 2) { P(ctx, '#12150E', W / 2 - 96, 316, 192, 30); centerText('НАЖМИ СТАРТ', 325, 12, '#EDE4CF'); }
        return;
      }
      if (state === 'finale') {
        drawBackground(ctx, THEMES.night, t / 25, t);
        for (let x = 0; x < W; x += T) { P(ctx, '#3E5E4A', x, 300, T, 8); P(ctx, '#2A2420', x, 308, T, 52); }
        const duo = emoteOf(playerHero, ['duo']) || emoteOf(partnerHero, ['duo']);
        if (duo) PX.drawAnim(ctx, duo, playerHero, partnerHero, t, 3, W / 2, 300);
        else { drawHero(ctx, playerHero, W / 2 - 30, 300, 3, false); drawHero(ctx, partnerHero, W / 2 + 30, 300, 3, true); }
        for (let i = 0; i < 12; i++) { const hx = (i * 61 + t / 20) % W, hy = (i * 37 + t / 15) % 300; P(ctx, '#C0593A', hx, hy, 6, 6); }
        worldEnd();
        const F = game.finale || {};
        P(ctx, '#EDE4CF', 76, 24, 488, 196); P(ctx, '#12150E', 80, 28, 480, 188);
        centerText(F.title || 'КОНЕЦ', 44, 14, '#D4B95E');
        ctx.font = '14px ' + MONO; ctx.fillStyle = '#EDE4CF'; ctx.textAlign = 'left';
        wrap(ctx, (F.letter || '').slice(0, Math.floor(finaleChars)), 440).slice(0, 7).forEach((l, i) => ctx.fillText(l, 100, 76 + i * 19));
        if (finaleChars >= (F.letter || '').length) {
          if (F.from || game.from) { ctx.textAlign = 'right'; ctx.fillStyle = '#A9A68C'; ctx.fillText('— ' + (F.from || game.from), 540, 194); }
          if (Math.floor(t / 500) % 2) centerText('ВОСПОМИНАНИЯ: ' + collected + '/' + totalMem + ' · ЕЩЁ РАЗ?', 330, 10, '#EDE4CF');
        }
        return;
      }
      // уровень
      const img = levels[li]._img;
      if (img && img.complete && img.naturalWidth) {
        ctx.imageSmoothingEnabled = false;
        const iw = W * 1.25, ox = -((cam * 0.15) % (W * 0.25));
        ctx.drawImage(img, Math.round(ox), 0, Math.round(iw), 290);
        P(ctx, 'rgba(18,21,14,.18)', 0, 0, W, 290);
      } else drawBackground(ctx, lv.theme, cam, t);
      lv.deco.forEach(d => { const sx = d.x - cam; if (sx > -80 && sx < W + 20) { const sy = surfaceY(lv, Math.floor(d.x / T)); if (sy !== null) drawDeco(ctx, d, sx, sy); } });
      drawTerrain(ctx, lv, cam);
      // цель — партнёр
      const gsy = surfaceY(lv, Math.floor(lv.goalX / T));
      // партнёр ждёт в конце уровня; при встрече — его эмоция
      const greet = state === 'outro' && (emoteOf(partnerHero, ['emote']) || 'wave');
      if (greet) PX.drawAnim(ctx, greet, partnerHero, null, t, 2, lv.goalX - cam, gsy, { flip: true });
      else drawHero(ctx, partnerHero, lv.goalX - cam, gsy, 2, true, Math.round(Math.sin(t / 300)), true, 'side', {});
      if (state === 'play' && Math.floor(t / 400) % 2) { P(ctx, '#D4B95E', lv.goalX - cam - 4, gsy - 80, 8, 8); }
      lv.items.forEach(it => { if (!it.got && it.x - cam > -20 && it.x - cam < W + 20) drawMemory(ctx, it.x - cam, it.y, t); });
      // игрок: вид сбоку, выбранная походка
      const moving = Math.abs(pl.vx) > 0.3 && pl.on;
      const pose = !pl.on ? { legs: 1, armF: 'up', armB: 'swingB' } : moving ? PX.animFrame(playerHero.walk || 'walk_normal', pl.walk * 22) : {};
      drawHero(ctx, playerHero, pl.x + pl.w / 2 - cam, pl.y + pl.h, 2, pl.flip, 0, pl.on, 'side', pose);
      if (lv.theme.fireflies) for (let i = 0; i < 10; i++) { if (Math.sin(t / 400 + i * 2) > 0) P(ctx, '#F2E3A0', (i * 113 - cam * 0.6 % W + W * 2) % W, 60 + (i * 47) % 160 + Math.sin(t / 600 + i) * 6, 3, 3); }
      if (lv.theme.snowfall) for (let i = 0; i < 40; i++) P(ctx, '#FFFFFF', (i * 71 + t / 30 * (1 + i % 3)) % W, (i * 43 + t / 12) % H, 3, 3);
      worldEnd();
      // HUD
      P(ctx, '#12150E', 12, 12, 150, 28);
      const heart = ['.rr.rr.', 'rrwrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
      heart.forEach((row, j) => [...row].forEach((c, i) => { if (c !== '.') { ctx.fillStyle = c === 'w' ? '#EDE4CF' : '#C0593A'; ctx.fillRect(20 + i * 3, 18 + j * 3, 3, 3); } }));
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#D4B95E'; ctx.font = '10px ' + FONT; ctx.fillText(collected + '/' + totalMem, 48, 21);
      ctx.fillStyle = '#A9A68C'; ctx.fillText((li + 1) + '/' + levels.length, 112, 21);
      if (state === 'banner') {
        P(ctx, 'rgba(18,21,14,.8)', 0, 120, W, 100);
        centerText('УРОВЕНЬ ' + (li + 1), 138, 12, '#A9A68C');
        centerText((levels[li].title || '').toUpperCase(), 164, levels[li].title && levels[li].title.length > 22 ? 12 : 16, '#D4B95E');
        if (levels[li].place) centerText(levels[li].place, 196, 13, '#EDE4CF', MONO);
      }
      if (dlg) drawDialog();
    }

    let raf, last = performance.now(), accT = 0, alive = true;
    function frame(now) {
      if (!alive) return;
      accT += Math.min(100, now - last); last = now;
      while (accT >= 16.7) { update(); accT -= 16.7; }
      draw(); raf = requestAnimationFrame(frame);
    }
    const fontsReady = document.fonts ? Promise.race([document.fonts.load('12px "Press Start 2P"'), new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
    fontsReady.then(() => { raf = requestAnimationFrame(frame); });

    return { stop() { alive = false; cancelAnimationFrame(raf); sound.music(false); removeEventListener('keydown', kd); removeEventListener('keyup', ku); } };
  }

  /* стили интерфейса игры (кнопки, масштаб) */
  const css = `.phg{position:relative;width:100%;aspect-ratio:16/9;background:#12150E;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
.phg canvas{width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges}
.phg-ui button{font:12px "Press Start 2P",monospace;color:#EDE4CF;background:rgba(18,21,14,.65);border:3px solid #EDE4CF;cursor:pointer}
.phg-mute{position:absolute;top:10px;right:10px;width:36px;height:36px;font-size:14px!important}
.phg-touch{display:none;position:absolute;left:0;right:0;bottom:10px;padding:0 12px;justify-content:space-between;pointer-events:none}
.phg-touch button{pointer-events:auto;width:58px;height:58px;font-size:16px!important;opacity:.85}
.phg-pad,.phg-ab{display:flex;gap:10px}.phg-ab button[data-k=jump]{background:rgba(192,89,58,.8)}.phg-ab button[data-k=act]{background:rgba(212,185,94,.75);color:#12150E}
@media (hover:none),(pointer:coarse){.phg-touch{display:flex}}
@media (orientation:portrait) and (pointer:coarse){.phg{aspect-ratio:auto;overflow:visible;background:#272E1F}.phg canvas{height:auto;aspect-ratio:16/9}.phg-touch{position:static;padding:22px 16px 18px}.phg-touch button{width:74px;height:74px;opacity:1}}`;
  if (typeof document !== 'undefined' && !document.getElementById('phg-css')) { const st = document.createElement('style'); st.id = 'phg-css'; st.textContent = css; document.head.appendChild(st); }

  global.PHGame = { start, THEMES: THEME_NAMES, buildLevel };
}
window.PHEngineFactory = PHEngineFactory;
PHEngineFactory(window);
