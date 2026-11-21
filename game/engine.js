/* Pixel History — игровой движок.
   Получает описание игры (JSON) и запускает игру-историю:
   открытка → титульный экран → главы (сцены с действиями и мини-играми) → финальное письмо.
   Детальные фоны — game/scenes.js (подключать до этого файла).
   Зависит от PX (assets/pixel.js) — им рисуются герои. */
function PHEngineFactory(global) {
  'use strict';
  const W = 640, H = 360, T = 20, ROWS = H / T;
  const FONT = '"Press Start 2P", monospace', MONO = '"JetBrains Mono", monospace';

  /* ---------------- темы уровней ---------------- */
  const THEMES = {
    forest:    { sky: ['#161B12', '#1E2618', '#283321', '#33422A'], far: '#2F4A26', mid: '#47603A', top: '#6E9145', top2: '#5B7A3A', soil: '#4A3626', soil2: '#3B2B1E', deco: ['tree', 'bench', 'tree', 'lamp'], fireflies: true },
    mountains: { sky: ['#2B3A4A', '#3E5568', '#5C7A8C', '#8FA9B5'], far: '#6B7F8C', cap: '#EDE4CF', mid: '#4A5E4A', top: '#7A9A5A', top2: '#5B7A3A', soil: '#6B6B6B', soil2: '#575757', deco: ['pine', 'rock', 'pine'], peaks: true },
    city:      { sky: ['#141626', '#1E2238', '#2B2F4A', '#3A3A5A'], far: '#23263D', mid: '#2E3250', top: '#8A8A8A', top2: '#6B6B6B', soil: '#3B3B46', soil2: '#33333D', deco: ['lamp', 'bench', 'lamp'], stars: true, buildings: true },
    lake:      { sky: ['#3C5A78', '#5B7FA0', '#8FB2C8', '#C9DCE3'], far: '#4A6E5A', mid: '#3E5E4A', top: '#8FB25A', top2: '#6E9145', soil: '#8A6A3A', soil2: '#6E5430', deco: ['reed', 'tree', 'reed'], water: '#4A6E9C' },
    beach:     { sky: ['#4A8FC0', '#6FAFD8', '#A8D4EC', '#F2E3A0'], far: '#3E7FB0', mid: '#4A9CC8', top: '#F2D9A0', top2: '#E8C887', soil: '#D9B877', soil2: '#C9A867', deco: ['palm', 'shell', 'palm'], water: '#3E8FC0', sun: true },
    night:     { sky: ['#0B0E1A', '#121730', '#1A2142', '#232B52'], far: '#1A2238', mid: '#232E48', top: '#3E5E4A', top2: '#2F4A3A', soil: '#2A2420', soil2: '#211C19', deco: ['tree', 'lamp', 'tree'], stars: true, moon: true, fireflies: true },
    snow:      { sky: ['#5C6E8C', '#7A8CA8', '#A8B8CC', '#D8E0EA'], far: '#C9D4E0', mid: '#9FB0C4', top: '#F4F7FA', top2: '#DDE5EE', soil: '#8A9AB0', soil2: '#7A8AA0', deco: ['pine', 'snowman', 'pine'], peaks: true, cap: '#FFFFFF', snowfall: true },
    home:      { sky: ['#3A2A20', '#4A3626', '#5A4230', '#6A4E38'], far: '#5E4530', mid: '#4A3626', top: '#8A5A2E', top2: '#7A4E28', soil: '#4A3626', soil2: '#3B2B1E', deco: ['plant', 'lamp', 'plant'], interior: true },
    // --- сюжетные локации (scene — своя отрисовка фона, flat — без ям: помещения)
    club:      { scene: 'club', flat: true, sky: ['#1A1426'], top: '#3A3352', top2: '#2E2844', soil: '#241E36', soil2: '#1E192E', deco: ['gamechair', 'vending', 'gamechair', 'cooler'] },
    winter:    { scene: 'winter', sky: ['#0B0E1A', '#121730', '#1A2142', '#232B52'], far: '#1F2540', mid: '#2A3150', top: '#F4F7FA', top2: '#DDE5EE', soil: '#6B7A90', soil2: '#5C6B80', deco: ['lamp', 'snowman', 'bench'], stars: true, buildings: true, roofSnow: true, snowfall: true },
    almaty:    { scene: 'almaty', sky: ['#2A2E4A'], top: '#8A8A8A', top2: '#6B6B6B', soil: '#3B3B46', soil2: '#33333D', deco: ['lamp', 'tree', 'bench'] },
    office:    { scene: 'office', flat: true, sky: ['#CFC7B2'], top: '#8A6A3A', top2: '#7A5C30', soil: '#5E4530', soil2: '#4E3A28', deco: ['plant', 'rack', 'cooler'] },
    autumn:    { scene: 'autumn', sky: ['#7FB2E5'], top: '#B5A040', top2: '#9C8A34', soil: '#6E5430', soil2: '#5E4628', deco: ['tree_autumn', 'bench', 'tree_autumn', 'lamp'], leaves: true },
    mall:      { scene: 'mall', flat: true, sky: ['#E9DFC9'], top: '#C9BCA8', top2: '#B8AA94', soil: '#8F8270', soil2: '#7F7262', deco: ['plant', 'bench', 'kiosk'] },
    cinema:    { scene: 'cinema', flat: true, sky: ['#140C12'], top: '#5A1E28', top2: '#4A1820', soil: '#2A1016', soil2: '#220C12', deco: ['popcorn', 'lamp'] },
    optics:    { scene: 'optics', flat: true, sky: ['#E3EEF0'], top: '#D9D3C0', top2: '#C9C2AE', soil: '#9C9584', soil2: '#8C8574', deco: ['mirror', 'plant'] },
    food:      { scene: 'food', flat: true, sky: ['#E9A04A'], top: '#C9A27A', top2: '#B8916A', soil: '#7A5C40', soil2: '#6A4E36', deco: ['table', 'plant', 'table'] }
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
      if (v < 0.16 && ground[x - 1] !== null && !(THEMES[L.theme] || {}).flat) {   // в помещениях ям нет
        const gw = 2 + Math.floor(r() * 2);
        for (let i = 0; i < gw && x < len - 14; i++) ground[x++] = null;
      } else {
        if (v < 0.5) gy = clamp(gy + (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 2)), 11, 15);
        const sw = 5 + Math.floor(r() * 7), start = x;
        for (let i = 0; i < sw && x < len - 14; i++) ground[x++] = gy;
        if (r() < 0.4 && x - start >= 4) plats.push({ x: start + 1, y: gy - 5, w: 3 + Math.floor(r() * 2) });
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
      return { x: mx * T + T / 2, y: surf * T - (high ? 96 : 46), text: m.text || m, who: m.who, got: false };
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
  /* ---------- фоны сюжетных локаций ---------- */
  const SCENES = {
    club(ctx, cam, t) {   // компьютерный клуб ночью
      P(ctx, '#1A1426', 0, 0, W, H); P(ctx, '#221A33', 0, 0, W, 116); P(ctx, '#C03AB0', 0, 116, W, 3); P(ctx, 'rgba(192,58,176,.15)', 0, 110, W, 16);
      const fx = cam * 0.2;
      for (let i = -1; i < 4; i++) {
        const bx = Math.round(i * 300 - (fx % 300));
        P(ctx, '#0E0A16', bx + 40, 30, 200, 56); P(ctx, '#2A2040', bx + 44, 34, 192, 48);
        ctx.font = '14px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = Math.sin(t / 300 + i) > -0.6 ? '#4FE3FF' : '#1C5A66'; ctx.fillText('COMPUTER CLUB', bx + 140, 58);
      }
      const mx = cam * 0.5;
      for (let i = -1; i < 14; i++) {
        const bx = Math.round(i * 56 - (mx % 56)), on = (i * 7 + Math.floor(t / 900)) % 5 !== 0;
        P(ctx, 'rgba(80,140,255,.07)', bx + 4, 170, 46, 50);
        P(ctx, '#12101A', bx + 12, 184, 28, 22); P(ctx, on ? '#4F8CFF' : '#2A3A66', bx + 14, 186, 24, 16);
        if (on) P(ctx, '#9FD0FF', bx + 16, 188, 8, 2);
        P(ctx, '#12101A', bx + 24, 206, 4, 6); P(ctx, '#3A2E4A', bx + 2, 212, 50, 5); P(ctx, '#2A2238', bx + 6, 217, 3, 30); P(ctx, '#2A2238', bx + 45, 217, 3, 30);
      }
    },
    almaty(ctx, cam, t) {   // Алматы: горы со снежными шапками и город
      const sky = ['#2A2E4A', '#3E3A5C', '#6A4E6E', '#B8706A'];
      sky.forEach((c, i) => P(ctx, c, 0, i * 50, W, 51)); P(ctx, '#B8706A', 0, 200, W, H);
      const fx = cam * 0.12;
      for (let i = -1; i < 5; i++) { const bx = Math.floor(i * 220 - (fx % 220)), ph = 150 + ((i + Math.floor(fx / 220)) * 41 % 50 + 50) % 50; for (let y = 0; y < ph; y += 4) { const w = Math.floor(y * 1.4); P(ctx, y < 30 ? '#EDE4CF' : '#4A4A6A', bx + 110 - w, 250 - ph + y, w * 2, 4); } }
      const mx = cam * 0.35;
      for (let i = -1; i < 12; i++) {
        const k = i + Math.floor(mx / 64), bx = Math.floor(i * 64 - (mx % 64)), bh = 60 + (Math.abs(k * 37) % 90);
        P(ctx, '#23263D', bx, 280 - bh, 56, bh);
        for (let wy = 280 - bh + 8; wy < 270; wy += 14) for (let wx = bx + 6; wx < bx + 50; wx += 12) if (((wx + wy + k * 5) % 7) < 3) P(ctx, '#F2C46B', wx, wy, 5, 6);
      }
    },
    office(ctx, cam, t) {   // офис: окна с видом на горы
      P(ctx, '#CFC7B2', 0, 0, W, H); P(ctx, '#B8AF98', 0, 200, W, 4);
      const fx = cam * 0.3;
      for (let i = -1; i < 6; i++) {
        const bx = Math.round(i * 150 - (fx % 150));
        P(ctx, '#8A8270', bx + 20, 36, 110, 120); P(ctx, '#8FC0E6', bx + 24, 40, 102, 112);
        for (let y = 0; y < 50; y += 4) { const w = Math.floor(y * 1.2); P(ctx, y < 14 ? '#FFFFFF' : '#7A8CA8', bx + 75 - w, 100 + y, w * 2, 4); }
        P(ctx, '#8A8270', bx + 73, 40, 4, 112); P(ctx, '#8A8270', bx + 24, 94, 102, 4);
      }
      const mx = cam * 0.55;
      for (let i = -1; i < 10; i++) { const bx = Math.round(i * 90 - (mx % 90)); P(ctx, '#6E5A40', bx + 8, 214, 64, 6); P(ctx, '#2A2A33', bx + 26, 190, 26, 18); P(ctx, '#6FB5FF', bx + 28, 192, 22, 13); P(ctx, '#5E4A34', bx + 12, 220, 4, 26); P(ctx, '#5E4A34', bx + 64, 220, 4, 26); }
    },
    autumn(ctx, cam, t) {   // Актобе, начало осени, день
      ['#7FB2E5', '#94C0EA', '#AECFEE', '#CFE2F2'].forEach((c, i) => P(ctx, c, 0, i * 45, W, 46)); P(ctx, '#CFE2F2', 0, 180, W, H);
      P(ctx, '#FFE98A', 520, 40, 40, 40); P(ctx, '#FFD23F', 526, 46, 28, 28);
      const fx = cam * 0.25;
      for (let i = -1; i < 11; i++) {
        const k = i + Math.floor(fx / 72), bx = Math.floor(i * 72 - (fx % 72)), bh = 70 + (Math.abs(k * 43) % 80);
        P(ctx, ['#C9B8A0', '#B8A890', '#D8C8B0'][Math.abs(k) % 3], bx, 260 - bh, 62, bh);
        for (let wy = 260 - bh + 10; wy < 250; wy += 16) for (let wx = bx + 8; wx < bx + 56; wx += 14) P(ctx, '#7A8CA8', wx, wy, 7, 8);
      }
      const mx = cam * 0.5;
      for (let i = -1; i < 12; i++) { const bx = Math.floor(i * 70 - (mx % 70)); P(ctx, '#5E4530', bx + 30, 230, 6, 40); P(ctx, (i % 3) ? '#E0952F' : '#E8C547', bx + 12, 200, 42, 34); P(ctx, '#C0593A', bx + 20, 194, 26, 12); }
    },
    mall(ctx, cam, t) {   // ТЦ «Керуен Сити»
      P(ctx, '#E9DFC9', 0, 0, W, H); P(ctx, '#D8CCB4', 0, 0, W, 26);
      for (let x = 20; x < W; x += 80) { P(ctx, '#FFF6D8', x, 20, 40, 6); P(ctx, 'rgba(255,246,216,.25)', x - 10, 26, 60, 30); }
      const bx0 = Math.round(-(cam * 0.15) % 640);
      for (let j = 0; j < 3; j++) { const bx = bx0 + j * 640; P(ctx, '#2A2420', bx + 170, 40, 300, 36); ctx.font = '16px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#F4C430'; ctx.fillText('KERUEN CITY', bx + 320, 59); }
      const fx = cam * 0.35, aw = ['#C0593A', '#4A6E9C', '#6E9145', '#F4C430', '#9B8AC4'], nm = ['CAFE', 'SHOES', 'TOYS', 'FOOD', 'BOOKS'];
      for (let i = -1; i < 6; i++) {
        const k = Math.abs(i + Math.floor(fx / 150)) % 5, bx = Math.floor(i * 150 - (fx % 150));
        P(ctx, '#8A7E6A', bx + 8, 96, 134, 120); P(ctx, '#BFD8E0', bx + 14, 120, 122, 96); P(ctx, aw[k], bx + 8, 96, 134, 20);
        ctx.font = '8px ' + FONT; ctx.fillStyle = '#FFFFFF'; ctx.fillText(nm[k], bx + 75, 106);
        P(ctx, 'rgba(255,255,255,.4)', bx + 20, 126, 10, 80);
      }
    },
    cinema(ctx, cam, t) {   // кинозал
      P(ctx, '#140C12', 0, 0, W, H);
      const fx = cam * 0.1, sx = Math.round(80 - (fx % 900));
      for (let j = 0; j < 3; j++) { const x = sx + j * 900; P(ctx, '#3A2A30', x - 6, 24, 492, 152); const fl = 0.85 + Math.sin(t / 90) * 0.08; ctx.fillStyle = `rgba(237,228,207,${fl})`; ctx.fillRect(x, 30, 480, 140); P(ctx, '#C9DCE3', x + 40, 120, 160, 50); P(ctx, '#7A8CA8', x + 260, 70, 120, 100); P(ctx, 'rgba(255,255,255,.08)', x - 60, 170, 600, 60); }
      const mx = cam * 0.5;
      for (let r = 0; r < 2; r++) for (let i = -1; i < 22; i++) { const bx = Math.round(i * 32 - (mx % 32)) + r * 16; P(ctx, r ? '#7A1E2A' : '#5A1620', bx, 200 + r * 18, 26, 22); P(ctx, r ? '#9A2A36' : '#6E1C28', bx + 2, 200 + r * 18, 22, 6); }
    },
    optics(ctx, cam, t) {   // оптика: витрины с оправами
      P(ctx, '#E3EEF0', 0, 0, W, H);
      const bx0 = Math.round(-(cam * 0.15) % 480);
      for (let j = 0; j < 3; j++) { const bx = bx0 + j * 480; P(ctx, '#4A6E9C', bx + 150, 24, 180, 34); ctx.font = '14px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF'; ctx.fillText('ОПТИКА', bx + 240, 42); }
      const fx = cam * 0.35;
      for (let i = -1; i < 8; i++) {
        const bx = Math.floor(i * 110 - (fx % 110));
        P(ctx, '#B8C6CC', bx + 6, 76, 98, 140);
        for (let s = 0; s < 4; s++) { P(ctx, '#8C9AA0', bx + 6, 104 + s * 30, 98, 3); for (let g2 = 0; g2 < 3; g2++) { const gx = bx + 14 + g2 * 30, gy = 92 + s * 30, c = ['#2A2420', '#8A5A2E', '#C0593A', '#4A6E9C'][(s + g2 + i) & 3]; P(ctx, c, gx, gy, 8, 2); P(ctx, c, gx + 12, gy, 8, 2); P(ctx, c, gx, gy, 2, 6); P(ctx, c, gx + 6, gy, 2, 6); P(ctx, c, gx + 12, gy, 2, 6); P(ctx, c, gx + 18, gy, 2, 6); P(ctx, c, gx, gy + 6, 8, 2); P(ctx, c, gx + 12, gy + 6, 8, 2); P(ctx, c, gx + 8, gy + 2, 4, 2); } }
      }
    },
    food(ctx, cam, t) {   // донерная
      P(ctx, '#E9A04A', 0, 0, W, 150); P(ctx, '#F2E3C9', 0, 150, W, H);
      for (let x = 0; x < W; x += 16) for (let y = 150; y < H; y += 16) if (((x + y) >> 4) % 2) P(ctx, '#E6D4B4', x, y, 16, 16);
      const bx0 = Math.round(-(cam * 0.2) % 420);
      for (let j = 0; j < 3; j++) {
        const bx = bx0 + j * 420; P(ctx, '#2A2420', bx + 60, 20, 300, 96);
        ctx.font = '12px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#F4C430'; ctx.fillText('ДОНЕР ....... 1800 ₸', bx + 74, 34);
        ctx.fillStyle = '#EDE4CF'; ctx.fillText('ШАУРМА ...... 1500 ₸', bx + 74, 60); ctx.fillText('АЙРАН ........ 400 ₸', bx + 74, 86);
      }
      const mx = cam * 0.45;
      for (let i = -1; i < 4; i++) {
        const bx = Math.round(i * 260 - (mx % 260));
        P(ctx, '#8A5A2E', bx + 20, 196, 200, 50); P(ctx, '#6E4624', bx + 20, 196, 200, 6);
        P(ctx, '#B8B8B8', bx + 150, 128, 4, 70); P(ctx, '#9E5A2E', bx + 140, 140, 24, 52); P(ctx, '#C9783A', bx + 142, 144, 6, 44);
        P(ctx, 'rgba(255,140,40,.25)', bx + 166, 140, 14, 52);
      }
    }
  };

  // Возвращает true, если нарисована детальная сцена целиком (вместе с полом)
  function drawBackground(ctx, th, cam, t, gy) {
    if (th.scene && global.PHScenes && global.PHScenes.draw(ctx, th.scene, cam, t, gy || 300)) return true;
    if (th.scene && SCENES[th.scene]) { SCENES[th.scene](ctx, cam, t); return false; }
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
        ctx.fillStyle = th.far; ctx.fillRect(bx, 270 - bh, 60, bh); if (th.roofSnow) { ctx.fillStyle = '#F4F7FA'; ctx.fillRect(bx - 2, 266 - bh, 64, 5); }
        for (let wy = 270 - bh + 10; wy < 260; wy += 16) for (let wx = bx + 8; wx < bx + 52; wx += 14) if (((wx + wy + k * 7) % 5) < 2) { ctx.fillStyle = '#F4C430'; ctx.fillRect(wx, wy, 6, 8); }
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
  function drawDeco(ctx, d, sx, gy, t) {
    t = t || 0;
    const s = 4, b = gy;
    switch (d.type) {
      case 'tree': P(ctx, '#4A3626', sx + 12, b - 70, 12, 70); P(ctx, '#2F4A26', sx - 12, b - 120, 60, 56); P(ctx, '#3E5E30', sx - 4, b - 132, 44, 20); P(ctx, '#47603A', sx, b - 110, 16, 12); break;
      case 'pine': P(ctx, '#4A3626', sx + 14, b - 24, 8, 24); for (let i = 0; i < 4; i++) P(ctx, '#2F4A3A', sx + 18 - (i + 1) * 8, b - 100 + i * 18, (i + 1) * 16, 18); P(ctx, '#FFFFFF', sx + 14, b - 104, 8, 6); break;
      case 'rock': P(ctx, '#7A7A7A', sx, b - 16, 32, 16); P(ctx, '#959595', sx + 4, b - 22, 20, 8); P(ctx, '#5E5E5E', sx + 24, b - 12, 8, 12); break;
      case 'lamp': P(ctx, '#2A2420', sx + 10, b - 80, 4, 80); P(ctx, '#2A2420', sx + 4, b - 88, 16, 8); P(ctx, '#F2E3A0', sx + 6, b - 84, 12, 6); P(ctx, 'rgba(242,227,160,.12)', sx - 20, b - 80, 64, 80); break;
      case 'bench': P(ctx, '#8A5A2E', sx, b - 16, 44, 6); P(ctx, '#8A5A2E', sx, b - 28, 44, 4); P(ctx, '#2A2420', sx + 4, b - 10, 4, 10); P(ctx, '#2A2420', sx + 36, b - 10, 4, 10); break;
      case 'reed': for (let i = 0; i < 3; i++) { P(ctx, '#6E9145', sx + i * 8, b - 36 + i * 4, 3, 36 - i * 4); P(ctx, '#8A5A2E', sx + i * 8 - 1, b - 44 + i * 4, 5, 10); } break;
      case 'palm': P(ctx, '#8A6A3A', sx + 14, b - 90, 8, 90); P(ctx, '#5B7A3A', sx - 16, b - 96, 68, 8); P(ctx, '#6E9145', sx - 4, b - 104, 44, 8); P(ctx, '#5B7A3A', sx - 20, b - 88, 12, 12); P(ctx, '#5B7A3A', sx + 44, b - 88, 12, 12); break;
      case 'shell': P(ctx, '#F2B5A0', sx, b - 8, 16, 8); P(ctx, '#E39B86', sx + 4, b - 12, 8, 4); break;
      case 'snowman': P(ctx, '#FFFFFF', sx, b - 24, 28, 24); P(ctx, '#FFFFFF', sx + 4, b - 42, 20, 18); P(ctx, '#12121C', sx + 9, b - 36, 3, 3); P(ctx, '#12121C', sx + 16, b - 36, 3, 3); P(ctx, '#C0593A', sx + 13, b - 32, 6, 3); break;
      case 'plant': P(ctx, '#8A5A2E', sx + 4, b - 18, 20, 18); P(ctx, '#6E9145', sx, b - 36, 12, 18); P(ctx, '#5B7A3A', sx + 14, b - 40, 12, 22); break;
      case 'gamechair': P(ctx, '#C03AB0', sx + 6, b - 58, 18, 30); P(ctx, '#1A1426', sx + 9, b - 54, 12, 22); P(ctx, '#C03AB0', sx + 2, b - 30, 26, 8); P(ctx, '#1A1426', sx, b - 36, 4, 10); P(ctx, '#1A1426', sx + 26, b - 36, 4, 10); P(ctx, '#3A3352', sx + 13, b - 22, 4, 14); P(ctx, '#3A3352', sx + 4, b - 8, 22, 3); P(ctx, '#12101A', sx + 3, b - 5, 4, 4); P(ctx, '#12101A', sx + 23, b - 5, 4, 4); break;
      case 'vending': P(ctx, '#2A2440', sx, b - 80, 40, 80); P(ctx, '#BFD8E0', sx + 4, b - 74, 24, 50); for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) P(ctx, ['#C0593A', '#F4C430', '#6E9145', '#4A6E9C'][(r + c) % 4], sx + 6 + c * 8, b - 70 + r * 12, 5, 7); P(ctx, '#12101A', sx + 31, b - 66, 6, 14); P(ctx, Math.floor(t / 500) % 2 ? '#6FE38A' : '#2A5A36', sx + 32, b - 62, 4, 3); P(ctx, '#12101A', sx + 6, b - 18, 20, 8); P(ctx, 'rgba(79,140,255,.12)', sx - 6, b - 86, 52, 86); break;
      case 'cooler': P(ctx, '#DDE5EE', sx + 4, b - 44, 18, 44); P(ctx, '#B8C2CC', sx + 4, b - 20, 18, 3); P(ctx, '#6FAFD8', sx + 6, b - 62, 14, 18); P(ctx, '#C0593A', sx + 8, b - 34, 3, 3); P(ctx, '#4A6E9C', sx + 15, b - 34, 3, 3); break;
      case 'rack': P(ctx, '#2A2A33', sx, b - 74, 28, 74); for (let i = 0; i < 6; i++) { P(ctx, '#3A3A46', sx + 3, b - 70 + i * 12, 22, 8); P(ctx, (Math.floor(t / 300) + i) % 3 ? '#6FE38A' : '#2A5A36', sx + 5, b - 67 + i * 12, 3, 2); P(ctx, (Math.floor(t / 200) + i) % 4 ? '#FFB84F' : '#5A3A14', sx + 10, b - 67 + i * 12, 3, 2); } break;
      case 'tree_autumn': P(ctx, '#5E4530', sx + 12, b - 66, 10, 66); P(ctx, '#E0952F', sx - 12, b - 112, 58, 50); P(ctx, '#E8C547', sx - 4, b - 124, 42, 20); P(ctx, '#C0593A', sx + 24, b - 96, 16, 14); P(ctx, '#C0593A', sx - 8, b - 84, 12, 10); break;
      case 'kiosk': P(ctx, '#8A5A2E', sx, b - 40, 40, 40); P(ctx, '#C0593A', sx - 4, b - 56, 48, 14); P(ctx, '#EDE4CF', sx + 4, b - 36, 32, 10); P(ctx, '#F4C430', sx + 8, b - 52, 24, 6); break;
      case 'popcorn': P(ctx, '#EDE4CF', sx + 4, b - 26, 18, 26); for (let i = 0; i < 3; i++) P(ctx, '#C0593A', sx + 6 + i * 6, b - 26, 3, 26); P(ctx, '#F2E3A0', sx + 2, b - 34, 22, 9); P(ctx, '#FFFFFF', sx + 6, b - 36, 4, 3); break;
      case 'mirror': P(ctx, '#8A8270', sx + 14, b - 20, 4, 20); P(ctx, '#8A8270', sx + 2, b - 62, 28, 44); P(ctx, '#BFD8E0', sx + 5, b - 59, 22, 38); P(ctx, '#FFFFFF', sx + 8, b - 55, 3, 20); break;
      case 'table': P(ctx, '#6E4624', sx + 14, b - 26, 4, 26); P(ctx, '#8A5A2E', sx - 4, b - 30, 40, 6); P(ctx, '#E3D6B5', sx + 4, b - 38, 14, 8); P(ctx, '#C0593A', sx + 6, b - 38, 10, 3); P(ctx, '#EDE4CF', sx + 22, b - 40, 6, 10); break;
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
    PX.drawPose(ctx, h, s, Math.round(x - PX.CX * s), Math.round(footY - PX.FOOT * s + (bob || 0)), view || 'front', pose || null, flip, shadow);
  }
  function emoteOf(h, kinds) { return (h.emotes || []).find(id => PX.ANIMS[id] && kinds.includes(PX.ANIMS[id].kind)); }
  function drawHead(ctx, h, x, y, s) {
    const g = heroGrid(h);
    for (const k in g) { const i = k.indexOf(','); const gx = +k.slice(0, i), gy = +k.slice(i + 1); if (gy <= 17) { ctx.fillStyle = g[k]; ctx.fillRect(x + gx * s, y + gy * s, s, s); } }
  }
  function drawMemory(ctx, x, y, t) {
    const b = Math.round(Math.sin(t / 250) * 3);
    ctx.fillStyle = 'rgba(242,227,160,.25)'; ctx.fillRect(x - 16, y - 16 + b, 32, 32);
    const heart = ['.rr.rr.', 'rrwrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
    heart.forEach((row, j) => [...row].forEach((c, i) => { if (c !== '.') { ctx.fillStyle = c === 'w' ? '#EDE4CF' : '#C0593A'; ctx.fillRect(x - 14 + i * 4, y - 12 + j * 4 + b, 4, 4); } }));
    if (Math.floor(t / 200) % 3 === 0) { ctx.fillStyle = '#F2E3A0'; ctx.fillRect(x + 12, y - 16 + b, 4, 4); }
  }

  /* ======================================================================
     ИГРА-ИСТОРИЯ (v3). Не платформер: герой ходит по сцене, подходит к людям
     и предметам и нажимает «действие», а события сюжета проживаются через
     сценарий (script) и мини-игры, сделанные из самой истории.

     Глава (level):
       { title, place, theme, width, patch,
         props:  [{ id, type, x, label }],            // предметы на сцене (type — как в drawDeco + memory/door/pcdesk/counter)
         actors: [{ id, x, show, flip, mode }],       // другие герои (id героя из game.heroes)
         script: [ шаги ] }
     Шаги сценария:
       { say: [{who, text}] }                         // диалог (who: id героя | 'narrator' | 'memory')
       { goal: 'Текст цели', at: 'id' }                // подойти к предмету/герою и нажать «действие»
       { goal: 'Текст', near: 'id', dist: 260 }         // просто подойти близко
       { goal: 'Текст', toX: 1400 }                     // дойти до точки
       { mini: 'chat'|'choice'|'quiz'|'catch'|'whack'|'poses'|'tryon'|'assemble', ... }
       { actor: 'id', show, x, flip, mode: 'idle'|'run'|'follow'|'emote', to, emote, wait }
       { patch: { id: {...внешность} } }               // переодеть (до конца главы)
       { memory: 'текст' }                            // воспоминание (+1 в счётчик)
       { fade: 'Прошло 9 месяцев…' }                   // титр между событиями
       { take: 'id' }                                 // убрать предмет со сцены
     Старый формат (intro / memories / outro / goal) автоматически
     превращается в сценарий — игры от ИИ продолжают работать.
     ====================================================================== */
  const GROUND = 300;

  function toChapter(L, i, playerId, partnerId, partnerName) {
    if (L.script) return Object.assign({ width: 1400, props: [], actors: [] }, L);
    // совместимость: старый формат → сценарий «подойди и вспомни»
    let mems = L.memories || [], width = Math.max(1200, 520 + mems.length * 300), goal = L.goal || 'partner';
    const props = mems.map((m, k) => ({ id: 'm' + k, type: 'memory', x: 380 + k * 300 }));
    const actors = [], script = [{ say: L.intro || [] }];
    mems.forEach((m, k) => script.push({ goal: 'Найди воспоминание', at: 'm' + k }, { memory: m.text || m, who: m.who }, { take: 'm' + k }));
    if (partnerId === playerId && goal !== 'exit') goal = 'solo';
    if (goal === 'solo') script.push({ goal: 'Иди дальше', toX: width - 80 });
    else if (goal === 'exit') { props.push({ id: 'door', type: 'door', x: width - 120 }); script.push({ goal: 'Иди дальше', at: 'door' }); }
    else if (goal === 'runaway') {
      actors.push({ id: partnerId, x: width - 180, show: true, flip: true });
      script.push({ goal: 'Подойди к ' + partnerName, near: partnerId, dist: 280 });
      if (L.runLine) script.push({ say: [{ who: playerId, text: L.runLine }] });
      script.push({ actor: partnerId, mode: 'run', to: width + 260, wait: true }, { actor: partnerId, show: false });
    } else { actors.push({ id: partnerId, x: width - 180, show: true, flip: true }); script.push({ goal: 'Подойди к ' + partnerName, at: partnerId }); }
    script.push({ say: L.outro || [] });
    return Object.assign({}, L, { width, props, actors, script });
  }

  /* ---------------- предметы сцены ---------------- */
  function drawProp(ctx, p, sx, gy, t) {
    const b = gy;
    switch (p.type) {
      case 'memory': drawMemory(ctx, sx, gy - 58, t); return;
      case 'door': P(ctx, '#2A1E16', sx - 22, b - 70, 44, 70); P(ctx, '#5E4530', sx - 18, b - 66, 36, 66); P(ctx, '#6E5238', sx - 14, b - 62, 28, 26); P(ctx, '#6E5238', sx - 14, b - 32, 28, 28); P(ctx, '#F4C430', sx + 10, b - 36, 3, 5); return;
      case 'pcdesk':
        P(ctx, '#3A2E4A', sx - 34, b - 34, 68, 6); P(ctx, '#2A2238', sx - 30, b - 28, 4, 28); P(ctx, '#2A2238', sx + 26, b - 28, 4, 28);
        P(ctx, '#12101A', sx - 16, b - 64, 32, 26); P(ctx, Math.floor(t / 400) % 2 ? '#4F8CFF' : '#5A9AFF', sx - 13, b - 61, 26, 19); P(ctx, '#9FD0FF', sx - 10, b - 58, 10, 2);
        P(ctx, '#12101A', sx - 3, b - 38, 6, 4); P(ctx, '#C03AB0', sx + 28, b - 56, 14, 24); P(ctx, '#C03AB0', sx + 24, b - 32, 22, 6); return;
      case 'counter': P(ctx, '#6E4624', sx - 50, b - 44, 100, 44); P(ctx, '#8A5A2E', sx - 54, b - 48, 108, 6); P(ctx, '#2A2420', sx - 10, b - 70, 24, 20); P(ctx, '#6FE38A', sx - 6, b - 66, 16, 8); P(ctx, '#B8B8B8', sx + 34, b - 100, 4, 52); P(ctx, '#9E5A2E', sx + 26, b - 94, 20, 44); return;
      default: drawDeco(ctx, { type: p.type }, sx - 14, gy, t);
    }
  }

  /* ---------------- мини-игры ---------------- */
  const MG = {};
  const box = (ctx, x, y, w, h, fill, line) => { P(ctx, line || '#EDE4CF', x - 4, y - 4, w + 8, h + 8); P(ctx, fill || '#12121C', x, y, w, h); };
  const txt = (ctx, s, x, y, size, color, font, align) => { ctx.fillStyle = color; ctx.font = size + 'px ' + (font || MONO); ctx.textAlign = align || 'left'; ctx.textBaseline = 'top'; ctx.fillText(s, x, y); };
  function wrapLines(ctx, s, w, size) { ctx.font = size + 'px ' + MONO; return wrap(ctx, s, w); }
  const IS_TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(hover:none),(pointer:coarse)').matches;
  const HAND = ['...##...', '...##...', '...####.', '.#######', '########', '.#######', '..######', '...####.'];
  const RUNNER = ['....##..', '....##..', '..####..', '.#.##.#.', '...##...', '..#..#..', '.#....#.', '#......#'];
  function pxIcon(ctx, pat, x, y, s, c) { ctx.fillStyle = c; pat.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') ctx.fillRect(Math.round(x + i * s), Math.round(y + j * s), s, s); })); }
  const svgIcon = (pat, c) => '<svg viewBox="0 0 8 8" width="26" height="26" shape-rendering="crispEdges" aria-hidden="true">' + pat.map((row, j) => [...row].map((ch, i) => ch === '#' ? `<rect x="${i}" y="${j}" width="1" height="1" fill="${c}"/>` : '').join('')).join('') + '</svg>';
  // кнопка «действие»: на компьютере — клавиша E, на телефоне — иконка руки (как на экранной кнопке)
  function actGlyph(ctx, cx, y, color) { if (IS_TOUCH) pxIcon(ctx, HAND, cx - 8, y - 3, 2, color); else txt(ctx, 'E', cx, y, 10, color, FONT, 'center'); }
  const inRect = (p, x, y, w, h) => p && p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;

  // общий выбор из вариантов (используют chat, choice, quiz)
  function optionsUI(ctx, m, opts, y0, inp) {
    const h = 30, gap = 8, w = 440, x = (W - w) / 2;
    if (inp.left) m.sel = (m.sel + opts.length - 1) % opts.length;
    if (inp.right) m.sel = (m.sel + 1) % opts.length;
    let picked = -1;
    opts.forEach((o, i) => {
      const y = y0 + i * (h + gap);
      if (inp.tap && inRect(inp.tap, x, y, w, h)) { picked = i; m.sel = i; }
      if (ctx) { P(ctx, i === m.sel ? '#F4C430' : '#1E1E2E', x, y, w, h); P(ctx, i === m.sel ? '#12121C' : '#2E2E46', x + 2, y + 2, w - 4, h - 4);
        txt(ctx, (i === m.sel ? '▶ ' : '  ') + o, x + 10, y + 8, 13, i === m.sel ? '#F4C430' : '#EDE4CF'); }
    });
    if (inp.act && picked < 0) picked = m.sel;
    return picked;
  }

  // 1) Переписка в мессенджере
  MG.chat = {
    init(m) { m.log = []; m.i = 0; m.timer = 600; m.sel = 0; },
    update(m, inp, api) {
      const s = m.script[m.i];
      if (!s) { if (inp.act || inp.tap) m.done = true; return; }
      if (s.choose) { m.wait = true; return; }
      m.timer -= 16.7;
      if (m.timer <= 0 || inp.act) { m.log.push(s); m.i++; m.timer = 1100; }
    },
    draw(ctx, m, inp, api) {
      P(ctx, 'rgba(10,10,16,.75)', 0, 0, W, H);
      const x = 170, y = 14, w = 300, h = 332;
      P(ctx, '#2A2A33', x - 8, y - 8, w + 16, h + 16); P(ctx, '#F4F1EA', x, y, w, h);
      P(ctx, '#7A5CFF', x, y, w, 34); txt(ctx, m.app || 'Чат', x + 12, y + 10, 12, '#FFFFFF', FONT);
      const partner = api.hero(m.partner);
      txt(ctx, partner ? partner.name : '', x + w - 12, y + 12, 12, '#FFFFFF', MONO, 'right');
      // сообщения снизу вверх
      let cy = y + h - 12 - (m.script[m.i] && m.script[m.i].choose ? 0 : 0);
      const rows = [];
      m.log.forEach(s => { const lines = wrapLines(ctx, s.text, 190, 12); rows.push({ s, lines, hh: lines.length * 16 + 12 }); });
      for (let k = rows.length - 1; k >= 0 && cy > y + 44; k--) {
        const r = rows[k], me = r.s.from === 'me', sys = r.s.from === 'sys', bw = Math.min(210, Math.max(...r.lines.map(l => ctx.measureText(l).width)) + 20);
        cy -= r.hh + 6; if (cy < y + 40) break;
        const bx = sys ? x + (w - bw) / 2 : me ? x + w - bw - 10 : x + 10;
        P(ctx, sys ? '#E3D6B5' : me ? '#7A5CFF' : '#FFFFFF', bx, cy, bw, r.hh); if (!me && !sys) { P(ctx, '#D9D3C0', bx, cy + r.hh, bw, 2); }
        r.lines.forEach((l, j) => txt(ctx, l, bx + 10, cy + 6 + j * 16, 12, me ? '#FFFFFF' : '#2A2420'));
      }
      const s = m.script[m.i];
      if (s && s.choose) {
        P(ctx, 'rgba(16,16,26,.92)', 0, 250, W, 110);
        txt(ctx, 'Что ответить?', W / 2, 256, 10, '#F4C430', FONT, 'center');
        const pick = optionsUI(ctx, m, s.choose, 274, inp);
        if (pick >= 0) { m.log.push({ from: 'me', text: s.choose[pick] }); m.i++; m.timer = 900; m.sel = 0; }
      } else if (!s && Math.floor(api.t / 450) % 2) txt(ctx, 'НАЖМИ, ЧТОБЫ ПРОДОЛЖИТЬ', W / 2, 352 - 14, 9, '#EDE4CF', FONT, 'center');
    }
  };

  // 2) Выбор (несколько раундов), после каждого — ответ-реплика
  MG.choice = {
    init(m) { m.r = 0; m.sel = 0; },
    update(m, inp, api) { },
    draw(ctx, m, inp, api) {
      P(ctx, 'rgba(10,10,16,.72)', 0, 0, W, H);
      const R = m.rounds[m.r]; if (!R) { m.done = true; return; }
      box(ctx, 90, 40, 460, 64); txt(ctx, m.title || '', W / 2, 52, 10, '#F4C430', FONT, 'center');
      wrapLines(ctx, R.q, 420, 14).slice(0, 2).forEach((l, j) => txt(ctx, l, W / 2, 72 + j * 16, 14, '#EDE4CF', MONO, 'center'));
      const pick = optionsUI(ctx, m, R.options.map(o => o.text || o), 130, inp);
      if (pick >= 0) { const o = R.options[pick]; m.r++; m.sel = 0; api.say(o.reply || [], null); }
    }
  };

  // 3) Квиз: вопросы с вариантами, проиграть нельзя
  MG.quiz = {
    init(m) { m.q = 0; m.sel = 0; m.score = 0; },
    update() { },
    draw(ctx, m, inp, api) {
      P(ctx, 'rgba(10,10,16,.78)', 0, 0, W, H);
      const Q = m.questions[m.q]; if (!Q) { m.done = true; return; }
      box(ctx, 70, 30, 500, 84); txt(ctx, (m.title || 'Квиз') + '  ' + (m.q + 1) + '/' + m.questions.length, W / 2, 40, 10, '#F4C430', FONT, 'center');
      wrapLines(ctx, Q.q, 470, 14).slice(0, 3).forEach((l, j) => txt(ctx, l, W / 2, 62 + j * 17, 14, '#EDE4CF', MONO, 'center'));
      const pick = optionsUI(ctx, m, Q.a, 136, inp);
      if (pick >= 0) {
        const ok = pick === (Q.right || 0); if (ok) m.score++;
        m.q++; m.sel = 0;
        api.say([{ who: m.who || 'narrator', text: ok ? (Q.ok || 'Верно!') : ('Почти! ' + (Q.no || ('Правильно: ' + Q.a[Q.right || 0]))) }], null);
      }
      txt(ctx, 'Верно: ' + m.score, W / 2, 330, 10, '#8FB25A', FONT, 'center');
    }
  };

  // 4) Поймай: предметы падают, герой ловит
  const ITEMS = {
    coin: (ctx, x, y) => { P(ctx, '#B8892E', x - 7, y - 7, 14, 14); P(ctx, '#F2C46B', x - 5, y - 5, 10, 10); P(ctx, '#FFF2B0', x - 3, y - 4, 3, 3); },
    popcorn: (ctx, x, y) => { P(ctx, '#FFF6D8', x - 6, y - 5, 12, 10); P(ctx, '#F2E3A0', x - 4, y - 7, 8, 4); P(ctx, '#E8C547', x - 2, y + 2, 4, 3); },
    bill: (ctx, x, y) => { P(ctx, '#C9DCE3', x - 9, y - 6, 18, 12); P(ctx, '#C0593A', x - 6, y - 3, 12, 2); P(ctx, '#C0593A', x - 6, y + 1, 8, 2); },
    heart: (ctx, x, y) => PX.drawHeart(ctx, x, y, 3)
  };
  MG.catch = {
    init(m, api) { m.x = W / 2; m.items = []; m.got = 0; m.time = (m.time || 20) * 1000; m.spawn = 0; m.rnd = rng(77); },
    update(m, inp, api) {
      if (inp.leftHeld) m.x -= 5; if (inp.rightHeld) m.x += 5; if (inp.tapX != null) m.x += Math.sign(inp.tapX - m.x) * Math.min(6, Math.abs(inp.tapX - m.x));
      m.x = clamp(m.x, 30, W - 30);
      m.time -= 16.7; m.spawn -= 16.7;
      if (m.spawn <= 0) { const bad = m.bad && m.rnd() < 0.25; m.items.push({ x: 30 + m.rnd() * (W - 60), y: -10, v: 2 + m.rnd() * 2, bad }); m.spawn = 520; }
      m.items.forEach(it => { it.y += it.v; if (!it.hit && it.y > GROUND - 70 && it.y < GROUND - 20 && Math.abs(it.x - m.x) < 28) { it.hit = true; if (it.bad) m.got = Math.max(0, m.got - 1); else m.got++; } });
      m.items = m.items.filter(it => !it.hit && it.y < H + 10);
      if (m.got >= m.goal || m.time <= 0) m.done = true;
    },
    draw(ctx, m, inp, api) {
      P(ctx, 'rgba(10,10,16,.6)', 0, 0, W, H);
      m.items.forEach(it => (ITEMS[it.bad ? m.bad : m.item] || ITEMS.coin)(ctx, it.x, it.y));
      PX.drawPose(ctx, api.player, 2, Math.round(m.x - PX.CX * 2), GROUND - PX.FOOT * 2, 'front', { armF: 'up', armB: 'up', mouth: 'smile' }, false);
      box(ctx, 140, 14, 360, 46); txt(ctx, m.title || 'Поймай!', W / 2, 22, 10, '#F4C430', FONT, 'center');
      txt(ctx, (m.hint || '') + '  ' + m.got + '/' + m.goal + '  ·  ' + Math.ceil(Math.max(0, m.time) / 1000) + ' с', W / 2, 40, 12, '#EDE4CF', MONO, 'center');
    }
  };

  // 5) Почини серверы: мигающая стойка → выбери и нажми
  MG.whack = {
    init(m) { m.cur = 0; m.red = 2; m.fixed = 0; m.cool = 1400; m.ok = []; m.rnd = rng(9); },
    update(m, inp) {
      if (inp.left) m.cur = (m.cur + 5) % 6; if (inp.right) m.cur = (m.cur + 1) % 6;
      let hit = -1;
      for (let i = 0; i < 6; i++) if (inp.tap && inRect(inp.tap, 70 + i * 86, 120, 70, 150)) { hit = i; m.cur = i; }
      if (inp.act) hit = m.cur;
      if (hit >= 0 && hit === m.red) { m.fixed++; m.ok.push({ i: hit, t: 500 }); m.red = -1; m.cool = 500; }
      m.cool -= 16.7; m.ok.forEach(o => o.t -= 16.7); m.ok = m.ok.filter(o => o.t > 0);
      if (m.cool <= 0) { let r; do { r = Math.floor(m.rnd() * 6); } while (r === m.cur && m.rnd() < 0.5); m.red = r; m.cool = 1800; }
      if (m.fixed >= m.goal) m.done = true;
    },
    draw(ctx, m, inp, api) {
      P(ctx, 'rgba(10,10,16,.8)', 0, 0, W, H);
      box(ctx, 140, 20, 360, 46); txt(ctx, m.title || 'Почини серверы', W / 2, 28, 10, '#F4C430', FONT, 'center');
      txt(ctx, 'Выбери мигающий сервер и нажми · ' + m.fixed + '/' + m.goal, W / 2, 46, 12, '#EDE4CF', MONO, 'center');
      for (let i = 0; i < 6; i++) {
        const x = 70 + i * 86, y = 120, red = i === m.red, ok = m.ok.some(o => o.i === i);
        P(ctx, i === m.cur ? '#F4C430' : '#3A3A46', x - 4, y - 4, 78, 158); P(ctx, '#2A2A33', x, y, 70, 150);
        for (let r = 0; r < 6; r++) { P(ctx, '#3A3A46', x + 6, y + 8 + r * 23, 58, 16); P(ctx, red && Math.floor(api.t / 200) % 2 ? '#E63946' : ok ? '#6FE38A' : ((r + i + Math.floor(api.t / 500)) % 3 ? '#6FE38A' : '#2A5A36'), x + 10, y + 14 + r * 23, 5, 4); }
        if (red) txt(ctx, '!', x + 35, y - 26, 14, '#E63946', FONT, 'center');
      }
    }
  };

  // 6) Влог на экшен-камеру: повтори кнопку — герои кривляются
  const POSE_KEYS = [['left', '◀', 'wave'], ['right', '▶', 'dance'], ['act', 'E', 'joy']];
  MG.poses = {
    init(m) { m.k = 0; m.score = 0; m.need = 0; m.anim = null; m.animT = 0; m.rnd = rng(5); m.need = Math.floor(m.rnd() * 3); m.msg = ''; },
    update(m, inp) {
      if (m.animT > 0) { m.animT -= 16.7; return; }
      let got = -1;
      if (inp.left) got = 0; else if (inp.right) got = 1; else if (inp.act) got = 2;
      if (inp.tap) for (let i = 0; i < 3; i++) if (inRect(inp.tap, 200 + i * 90, 300, 70, 46)) got = i;
      if (got < 0) return;
      if (got === m.need) { m.score++; m.anim = POSE_KEYS[got][2]; m.animT = 900; m.msg = ['Огонь!', 'Ахах, класс!', 'Это в историю!', 'Ещё!'][m.score % 4]; m.need = Math.floor(m.rnd() * 3); if (m.score >= m.rounds) { m.animT = 1100; m.finish = true; } }
      else m.msg = 'Не та кнопка — ещё раз!';
    },
    draw(ctx, m, inp, api) {
      if (m.finish && m.animT <= 0) { m.done = true; return; }
      P(ctx, 'rgba(10,10,16,.82)', 0, 0, W, H);
      box(ctx, 150, 6, 340, 22); txt(ctx, (m.title || 'Влог') + '  ' + m.score + '/' + m.rounds, W / 2, 12, 9, '#F4C430', FONT, 'center');
      P(ctx, '#EDE4CF', 150, 40, 340, 4); P(ctx, '#EDE4CF', 150, 236, 340, 4); P(ctx, '#EDE4CF', 150, 40, 4, 200); P(ctx, '#EDE4CF', 486, 40, 4, 200);
      if (Math.floor(api.t / 500) % 2) { P(ctx, '#E63946', 166, 54, 10, 10); txt(ctx, 'REC', 182, 54, 10, '#E63946', FONT); }
      const an = m.animT > 0 ? m.anim : 'idle';
      if (api.partner === api.player || !api.partner) PX.drawAnim(ctx, an, api.player, null, api.t, 3, 320, 232);
      else { PX.drawAnim(ctx, an, api.player, null, api.t, 3, 272, 232); PX.drawAnim(ctx, an, api.partner, null, api.t + 300, 3, 368, 232, { flip: true }); }
      if (m.msg) txt(ctx, m.msg, W / 2, 250, 13, '#F4C430', MONO, 'center');
      for (let i = 0; i < 3; i++) { const on = i === m.need && m.animT <= 0; P(ctx, on ? '#F4C430' : '#2E2E46', 200 + i * 90, 300, 70, 46); if (i === 2) actGlyph(ctx, 235 + i * 90, 318, on ? '#12121C' : '#A8B2C1'); else txt(ctx, POSE_KEYS[i][1], 235 + i * 90, 314, 16, on ? '#12121C' : '#A8B2C1', FONT, 'center'); }
      txt(ctx, 'Жми подсвеченную кнопку', W / 2, 284, 11, '#EDE4CF', MONO, 'center');
    }
  };

  // 7) Примерка: листай варианты, подруга советует
  MG.tryon = {
    init(m) { m.i = 0; m.tries = 0; },
    update(m, inp, api) {
      const n = m.options.length;
      if (inp.left) m.i = (m.i + n - 1) % n; if (inp.right) m.i = (m.i + 1) % n;
      if (inp.tap) { if (inRect(inp.tap, 120, 140, 60, 60)) m.i = (m.i + n - 1) % n; else if (inRect(inp.tap, 460, 140, 60, 60)) m.i = (m.i + 1) % n; else if (inRect(inp.tap, 250, 300, 140, 40)) inp.act = true; }
      if (inp.act) {
        m.tries++;
        if (m.tries >= (m.acceptAfter || 3)) { m.result = m.options[m.i]; api.say([{ who: m.adviser, text: (m.yes || 'Вот! Эти.') }], () => { m.done = true; }); }
        else api.say([{ who: m.adviser, text: (m.no || ['Нет, не то.'])[(m.tries - 1) % (m.no || ['Нет']).length] }], null);
      }
    },
    draw(ctx, m, inp, api) {
      P(ctx, 'rgba(10,10,16,.78)', 0, 0, W, H);
      box(ctx, 160, 18, 320, 40); txt(ctx, m.title || 'Примерка', W / 2, 30, 10, '#F4C430', FONT, 'center');
      const o = m.options[m.i], look = Object.assign({}, api.player, o.patch || {});
      P(ctx, '#BFD8E0', 220, 66, 200, 220); P(ctx, '#8A8270', 216, 62, 208, 4);
      ctx.save(); ctx.beginPath(); ctx.rect(220, 66, 200, 220); ctx.clip();
      PX.drawPose(ctx, look, 7, Math.round(320 - PX.CX * 7), 86, 'front', { mouth: 'smile' }, false, false);
      ctx.restore(); P(ctx, 'rgba(255,255,255,.18)', 232, 76, 10, 120);
      P(ctx, '#2E2E46', 120, 140, 60, 60); txt(ctx, '◀', 150, 160, 18, '#EDE4CF', FONT, 'center');
      P(ctx, '#2E2E46', 460, 140, 60, 60); txt(ctx, '▶', 490, 160, 18, '#EDE4CF', FONT, 'center');
      txt(ctx, o.name || '', W / 2, 290, 12, '#EDE4CF', MONO, 'center');
      P(ctx, '#F4C430', 250, 308, 140, 34); txt(ctx, 'Примерить', W / 2, 320, 10, '#12121C', FONT, 'center');
    }
  };

  // 8) Собери по порядку (например, донер)
  MG.assemble = {
    init(m) { m.k = 0; m.sel = 0; m.rnd = rng(3); m.order = m.steps.map((s, i) => i).sort(() => m.rnd() - 0.5); m.msg = ''; },
    update() { },
    draw(ctx, m, inp, api) {
      P(ctx, 'rgba(10,10,16,.78)', 0, 0, W, H);
      box(ctx, 140, 18, 360, 46); txt(ctx, m.title || 'Собери', W / 2, 26, 10, '#F4C430', FONT, 'center');
      txt(ctx, m.k < m.steps.length ? 'Следующий шаг?' : 'Готово!', W / 2, 44, 12, '#EDE4CF', MONO, 'center');
      // сборка
      const layers = ['#E8D2A0', '#9E5A2E', '#6E9145', '#EDE4CF', '#C9A36E', '#C0593A'];
      for (let i = 0; i < m.k; i++) P(ctx, layers[i % layers.length], 260 - (i === 0 ? 0 : -10), 200 - i * 12, 120 - (i === 0 ? 0 : 20), i === 0 ? 30 : 12);
      if (m.msg) txt(ctx, m.msg, W / 2, 236, 12, '#F4C430', MONO, 'center');
      if (m.k >= m.steps.length) { if (inp.act || inp.tap) m.done = true; if (Math.floor(api.t / 450) % 2) txt(ctx, 'НАЖМИ, ЧТОБЫ ПРОДОЛЖИТЬ', W / 2, 330, 9, '#EDE4CF', FONT, 'center'); return; }
      const labels = m.order.map(i => m.steps[i]);
      const w = 120, x0 = (W - labels.length * (w + 8)) / 2;
      if (inp.left) m.sel = (m.sel + labels.length - 1) % labels.length; if (inp.right) m.sel = (m.sel + 1) % labels.length;
      let pick = -1;
      labels.forEach((l, i) => { const x = x0 + i * (w + 8), y = 280; if (inp.tap && inRect(inp.tap, x, y, w, 40)) pick = i; P(ctx, i === m.sel ? '#F4C430' : '#2E2E46', x, y, w, 40); txt(ctx, l, x + w / 2, y + 13, 12, i === m.sel ? '#12121C' : '#EDE4CF', MONO, 'center'); });
      if (inp.act && pick < 0) pick = m.sel;
      if (pick >= 0) { if (m.order[pick] === m.k) { m.k++; m.msg = ''; } else m.msg = 'Сначала: ' + m.steps[m.k].toLowerCase(); }
    }
  };

  /* ---------------- запуск игры ---------------- */
  function start(container, game, opts = {}) {
    const baseHeroes = {}; (game.heroes || []).forEach(h => baseHeroes[h.id] = h);
    let heroes = baseHeroes, playerHero, partnerHero, extraPatch = {}, persist = {};   // persist — то, что остаётся до конца игры (выбранные очки)
    function applyPatch(patch) {
      heroes = {};
      Object.keys(baseHeroes).forEach(id => { heroes[id] = Object.assign({}, baseHeroes[id], patch && patch[id] || {}, persist[id] || {}, extraPatch[id] || {}); });
      playerHero = heroes[game.player] || heroes[(game.heroes[0] || {}).id];
      partnerHero = heroes[game.partner] || heroes[(game.heroes[1] || game.heroes[0] || {}).id];
    }
    applyPatch(null);
    const pId = playerHero.id, partId = partnerHero.id;
    const chapters = (game.levels || []).map((L, i) => toChapter(Object.assign({}, L, { theme: THEMES[L.theme] ? L.theme : THEME_NAMES[i % 3] }), i, pId, partId, partnerHero.name));
    const totalMem = chapters.reduce((n, c) => n + c.script.filter(s => s.memory).length, 0);

    container.innerHTML = '';
    container.classList.add('phg');
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; container.appendChild(canvas);
    const mainCtx = canvas.getContext('2d'); mainCtx.imageSmoothingEnabled = false;
    let ctx = mainCtx;
    const eight = /8/.test(game.style || '');
    const off = document.createElement('canvas'); off.width = W / 2; off.height = H / 2;
    const offCtx = off.getContext('2d'); offCtx.imageSmoothingEnabled = false; offCtx.scale(0.5, 0.5);
    function worldBegin() { ctx = eight ? offCtx : mainCtx; ctx.imageSmoothingEnabled = false; }
    function worldEnd() { if (eight) { mainCtx.imageSmoothingEnabled = false; mainCtx.drawImage(off, 0, 0, W, H); } ctx = mainCtx; }
    chapters.forEach(L => { if (L.photo) { const im = new Image(); im.src = L.photo; L._img = im; } });
    const ui = document.createElement('div'); ui.className = 'phg-ui';
    ui.innerHTML = '<button class="phg-x" type="button" aria-label="Выйти из полноэкранного режима">✕</button>'
      + '<button class="phg-start" type="button"><span>▶ ИГРАТЬ</span><small>откроется на весь экран</small></button>'
      + '<div class="phg-touch"><div class="phg-pad"><button data-k="left" aria-label="Влево">◀</button><button data-k="right" aria-label="Вправо">▶</button></div>'
      + '<div class="phg-ab"><button data-k="run" aria-label="Бег">' + svgIcon(RUNNER, '#F1FAEE') + '<small>БЕГ</small></button>'
      + '<button data-k="act" aria-label="Действие">' + svgIcon(HAND, '#12121C') + '<small>ДЕЙСТВИЕ</small></button></div></div>';
    container.appendChild(ui);

    // ---- ввод: ← → идти, A / E / пробел / Enter — действие; тап по экрану — выбор в мини-играх
    const keys = { left: false, right: false, act: false, run: false }, edge = { left: false, right: false, act: false, run: false };
    let tap = null, tapX = null;
    const map = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'act', Enter: 'act', KeyE: 'act', KeyZ: 'act', KeyX: 'act', ArrowUp: 'act', KeyW: 'act', ShiftLeft: 'run', ShiftRight: 'run' };
    function press(k, v) { if (v && !keys[k]) edge[k] = true; keys[k] = v; }
    const typing = e => e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable);
    const kd = e => { if (typing(e)) return; const k = map[e.code]; if (k) { e.preventDefault(); press(k, true); } };
    const ku = e => { const k = map[e.code]; if (k) press(k, false); };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    ui.querySelectorAll('[data-k]').forEach(b => {
      const k = b.dataset.k;
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); press(k, true); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, () => press(k, false)));
    });
    const toCanvas = e => {
      const r = canvas.getBoundingClientRect();
      if (container.classList.contains('rot')) return { x: (e.clientY - r.top) * W / r.height, y: (r.right - e.clientX) * H / r.width };   // экран повёрнут на 90°
      return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
    };

    // ---- телефон: игра на весь экран и сразу горизонтально ----
    let full = false;
    function layout() {
      if (!full) { canvas.style.width = canvas.style.height = ''; container.classList.remove('rot'); return; }
      const rot = innerHeight > innerWidth;           // телефон держат вертикально и повернуть экран нельзя — поворачиваем игру сами
      container.classList.toggle('rot', rot);
      const w = rot ? innerHeight : innerWidth, h = rot ? innerWidth : innerHeight, cw = Math.min(w, h * 16 / 9);
      canvas.style.width = Math.floor(cw) + 'px'; canvas.style.height = Math.floor(cw * 9 / 16) + 'px';
    }
    function enterFull() {
      if (full) return;
      full = true; container.classList.add('full'); document.documentElement.classList.add('phg-lock');
      const fs = container.requestFullscreen || container.webkitRequestFullscreen;
      try {
        const pr = fs && fs.call(container, { navigationUI: 'hide' });
        const lock = () => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').then(layout, () => {}); } catch (e) { } };
        if (pr && pr.then) pr.then(lock, () => {}); else lock();
      } catch (e) { }
      layout(); setTimeout(layout, 300);
    }
    function exitFull() {
      if (!full) return;
      full = false; container.classList.remove('full', 'rot'); document.documentElement.classList.remove('phg-lock');
      try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { }
      layout();
    }
    const onFs = () => { if (!document.fullscreenElement && !document.webkitFullscreenElement && full) exitFull(); };
    const onResize = () => { layout(); setTimeout(layout, 250); };
    addEventListener('resize', onResize); addEventListener('orientationchange', onResize);
    document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
    ui.querySelector('.phg-start').addEventListener('click', e => { e.preventDefault(); enterFull(); });
    ui.querySelector('.phg-x').addEventListener('click', e => { e.preventDefault(); exitFull(); });
    canvas.addEventListener('pointerdown', e => { if (IS_TOUCH && !full) { enterFull(); return; } const p = toCanvas(e); tap = p; tapX = p.x; });
    canvas.addEventListener('pointermove', e => { if (e.buttons) tapX = toCanvas(e).x; });
    canvas.addEventListener('pointerup', () => { tapX = null; });

    // ---- состояние
    let state = game.card ? 'card' : 'title', ci = 0, ch = null, step = 0, cam = 0, collected = 0, banner = 0, dlg = null, t = 0, finaleChars = 0;
    let mg = null, fade = null, goal = null;
    const pl = { x: 120, flip: false, walk: 0, moving: false };
    let actors = {}, props = [];

    function say(lines, done) { dlg = { lines: (lines || []).filter(l => l && l.text), i: 0, chars: 0, done }; if (!dlg.lines.length) { dlg = null; done && done(); } }
    function who(id) { if (id === 'memory') return { name: 'ВОСПОМИНАНИЕ' }; if (id === 'narrator') return { name: '' }; return heroes[id] || null; }
    const api = { say, hero: id => heroes[id], get player() { return playerHero; }, get partner() { return partnerHero; }, get t() { return t; } };

    function loadChapter(i) {
      ci = i; ch = chapters[i]; step = 0; extraPatch = {}; applyPatch(ch.patch);
      pl.x = ch.startX || 110; pl.flip = false; cam = 0; goal = null; mg = null; fade = null;
      props = (ch.props || []).map(p => Object.assign({}, p));
      actors = {}; (ch.actors || []).forEach(a => { actors[a.id] = Object.assign({ x: 600, show: true, flip: true, mode: 'idle' }, a); });
      state = 'banner'; banner = 140;
    }
    function nextChapter() { if (ci + 1 < chapters.length) loadChapter(ci + 1); else { extraPatch = {}; applyPatch(game.finale && game.finale.patch); state = 'finale'; finaleChars = 0; } }
    const findTarget = id => props.find(p => p.id === id) || (actors[id] && actors[id].show ? actors[id] : null);

    // выполнение сценария: шаг за шагом
    function runStep() {
      while (true) {
        const s = ch.script[step];
        if (!s) { nextChapter(); return; }
        if (s.say) { step++; say(s.say, runStep); return; }
        if (s.memory) { step++; collected++; say([{ who: s.who || 'memory', text: s.memory }], runStep); return; }
        if (s.fade) { step++; fade = { text: s.fade, t: 2600 }; return; }
        if (s.mini) { mg = Object.assign({ type: s.mini }, s); (MG[s.mini].init || (() => {}))(mg, api); return; }
        if (s.goal) { goal = s; return; }
        if (s.patch) { Object.keys(s.patch).forEach(id => { extraPatch[id] = Object.assign({}, extraPatch[id], s.patch[id]); }); applyPatch(ch.patch); step++; continue; }
        if (s.take) { props = props.filter(p => p.id !== s.take); step++; continue; }
        if (s.actor) {
          const a = actors[s.actor] || (actors[s.actor] = { id: s.actor, x: pl.x + 200, show: false, flip: true, mode: 'idle' });
          ['show', 'x', 'flip', 'mode', 'to', 'emote', 'speed'].forEach(k => { if (k in s) a[k] = s[k]; });
          step++;
          if (s.wait && s.to != null) { a.waitStep = true; return; }
          continue;
        }
        step++;
      }
    }

    function update() {
      t += 16.7;
      const inp = { left: edge.left, right: edge.right, act: edge.act, leftHeld: keys.left, rightHeld: keys.right, tap, tapX };
      edge.left = edge.right = edge.act = false; tap = null;
      if (dlg) {
        const line = dlg.lines[dlg.i];
        if (dlg.chars < line.text.length) dlg.chars += 1.4;
        if (inp.act || inp.tap) {
          if (dlg.chars < line.text.length) dlg.chars = line.text.length;
          else if (++dlg.i >= dlg.lines.length) { const d = dlg.done; dlg = null; d && d(); } else dlg.chars = 0;
        }
        return;
      }
      if (state === 'card' || state === 'title') { if (inp.act || inp.tap) { if (state === 'card') state = 'title'; else loadChapter(0); } return; }
      if (state === 'banner') { if (--banner <= 0 || inp.act || inp.tap) { state = 'play'; runStep(); } return; }
      if (state === 'finale') { const len = (game.finale && game.finale.letter || '').length; if (finaleChars < len) finaleChars += 0.8; if ((inp.act || inp.tap) && finaleChars >= len) { state = 'title'; collected = 0; extraPatch = {}; persist = {}; applyPatch(null); } else if (inp.act || inp.tap) finaleChars = len; return; }
      if (state !== 'play') return;
      if (fade) { fade.t -= 16.7; if (fade.t <= 0 || ((inp.act || inp.tap) && fade.t < 2000)) { fade = null; runStep(); } return; }
      if (mg) { MG[mg.type].update(mg, inp, api); const q = mg._inp; mg._inp = q ? { left: q.left || inp.left, right: q.right || inp.right, act: q.act || inp.act, tap: q.tap || inp.tap, leftHeld: inp.leftHeld, rightHeld: inp.rightHeld, tapX: inp.tapX } : inp; if (mg.done) { const done = mg; mg = null; if (done.result && done.result.patch) { persist[pId] = Object.assign({}, persist[pId], done.result.patch); applyPatch(ch.patch); } step++; runStep(); } return; }

      // актёры
      Object.values(actors).forEach(a => {
        if (a.mode === 'follow') { const tx = pl.x - (pl.flip ? -54 : 54); if (Math.abs(a.x - tx) > 6) { a.x += Math.sign(tx - a.x) * Math.min(Math.abs(tx - a.x), (pl.sp || 2.6) + .4); a.flip = tx < a.x; a.moving = true; } else { a.moving = false; a.flip = pl.flip; } }
        else if (a.to != null) { const sp = a.mode === 'run' ? 6 : 2.6; if (Math.abs(a.x - a.to) > sp) { a.x += Math.sign(a.to - a.x) * sp; a.flip = a.to < a.x; a.moving = true; } else { a.x = a.to; a.to = null; a.moving = false; if (a.waitStep) { a.waitStep = false; runStep(); } } }
      });
      if (Object.values(actors).some(a => a.waitStep)) return;   // ждём, пока актёр дойдёт

      // ходьба
      const sp = keys.run ? 4.6 : 2.6; pl.sp = sp;
      pl.moving = false;
      if (keys.left || (tapX != null && tapX + cam < pl.x - 10 && !goalTapped(inp))) { pl.x -= sp; pl.flip = true; pl.moving = true; }
      else if (keys.right || (tapX != null && tapX + cam > pl.x + 10 && !goalTapped(inp))) { pl.x += sp; pl.flip = false; pl.moving = true; }
      pl.x = clamp(pl.x, 30, ch.width - 30);
      if (pl.moving) pl.walk += sp; pl.running = pl.moving && keys.run;

      // цель
      if (goal) {
        const tg = goal.at || goal.near ? findTarget(goal.at || goal.near) : null;
        const tx = goal.toX != null ? goal.toX : tg ? tg.x : null;
        const near = tx != null && Math.abs(pl.x - tx) < (goal.near ? (goal.dist || 220) : 48);
        const reached = goal.toX != null ? pl.x >= goal.toX - 10 : goal.near ? near : (near && (inp.act || (inp.tap && Math.abs(inp.tap.x + cam - tx) < 60)));
        if (reached) { goal = null; step++; runStep(); }
      }
      cam = clamp(pl.x - W * 0.45, 0, Math.max(0, ch.width - W));
    }
    function goalTapped(inp) { return false; }

    function drawDialog() {
      const line = dlg.lines[dlg.i], h = who(line.who), x = 16, y = H - 108, w = W - 32;
      P(ctx, '#EDE4CF', x - 4, y - 4, w + 8, 100); P(ctx, '#12121C', x, y, w, 92);
      let tx = x + 16;
      if (h && h.skin) { P(ctx, '#2E2E46', x + 10, y + 10, 72, 72); drawHead(ctx, h, x + 10, y + 12, 3); tx = x + 96; }
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      if (h && h.name) { ctx.fillStyle = '#F4C430'; ctx.font = '10px ' + FONT; ctx.fillText(h.name.toUpperCase() + ':', tx, y + 12); }
      ctx.fillStyle = line.who === 'narrator' ? '#C9C2AE' : '#EDE4CF'; ctx.font = (line.who === 'narrator' ? 'italic ' : '') + '14px ' + MONO;
      wrap(ctx, line.text.slice(0, Math.floor(dlg.chars)), x + w - tx - 16).slice(0, 3).forEach((l, i) => ctx.fillText(l, tx, y + (h && h.name ? 32 : 18) + i * 18));
      if (dlg.chars >= line.text.length && Math.floor(t / 400) % 2) { ctx.fillStyle = '#F4C430'; ctx.fillText('▼', x + w - 24, y + 70); }
    }
    function centerText(s, y, size, color, font) { ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = color; ctx.font = size + 'px ' + (font || FONT); ctx.fillText(s, W / 2, y); }

    function drawActor(a) {
      if (!a.show) return;
      const h = heroes[a.id]; if (!h) return;
      const sx = a.x - cam; if (sx < -60 || sx > W + 60) return;
      if (a.mode === 'run' && a.moving) PX.drawAnim(ctx, 'walk_run', h, null, t, 2, sx, GROUND, { flip: a.flip });
      else if (a.moving) PX.drawPose(ctx, h, 2, Math.round(sx - PX.CX * 2), GROUND - PX.FOOT * 2, 'side', PX.animFrame(h.walk || 'walk_normal', t), a.flip);
      else if (a.mode === 'emote' && a.emote) PX.drawAnim(ctx, a.emote, h, null, t, 2, sx, GROUND, { flip: a.flip });
      else PX.drawAnim(ctx, 'idle', h, null, t + 400, 2, sx, GROUND, { flip: a.flip });
    }

    function draw() {
      worldBegin();
      if (state === 'card') {
        drawBackground(ctx, THEMES.night, t / 20, t); worldEnd();
        P(ctx, 'rgba(16,16,26,.7)', 0, 0, W, H);
        P(ctx, '#F4C430', 96, 54, 448, 252); P(ctx, '#1E1E2E', 100, 58, 440, 244);
        centerText('ТЕБЕ ПОСЛАНИЕ', 78, 14, '#F4C430');
        ctx.font = '15px ' + MONO; ctx.fillStyle = '#EDE4CF'; ctx.textAlign = 'center';
        wrap(ctx, game.card, 380).slice(0, 7).forEach((l, i) => ctx.fillText(l, W / 2, 116 + i * 22));
        if (game.from) centerText('— ' + game.from, 268, 12, '#A8B2C1', MONO);
        if (Math.floor(t / 500) % 2) centerText('НАЖМИ, ЧТОБЫ ОТКРЫТЬ', 320, 10, '#EDE4CF');
        return;
      }
      if (state === 'title') {
        const th = THEMES[chapters[0] ? chapters[0].theme : 'forest'];
        if (!drawBackground(ctx, th, t / 15, t, 280)) for (let x = 0; x < W; x += T) { P(ctx, th.top, x, 280, T, 8); P(ctx, th.soil, x, 288, T, 72); }
        if (pId === partId) PX.drawAnim(ctx, 'idle', playerHero, null, t, 3, W / 2, 280);
        else { PX.drawAnim(ctx, 'idle', playerHero, null, t, 3, W / 2 - 44, 280); PX.drawAnim(ctx, 'idle', partnerHero, null, t + 700, 3, W / 2 + 44, 280, { flip: true }); }
        worldEnd();
        P(ctx, 'rgba(16,16,26,.72)', 0, 34, W, 110);
        centerText((game.title || 'ИГРА').toUpperCase(), 62, game.title && game.title.length > 18 ? 16 : 24, '#F4C430');
        if (game.subtitle) centerText(game.subtitle, 106, 13, '#EDE4CF', MONO);
        if (Math.floor(t / 500) % 2) { P(ctx, '#12121C', W / 2 - 96, 316, 192, 30); centerText('НАЖМИ СТАРТ', 325, 12, '#EDE4CF'); }
        return;
      }
      if (state === 'finale') {
        drawBackground(ctx, THEMES.night, t / 25, t);
        for (let x = 0; x < W; x += T) { P(ctx, '#3E5E4A', x, 300, T, 8); P(ctx, '#2A2420', x, 308, T, 52); }
        const duo = pId !== partId && (emoteOf(playerHero, ['duo']) || emoteOf(partnerHero, ['duo']));
        if (pId === partId) PX.drawAnim(ctx, emoteOf(playerHero, ['emote']) || 'idle', playerHero, null, t, 3, W / 2, 300);
        else if (duo) PX.drawAnim(ctx, duo, playerHero, partnerHero, t, 3, W / 2, 300);
        else { PX.drawAnim(ctx, 'idle', playerHero, null, t, 3, W / 2 - 40, 300); PX.drawAnim(ctx, 'idle', partnerHero, null, t + 700, 3, W / 2 + 40, 300, { flip: true }); }
        for (let i = 0; i < 12; i++) { const hx = (i * 61 + t / 20) % W, hy = (i * 37 + t / 15) % 300; P(ctx, '#C0593A', hx, hy, 6, 6); }
        worldEnd();
        const F = game.finale || {};
        P(ctx, '#EDE4CF', 76, 24, 488, 196); P(ctx, '#12121C', 80, 28, 480, 188);
        centerText(F.title || 'КОНЕЦ', 44, 14, '#F4C430');
        ctx.font = '14px ' + MONO; ctx.fillStyle = '#EDE4CF'; ctx.textAlign = 'left';
        wrap(ctx, (F.letter || '').slice(0, Math.floor(finaleChars)), 440).slice(0, 7).forEach((l, i) => ctx.fillText(l, 100, 76 + i * 19));
        if (finaleChars >= (F.letter || '').length) {
          if (F.from || game.from) { ctx.textAlign = 'right'; ctx.fillStyle = '#A8B2C1'; ctx.fillText('— ' + (F.from || game.from), 540, 194); }
          if (Math.floor(t / 500) % 2) centerText('ВОСПОМИНАНИЯ: ' + collected + '/' + totalMem + ' · ЕЩЁ РАЗ?', 330, 10, '#EDE4CF');
        }
        return;
      }
      // сцена главы
      const th = THEMES[ch.theme] || THEMES.forest;
      const img = ch._img;
      if (img && img.complete && img.naturalWidth) { ctx.imageSmoothingEnabled = false; ctx.drawImage(img, Math.round(-((cam * 0.15) % (W * 0.25))), 0, Math.round(W * 1.25), 290); P(ctx, 'rgba(16,16,26,.18)', 0, 0, W, 290); }
      const full = !(img && img.complete && img.naturalWidth) && drawBackground(ctx, th, cam, t, GROUND);
      if (!(img && img.complete && img.naturalWidth) && !full) drawBackground(ctx, th, cam, t);
      if (!full) for (let x = -(cam % T); x < W; x += T) { P(ctx, th.top, x, GROUND, T, 8); P(ctx, th.top2, x, GROUND + 8, T, 4); for (let y = GROUND + 12; y < H; y += T) P(ctx, (((x + cam) / T | 0) + (y / T | 0)) % 2 ? th.soil : th.soil2, x, y, T, T); }
      props.forEach(p => { const sx = p.x - cam; if (sx > -90 && sx < W + 90) drawProp(ctx, p, sx, GROUND, t); });
      Object.values(actors).forEach(drawActor);
      // игрок: стоит — лицом к нам, идёт — профиль выбранной походкой
      const px = pl.x - cam;
      if (pl.moving) PX.drawPose(ctx, playerHero, 2, Math.round(px - PX.CX * 2), GROUND - PX.FOOT * 2, 'side', PX.animFrame(pl.running ? 'walk_run' : (playerHero.walk || 'walk_normal'), pl.walk * 18), pl.flip);
      else PX.drawAnim(ctx, 'idle', playerHero, null, t, 2, px, GROUND, { flip: pl.flip });
      if (th.fireflies) for (let i = 0; i < 10; i++) { if (Math.sin(t / 400 + i * 2) > 0) P(ctx, '#F2E3A0', (i * 113 - cam * 0.6 % W + W * 2) % W, 60 + (i * 47) % 160 + Math.sin(t / 600 + i) * 6, 3, 3); }
      if (th.snowfall) for (let i = 0; i < 40; i++) P(ctx, '#FFFFFF', (i * 71 + t / 30 * (1 + i % 3)) % W, (i * 43 + t / 12) % H, 3, 3);
      if (th.leaves) for (let i = 0; i < 14; i++) P(ctx, ['#E0952F', '#C0593A', '#E8C547'][i % 3], (i * 97 + t / 25 + Math.sin(t / 500 + i) * 20 + W * 2) % W, (i * 53 + t / 20) % H, 4, 3);
      // подсказка «действие» над целью
      if (goal && !dlg && !mg) {
        const tg = goal.at || goal.near ? findTarget(goal.at || goal.near) : null;
        const tx = (goal.toX != null ? goal.toX : tg ? tg.x : null);
        if (tx != null) {
          const sx = tx - cam, bob = Math.round(Math.sin(t / 200) * 3);
          if (sx > 10 && sx < W - 10) { if (goal.at && Math.abs(pl.x - tx) < 48) { P(ctx, '#12121C', sx - 14, GROUND - 112 + bob, 28, 24); P(ctx, '#F4C430', sx - 12, GROUND - 110 + bob, 24, 20); actGlyph(ctx, sx, GROUND - 106 + bob, '#12121C'); } else { P(ctx, '#F4C430', sx - 4, GROUND - 106 + bob, 8, 8); P(ctx, '#F4C430', sx - 2, GROUND - 98 + bob, 4, 4); } }
          else { const right = sx >= W - 10; P(ctx, '#F4C430', right ? W - 22 : 10, GROUND - 120, 12, 12); centerTextAt(right ? '▶' : '◀', right ? W - 16 : 16, GROUND - 118, 8, '#12121C'); }
        }
      }
      worldEnd();
      // HUD
      P(ctx, '#12121C', 12, 12, 112, 28);
      const heart = ['.rr.rr.', 'rrwrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
      heart.forEach((row, j) => [...row].forEach((c, i) => { if (c !== '.') { ctx.fillStyle = c === 'w' ? '#EDE4CF' : '#C0593A'; ctx.fillRect(20 + i * 3, 18 + j * 3, 3, 3); } }));
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#F4C430'; ctx.font = '10px ' + FONT; ctx.fillText(String(collected), 48, 21);
      ctx.fillStyle = '#A8B2C1'; ctx.fillText((ci + 1) + '/' + chapters.length, 76, 21);
      if (goal && goal.goal && !dlg && !mg) { ctx.font = '12px ' + MONO; const gw = ctx.measureText('▶ ' + goal.goal).width + 24; P(ctx, '#12121C', W - gw - 12, 12, gw, 28); P(ctx, '#F4C430', W - gw - 12, 38, gw, 2); ctx.fillStyle = '#EDE4CF'; ctx.textAlign = 'left'; ctx.fillText('▶ ' + goal.goal, W - gw, 20); }
      if (mg) { const q = mg._inp || {}; mg._inp = null; MG[mg.type].draw(ctx, mg, q, api); }
      if (fade) { P(ctx, '#0A0A10', 0, 0, W, H); centerText(fade.text, H / 2 - 10, 14, '#EDE4CF'); }
      if (state === 'banner') {
        P(ctx, 'rgba(16,16,26,.85)', 0, 120, W, 100);
        centerText('ГЛАВА ' + (ci + 1), 138, 12, '#A8B2C1');
        centerText((ch.title || '').toUpperCase(), 164, ch.title && ch.title.length > 22 ? 12 : 16, '#F4C430');
        if (ch.place) centerText(ch.place, 196, 13, '#EDE4CF', MONO);
      }
      if (dlg) drawDialog();
    }
    function centerTextAt(s, x, y, size, color) { ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = color; ctx.font = size + 'px ' + FONT; ctx.fillText(s, x, y); }

    let raf, last = performance.now(), accT = 0, alive = true;
    function frame(now) {
      if (!alive) return;
      accT += Math.min(100, now - last); last = now;
      while (accT >= 16.7) { update(); accT -= 16.7; }
      draw(); raf = requestAnimationFrame(frame);
    }
    const fontsReady = document.fonts ? Promise.race([document.fonts.load('12px "Press Start 2P"'), new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
    fontsReady.then(() => { raf = requestAnimationFrame(frame); });

    return {
      info() { return { chapter: ci, state, step, goal: goal && goal.goal, mini: mg && mg.type, dialog: !!dlg }; },
      goto(i) { dlg = null; mg = null; loadChapter(Math.max(0, Math.min(chapters.length - 1, i))); },
      skipMini() { if (mg) mg.done = true; },   // для проверки и админки
      player() { return { x: pl.x, target: goal && (goal.toX != null ? goal.toX : (findTarget(goal.at || goal.near) || {}).x), near: goal && !!goal.near } },
      stop() { alive = false; cancelAnimationFrame(raf); exitFull(); removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('resize', onResize); removeEventListener('orientationchange', onResize); document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('webkitfullscreenchange', onFs); }
    };
  }


  /* стили интерфейса игры (кнопки, масштаб) */
  const css = `.phg{position:relative;width:100%;aspect-ratio:16/9;background:#12121C;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
.phg canvas{width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges}
.phg-ui button{font:12px "Press Start 2P",monospace;color:#F1FAEE;background:rgba(16,16,26,.6);border:3px solid #F1FAEE;cursor:pointer;-webkit-tap-highlight-color:transparent}
.phg-x,.phg-start,.phg-touch{display:none}
.phg-start{position:absolute;inset:0;margin:auto;width:min(260px,70%);height:86px;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:#E63946!important;border-color:#0A0A10!important;box-shadow:6px 6px 0 #3D7DD8}
.phg-start span{font-size:14px}.phg-start small{font:11px "JetBrains Mono",monospace;opacity:.9}
.phg-touch{position:absolute;left:0;right:0;bottom:max(12px,env(safe-area-inset-bottom));padding:0 max(16px,env(safe-area-inset-left));justify-content:space-between;align-items:flex-end;pointer-events:none}
.phg-touch button{pointer-events:auto;width:66px;height:66px;font-size:18px;opacity:.85;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;touch-action:none}
.phg-touch button small{font-size:6px;letter-spacing:.02em}
.phg-pad,.phg-ab{display:flex;gap:12px;align-items:flex-end}
.phg-ab button[data-k=act]{background:rgba(244,196,48,.85);border-color:#0A0A10;color:#12121C;width:76px;height:76px}
.phg-ab button[data-k=run]{background:rgba(61,125,216,.75)}
.phg-x{position:absolute;top:max(8px,env(safe-area-inset-top));right:max(8px,env(safe-area-inset-right));width:42px;height:42px;font-size:14px;z-index:3}
@media (hover:none),(pointer:coarse){.phg:not(.full) .phg-start{display:flex}.phg.full .phg-touch{display:flex}.phg.full .phg-x{display:block}}
.phg.full{position:fixed;left:0;top:0;width:100vw;height:100vh;height:100dvh;aspect-ratio:auto;z-index:10000;background:#000;display:flex;align-items:center;justify-content:center}
.phg.full.rot{width:100vh;height:100vw;width:100dvh;height:100dvw;left:100vw;transform-origin:0 0;transform:rotate(90deg)}
.phg.full canvas{flex:none}
.phg.full,.phg.full.pixel-frame{border:0!important;box-shadow:none!important;margin:0!important;max-width:none!important}
html.phg-lock,html.phg-lock body{overflow:hidden;overscroll-behavior:none}`;
  if (typeof document !== 'undefined' && !document.getElementById('phg-css')) { const st = document.createElement('style'); st.id = 'phg-css'; st.textContent = css; document.head.appendChild(st); }

  // Нарисовать сцену локации без игры (превью на сайте): фон + декор + земля
  function renderScene(ctx, name, t, opt = {}) {
    const th = THEMES[name] || THEMES.forest, gy = opt.ground || 300, cw = ctx.canvas.width, ch = ctx.canvas.height;
    ctx.imageSmoothingEnabled = false;
    const full = drawBackground(ctx, th, opt.cam || 0, t, gy);
    (opt.deco || []).forEach(([type, x]) => drawDeco(ctx, { type }, x, gy, t));
    if (!full) for (let x = 0; x < cw; x += T) {
      P(ctx, th.top, x, gy, T, 8); P(ctx, th.top2, x, gy + 8, T, 4); P(ctx, (x / T) % 2 ? th.top : th.top2, x + 4, gy - 4, 4, 4);
      for (let y = gy + 12; y < ch; y += T) P(ctx, ((x + y) / T | 0) % 2 ? th.soil : th.soil2, x, y, T, T);
    }
    if (th.leaves) for (let i = 0; i < 14; i++) P(ctx, ['#E0952F', '#C0593A', '#E8C547'][i % 3], (i * 97 + t / 25 + Math.sin(t / 500 + i) * 20 + cw * 2) % cw, (i * 53 + t / 20) % gy, 4, 3);
    if (th.snowfall) for (let i = 0; i < 40; i++) P(ctx, '#FFFFFF', (i * 71 + t / 30 * (1 + i % 3)) % cw, (i * 43 + t / 12) % ch, 3, 3);
  }

  global.PHGame = { start, renderScene, THEMES: THEME_NAMES, buildLevel };
}
window.PHEngineFactory = PHEngineFactory;
PHEngineFactory(window);
