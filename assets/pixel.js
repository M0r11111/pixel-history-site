/* Pixel History — пиксельный движок: персонажи, сцена, иконки (рисуем на canvas) */
function PXFactory(global) {
  const OUT = '#1A140F';

  function shade(hex, f) {
    const h = hex.replace('#', '');
    return '#' + [0, 2, 4].map(i => {
      const v = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f)));
      return v.toString(16).padStart(2, '0');
    }).join('');
  }

  /* ======================================================================
     ПЕРСОНАЖ. Сетка 20×28 клеток (с контуром). Виды: front / side / back.
     pose: { armL, armR (спереди/сзади), armF, armB (сбоку), legs (шаг сбоку),
             eyes: 'open'|'closed', mouth: 'smile'|'kiss', blush, dx, dy }
     ====================================================================== */
  const rows = (a, b) => { const r = []; for (let y = a; y <= b; y++) r.push(y); return r; };
  const pairs = (xs, ys) => ys.flatMap(y => xs.map(x => [x, y]));

  // клетки рук: от плеча к кисти (последние 2 клетки — кисть)
  const ARMS = {
    front: {
      down: pairs([4, 5], rows(13, 18)),
      up: pairs([4, 5], [12, 11, 10, 9, 8, 7, 6]),
      wave: [[4, 12], [5, 12], [4, 11], [5, 11], [3, 10], [4, 10], [3, 9], [4, 9], [2, 8], [3, 8], [2, 7], [3, 7]],
      out: [[4, 13], [5, 13], [4, 14], [5, 14], [3, 13], [3, 14], [2, 13], [2, 14], [1, 13], [1, 14]],
      mouth: [[4, 13], [5, 13], [4, 14], [5, 14], [5, 12], [6, 12], [6, 11], [7, 11], [7, 10], [8, 10]],
      hip: [[4, 13], [5, 13], [3, 14], [4, 14], [3, 15], [4, 15], [4, 16], [5, 16]],
      forward: [[4, 13], [5, 13], [5, 14], [6, 14], [6, 15], [7, 15], [8, 15], [9, 15]]
    },
    side: {
      down: pairs([9, 10], rows(13, 18)),
      swingF: [[9, 13], [10, 13], [10, 14], [11, 14], [10, 15], [11, 15], [11, 16], [12, 16], [11, 17], [12, 17]],
      swingB: [[9, 13], [10, 13], [8, 14], [9, 14], [8, 15], [9, 15], [7, 16], [8, 16], [7, 17], [8, 17]],
      forward: [[9, 13], [10, 13], [10, 14], [11, 13], [11, 14], [12, 13], [12, 14], [13, 13], [13, 14], [14, 13], [14, 14], [15, 13], [15, 14]],
      up: pairs([9, 10], [12, 11, 10, 9, 8, 7, 6]),
      wave: [[9, 12], [10, 12], [10, 11], [11, 11], [10, 10], [11, 10], [11, 9], [12, 9], [11, 8], [12, 8], [12, 7], [13, 7]],
      mouth: [[9, 13], [10, 13], [10, 12], [11, 12], [11, 11], [12, 11], [12, 10], [13, 10], [14, 9], [14, 10]],
      out: [[9, 13], [10, 13], [11, 12], [12, 12], [13, 11], [14, 11], [15, 10], [16, 10]],
      hip: pairs([9, 10], rows(13, 16))
    }
  };
  // спереди/сзади: сбоку-позы → ближайшие фронтальные
  const SIDE_TO_FRONT = { swingF: 'down', swingB: 'down' };
  const FRONT_TO_SIDE = { hip: 'hip' };

  /* ---------- причёски ---------- */
  const HAIR = [
    ['bald', 'Лысый', 'm'], ['buzz', 'Ёжик', 'm'], ['short', 'Полубокс', 'm'], ['canadian', 'Канадка', 'm'], ['curtains', 'Шторы', 'm'],
    ['undercut', 'Андеркат', 'm'], ['mohawk', 'Ирокез', 'm'], ['mullet', 'Маллет', 'm'], ['curly', 'Кудри', 'u'], ['afro', 'Афро', 'u'],
    ['bob', 'Каре', 'f'], ['pixie', 'Пикси', 'f'], ['long', 'Длинные', 'f'], ['wavy', 'Волнистые', 'f'], ['fringe', 'С чёлкой', 'f'],
    ['ponytail', 'Хвост', 'f'], ['pigtails', 'Два хвостика', 'f'], ['braid', 'Коса', 'f'], ['bun', 'Пучок', 'f']
  ];
  const TIE = '#C0593A';

  function hairFront(st, c) {
    const { R, set, h, hD, hL, sk } = c;
    const cap = (fringe = true) => {
      R(6, 13, 2, 2, h); R(5, 14, 3, 4, h); R(13, 14, 3, 4, hD); R(7, 9, 3, 3, hL); set(10, 2, hL);
      if (fringe) { [5, 6, 7, 8, 10, 11, 13, 14].forEach(x => set(x, 5, h)); R(5, 5, 6, 7, h); R(14, 14, 6, 7, hD); set(8, 4, hL); }
      else { set(5, 5, h); set(14, 5, hD); }
    };
    const dots = (x1, x2, y1, y2) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) set(x, y, (x + y) % 2 ? hD : h); };
    switch (st) {
      case 'buzz': dots(6, 13, 2, 2); dots(5, 14, 3, 4); set(5, 5, hD); set(14, 5, hD); break;
      case 'short': cap(); break;
      case 'canadian': cap(); R(6, 13, 1, 1, h); R(7, 11, 0, 0, h); R(8, 10, 1, 1, hL); break;
      case 'curtains': R(6, 13, 2, 2, h); R(5, 14, 3, 4, h); R(13, 14, 3, 4, hD); R(9, 10, 3, 4, sk); R(5, 8, 5, 5, h); R(5, 6, 6, 6, h); R(11, 14, 5, 5, h); R(13, 14, 6, 6, hD); R(4, 5, 6, 10, h); R(14, 15, 6, 10, hD); set(7, 3, hL); set(12, 3, hL); break;
      case 'undercut': R(7, 14, 1, 2, h); R(6, 14, 3, 4, h); R(13, 14, 1, 4, hD); R(8, 11, 1, 1, hL); R(11, 14, 5, 5, h); set(5, 4, hD); set(5, 6, hD); set(14, 6, hD); break;
      case 'mohawk': R(9, 10, 0, 4, h); R(10, 10, 0, 4, hD); set(9, 1, hL); for (let x = 5; x <= 14; x++) if ((x < 9 || x > 10) && x % 2) set(x, 3, hD); break;
      case 'mullet': cap(); R(4, 5, 6, 14, h); R(14, 15, 6, 14, hD); break;
      case 'curly': for (let y = 1; y <= 5; y++) for (let x = 4; x <= 15; x++) if (!(y === 1 && (x < 6 || x > 13))) set(x, y, (x + y) % 2 ? h : hL); R(13, 15, 2, 5, hD); R(4, 4, 6, 9, h); R(15, 15, 6, 9, hD); for (let x = 7; x <= 12; x++) set(x, 5, x % 2 ? h : sk); break;
      case 'afro':
        for (let y = 0; y <= 6; y++) for (let x = 3; x <= 16; x++) {
          if ((y === 0 && (x < 6 || x > 13)) || (y === 1 && (x < 4 || x > 15))) continue;
          if (y >= 5 && x >= 6 && x <= 13) continue;
          set(x, y, (x * 3 + y) % 5 === 0 ? hL : ((x + y) % 2 ? h : hD));
        }
        R(3, 4, 7, 10, h); R(15, 16, 7, 10, hD); break;
      case 'bob': cap(); R(5, 14, 5, 5, h); R(4, 5, 6, 11, h); R(14, 15, 6, 11, hD); R(4, 4, 6, 10, hL); break;
      case 'pixie': cap(); R(5, 9, 5, 5, h); R(5, 6, 6, 6, h); set(10, 5, sk); set(11, 5, sk); break;
      case 'long': cap(); R(4, 5, 5, 15, h); R(4, 4, 6, 13, hL); R(14, 15, 5, 15, hD); break;
      case 'wavy': cap(); for (let y = 5; y <= 16; y++) { const o = (y % 4 < 2) ? 0 : -1; R(4 + o, 5 + o, y, y, h); R(14 - o, 15 - o, y, y, hD); } set(4, 7, hL); set(3, 11, hL); break;
      case 'fringe': cap(); R(5, 14, 5, 6, h); R(13, 14, 5, 6, hD); R(4, 5, 6, 15, h); R(14, 15, 6, 15, hD); R(4, 4, 7, 13, hL); break;
      case 'ponytail': cap(false); R(15, 16, 4, 13, hD); R(16, 16, 5, 12, h); set(15, 4, TIE); set(16, 4, TIE); break;
      case 'pigtails': cap(); R(2, 3, 6, 13, h); R(16, 17, 6, 13, hD); set(3, 5, TIE); set(16, 5, TIE); set(2, 14, h); set(17, 14, hD); break;
      case 'braid': cap(); R(14, 14, 5, 11, hD); for (let y = 12; y <= 18; y++) { set(12, y, (y % 2) ? h : hL); set(13, y, (y % 2) ? hD : h); } set(12, 19, TIE); set(13, 19, TIE); break;
      case 'bun': cap(); R(8, 11, 0, 1, h); R(10, 11, 0, 1, hD); set(9, 0, hL); break;
    }
  }

  function hairBack(st, c) {
    const { R, set, h, hD, hL, sk } = c;
    const cover = (y2) => { R(6, 13, 2, 2, h); R(5, 14, 3, y2, h); R(13, 14, 3, y2, hD); R(7, 9, 3, 3, hL); };
    const dots = (x1, x2, y1, y2) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) set(x, y, (x + y) % 2 ? hD : h); };
    switch (st) {
      case 'buzz': dots(6, 13, 2, 2); dots(5, 14, 3, 8); break;
      case 'short': case 'curtains': case 'pixie': cover(8); break;
      case 'canadian': cover(8); R(6, 13, 1, 1, h); break;
      case 'undercut': R(6, 14, 1, 4, h); dots(5, 14, 5, 8); break;
      case 'mohawk': R(9, 10, 0, 10, h); R(10, 10, 0, 10, hD); for (let y = 3; y <= 8; y++) for (let x = 5; x <= 14; x++) if ((x < 9 || x > 10) && (x + y) % 2) set(x, y, hD); break;
      case 'mullet': cover(8); R(5, 14, 9, 14, h); R(13, 14, 9, 14, hD); break;
      case 'curly': for (let y = 1; y <= 9; y++) for (let x = 4; x <= 15; x++) if (!(y === 1 && (x < 6 || x > 13))) set(x, y, (x + y) % 2 ? h : hL); break;
      case 'afro': for (let y = 0; y <= 10; y++) for (let x = 3; x <= 16; x++) { if ((y === 0 && (x < 6 || x > 13)) || (y === 1 && (x < 4 || x > 15)) || (y === 10 && (x < 5 || x > 14))) continue; set(x, y, (x * 3 + y) % 5 === 0 ? hL : ((x + y) % 2 ? h : hD)); } break;
      case 'bob': cover(11); R(4, 15, 5, 11, h); R(14, 15, 5, 11, hD); break;
      case 'long': case 'fringe': cover(8); R(4, 15, 5, 16, h); R(13, 15, 5, 16, hD); R(7, 8, 9, 15, hL); break;
      case 'wavy': cover(8); for (let y = 5; y <= 16; y++) { const o = (y % 4 < 2) ? 0 : 1; R(4 - o, 15 + o, y, y, h); } R(13, 15, 5, 16, hD); break;
      case 'ponytail': cover(8); R(9, 10, 4, 4, TIE); R(9, 10, 5, 15, h); R(10, 10, 5, 15, hD); break;
      case 'pigtails': cover(8); R(2, 3, 6, 13, h); R(16, 17, 6, 13, hD); set(3, 5, TIE); set(16, 5, TIE); break;
      case 'braid': cover(8); for (let y = 9; y <= 18; y++) { set(9, y, (y % 2) ? h : hL); set(10, y, (y % 2) ? hD : h); } R(9, 10, 19, 19, TIE); break;
      case 'bun': cover(8); R(8, 11, 0, 1, h); R(10, 11, 0, 1, hD); set(9, 0, hL); break;
    }
  }

  function hairSide(st, c) {
    const { R, set, h, hD, hL } = c;
    const cap = (bang = true) => { R(7, 13, 2, 2, h); R(6, 13, 3, 4, h); R(6, 8, 5, 8, h); R(6, 7, 3, 8, hD); R(9, 11, 3, 3, hL); if (bang) { set(12, 5, h); set(13, 5, h); } };
    const dots = (x1, x2, y1, y2) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) set(x, y, (x + y) % 2 ? hD : h); };
    switch (st) {
      case 'buzz': dots(7, 13, 2, 2); dots(6, 13, 3, 4); dots(6, 8, 5, 7); break;
      case 'short': cap(); break;
      case 'canadian': cap(); R(8, 13, 1, 1, h); set(14, 2, h); R(10, 12, 1, 1, hL); break;
      case 'curtains': cap(); R(12, 13, 5, 7, h); set(14, 6, h); break;
      case 'undercut': R(7, 14, 1, 2, h); R(8, 14, 3, 4, h); set(14, 5, h); R(9, 12, 1, 1, hL); dots(6, 8, 3, 7); break;
      case 'mohawk': R(8, 12, 0, 2, h); R(9, 11, 0, 0, hL); for (let y = 3; y <= 6; y++) for (let x = 6; x <= 9; x++) if ((x + y) % 2) set(x, y, hD); break;
      case 'mullet': cap(); R(5, 7, 5, 14, h); R(5, 5, 6, 13, hD); break;
      case 'curly': for (let y = 1; y <= 5; y++) for (let x = 5; x <= 13; x++) set(x, y, (x + y) % 2 ? h : hL); R(5, 8, 6, 10, h); R(5, 5, 6, 10, hD); break;
      case 'afro': for (let y = 0; y <= 10; y++) for (let x = 3; x <= 14; x++) { if ((y === 0 && (x < 5 || x > 12)) || (y > 4 && x > 8)) continue; set(x, y, (x * 3 + y) % 5 === 0 ? hL : ((x + y) % 2 ? h : hD)); } break;
      case 'bob': cap(); R(5, 8, 5, 11, h); R(5, 5, 6, 11, hD); R(12, 13, 5, 5, h); break;
      case 'pixie': cap(); R(11, 13, 5, 5, h); break;
      case 'long': cap(); R(5, 8, 5, 16, h); R(5, 5, 6, 15, hD); break;
      case 'wavy': cap(); for (let y = 5; y <= 16; y++) { const o = (y % 4 < 2) ? 0 : 1; R(5 - o, 8 - o, y, y, h); } break;
      case 'fringe': cap(); R(5, 8, 5, 16, h); R(5, 5, 6, 15, hD); R(11, 13, 5, 6, h); break;
      case 'ponytail': cap(false); R(4, 6, 4, 5, h); R(3, 4, 6, 13, h); R(3, 3, 7, 12, hD); set(6, 4, TIE); set(6, 5, TIE); break;
      case 'pigtails': cap(); R(4, 5, 6, 13, h); set(5, 5, TIE); break;
      case 'braid': cap(); R(5, 6, 6, 9, h); for (let y = 10; y <= 18; y++) { set(5, y, (y % 2) ? h : hL); set(6, y, (y % 2) ? hD : h); } set(5, 19, TIE); set(6, 19, TIE); break;
      case 'bun': cap(); R(4, 6, 1, 4, h); set(5, 1, hL); break;
    }
  }

  /* ---------- сборка персонажа ---------- */
  function charGrid(o, view, pose) {
    view = view || 'front'; const P = pose || {};
    const g = {};
    const set = (x, y, c) => { if (c) g[x + ',' + y] = c; };
    const del = (x, y) => { delete g[x + ',' + y]; };
    const R = (a, b, c, d, col) => { for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) set(x, y, col); };

    const sk = o.skin || '#E8C39E', skD = shade(sk, 0.8), skL = shade(sk, 1.1);
    const top = (o.topType && o.topType !== 'none') ? o.topType : null;
    const t = o.top || '#6E9145', tD = shade(t, 0.72), tL = shade(t, 1.18);
    const bot = (o.bottomType && o.bottomType !== 'none' && top !== 'dress') ? o.bottomType : null;
    const b = o.bottom || '#3E4A33', bD = shade(b, 0.72), bL = shade(b, 1.15);
    const shoe = o.shoes || null;
    const hasHair = !!(o.hair && o.style && o.style !== 'bald');
    const h = o.hair || '#222222', hD = shade(h, 0.68), hL = shade(h, 1.4);
    const longSleeve = top === 'hoodie' || top === 'shirt';
    const eyeC = o.eyes || '#3B2B1E', eyeD = shade(eyeC, 0.55);
    const hc = { R, set, h, hD, hL, sk };

    // нога: базовый цвет кожи → одежда → обувь
    function legCell(x, y, base, dark) {
      let c = base;
      const bEnd = bot === 'shorts' ? 22 : bot === 'skirt' ? 19 : 24;
      if (bot && y <= bEnd) c = dark ? bD : b;
      if (shoe && y >= 25) c = (y === 26) ? shade(shoe, 0.65) : shoe;
      set(x, y, c);
    }
    function arm(cells, sleeve, skin) {
      const n = cells.length, sN = !top ? 0 : (longSleeve ? n - 2 : Math.min(4, n - 2));
      cells.forEach(([x, y], i) => set(x, y, i < sN ? sleeve : skin));
    }
    const mirror = cells => cells.map(([x, y]) => [19 - x, y]);

    if (view === 'side') {
      const s = P.legs || 0;
      const legCells = st => { const c = []; for (let y = 20; y <= 22; y++) for (let x = 9; x <= 11; x++) c.push([x, y]); for (let y = 23; y <= 25; y++) for (let x = 9 + st; x <= 11 + st; x++) c.push([x, y]); for (let x = 9 + st; x <= 13 + st; x++) c.push([x, 26]); return c; };
      // задняя нога и рука (темнее)
      legCells(-s).forEach(([x, y]) => legCell(x, y, shade(sk, 0.7), true));
      if (s !== 0) Object.keys(g).forEach(k => { g[k] = shade(g[k], 0.85); });
      const armB = ARMS.side[P.armB || 'down'] || ARMS.side.down;
      arm(armB, shade(t, 0.6), shade(sk, 0.7));
      // тело
      R(7, 12, 13, 19, sk); R(7, 7, 13, 19, skD);
      legCells(s).forEach(([x, y]) => legCell(x, y, sk, false));
      if (top) {
        const by = top === 'dress' ? 22 : 19;
        R(7, 12, 13, by, t); R(7, 7, 13, by, tD); R(12, 12, 14, by, tL);
        if (top === 'hoodie') R(6, 8, 12, 13, tD);
        if (top === 'shirt') set(12, 13, '#EDE4CF');
        if (top === 'dress') { R(6, 13, 20, 22, t); R(6, 6, 20, 22, tD); R(6, 13, 22, 22, tD); }
      }
      if (bot) { R(7, 12, 19, 19, '#3B2B1E'); if (bot === 'skirt') { R(7, 13, 20, 22, b); R(7, 13, 22, 22, bD); } }
      // голова
      R(6, 13, 3, 11, sk); R(6, 7, 4, 10, skD); [[6, 3], [13, 3], [6, 11], [13, 11]].forEach(([x, y]) => del(x, y));
      set(14, 8, sk); set(14, 9, skD); set(8, 7, skD); set(8, 8, skD); R(9, 10, 12, 12, skD);
      if (!o.mannequin) {
        if (P.eyes === 'closed') { set(11, 8, '#3B2B1E'); set(12, 8, '#3B2B1E'); }
        else { set(11, 7, '#FFFFFF'); set(12, 7, eyeD); set(11, 8, eyeC); set(12, 8, eyeD); }
        const brow = hasHair ? hD : skD; set(11, 6, brow); set(12, 6, brow);
        set(11, 9, '#E39B86'); if (P.blush) set(12, 9, '#E39B86');
        if (P.mouth === 'kiss') { set(14, 10, '#C0593A'); set(13, 10, '#9E4630'); }
        else if (P.mouth === 'smile') { set(12, 10, '#9E4630'); set(13, 10, '#9E4630'); }
        else set(13, 10, '#9E4630');
      } else { set(12, 8, skD); set(9, 4, skL); }
      if (hasHair) hairSide(o.style, hc); else if (!o.mannequin) { set(9, 4, skL); set(10, 4, skL); }
      // аксессуары
      if (o.acc === 'glasses') { const gl = '#2A2420'; R(10, 13, 6, 6, gl); set(10, 7, gl); set(10, 8, gl); set(13, 7, gl); set(13, 8, gl); R(10, 13, 9, 9, gl); R(8, 9, 7, 7, gl); }
      if (o.acc === 'mushroom') { R(6, 13, 0, 0, '#C0593A'); R(5, 14, 1, 2, '#C0593A'); R(4, 15, 3, 3, '#9E4630'); set(8, 1, '#EDE4CF'); set(12, 0, '#EDE4CF'); set(6, 2, '#EDE4CF'); }
      if (o.acc === 'flower') { set(7, 2, '#E39B86'); set(6, 3, '#E39B86'); set(8, 3, '#E39B86'); set(7, 4, '#E39B86'); set(7, 3, '#F2E3A0'); }
      if (o.acc === 'scarf') { R(8, 12, 12, 13, '#D4B95E'); R(7, 8, 14, 16, '#B89A45'); }
      // передняя рука
      const armF = ARMS.side[P.armF || 'down'] || ARMS.side.down;
      arm(armF, top ? shade(t, 0.88) : sk, sk);
    } else {
      const back = view === 'back';
      // ноги
      pairs([7, 8, 9], rows(20, 25)).forEach(([x, y]) => legCell(x, y, sk, false));
      pairs([10, 11, 12], rows(20, 25)).forEach(([x, y]) => legCell(x, y, skD, true));
      [6, 7, 8, 9].forEach(x => legCell(x, 26, sk, false)); [10, 11, 12, 13].forEach(x => legCell(x, 26, skD, true));
      if (bot && bot !== 'skirt') { R(7, 7, 20, bot === 'shorts' ? 22 : 24, bL); if (!back) R(9, 10, 22, bot === 'shorts' ? 22 : 24, bD); }
      if (shoe && !back) { set(7, 25, shade(shoe, 1.25)); set(11, 25, shade(shoe, 1.25)); }
      // тело
      R(6, 13, 13, 19, sk); R(12, 13, 13, 19, skD); del(6, 13); del(13, 13);
      if (top) {
        const by = top === 'dress' ? 22 : 19;
        R(6, 13, 13, by, t); R(12, 13, 13, by, tD); R(6, 6, 14, by, tL); del(6, 13); del(13, 13);
        if (top === 'tshirt' && !back) { set(9, 13, skD); set(10, 13, skD); }
        if (top === 'hoodie') { if (back) R(7, 12, 12, 14, tD); else { R(7, 12, 12, 12, tD); set(8, 14, '#EDE4CF'); set(8, 15, '#EDE4CF'); set(11, 14, '#EDE4CF'); set(11, 15, '#EDE4CF'); R(8, 11, 17, 18, tD); } }
        if (top === 'shirt' && !back) { set(8, 13, '#EDE4CF'); set(11, 13, '#EDE4CF'); set(9, 13, skD); set(10, 13, skD); set(9, 15, tD); set(9, 17, tD); }
        if (top === 'dress') { R(5, 14, 20, 22, t); R(13, 14, 20, 22, tD); R(5, 5, 20, 22, tL); R(5, 14, 22, 22, tD); if (!back) { set(9, 13, skD); set(10, 13, skD); } }
      }
      if (bot) { R(6, 13, 19, 19, '#3B2B1E'); if (!back) { set(9, 19, '#D4B95E'); set(10, 19, '#D4B95E'); } if (bot === 'skirt') { R(6, 13, 20, 22, b); R(5, 14, 22, 22, bD); R(6, 6, 20, 21, bL); R(12, 13, 20, 21, bD); } }
      // голова
      R(5, 14, 3, 11, sk); R(13, 14, 4, 10, skD); [[5, 3], [14, 3], [5, 11], [14, 11]].forEach(([x, y]) => del(x, y));
      set(4, 7, sk); set(4, 8, skD); set(15, 7, skD); set(15, 8, skD); R(9, 10, 12, 12, skD);
      if (!back) {
        if (!o.mannequin) {
          if (P.eyes === 'closed') { [7, 8, 11, 12].forEach(x => set(x, 8, '#3B2B1E')); }
          else { set(7, 7, '#FFFFFF'); set(8, 7, eyeD); set(7, 8, eyeC); set(8, 8, eyeD); set(11, 7, '#FFFFFF'); set(12, 7, eyeD); set(11, 8, eyeC); set(12, 8, eyeD); }
          const brow = hasHair ? hD : skD; set(7, 6, brow); set(8, 6, brow); set(11, 6, brow); set(12, 6, brow);
          set(6, 9, '#E39B86'); set(13, 9, '#D98C78'); if (P.blush) { set(7, 9, '#E39B86'); set(12, 9, '#E39B86'); }
          if (P.mouth === 'smile') { set(8, 10, '#9E4630'); set(11, 10, '#9E4630'); set(9, 11, '#9E4630'); set(10, 11, '#9E4630'); }
          else if (P.mouth === 'kiss') { set(9, 10, '#C0593A'); set(10, 10, '#C0593A'); set(9, 11, '#9E4630'); }
          else { set(9, 10, '#9E4630'); set(10, 10, '#9E4630'); }
        } else { set(8, 8, skD); set(11, 8, skD); set(7, 4, skL); set(8, 4, skL); set(9, 3, skL); }
      }
      if (hasHair) (back ? hairBack : hairFront)(o.style, hc); else if (!o.mannequin) { set(7, 4, skL); set(8, 4, skL); }
      // аксессуары
      if (o.acc === 'glasses') { const gl = '#2A2420'; if (back) { set(4, 7, gl); set(15, 7, gl); } else { R(6, 9, 6, 6, gl); R(10, 13, 6, 6, gl); [6, 9, 10, 13].forEach(x => { set(x, 7, gl); set(x, 8, gl); }); R(6, 9, 9, 9, gl); R(10, 13, 9, 9, gl); } }
      if (o.acc === 'mushroom') { R(6, 13, 0, 0, '#C0593A'); R(4, 15, 1, 2, '#C0593A'); R(3, 16, 3, 3, '#9E4630'); set(7, 1, '#EDE4CF'); set(11, 0, '#EDE4CF'); set(13, 2, '#EDE4CF'); set(5, 2, '#EDE4CF'); }
      if (o.acc === 'flower') { const fx = back ? 6 : 13; set(fx, 2, '#E39B86'); set(fx + 1, 3, '#E39B86'); set(fx - 1, 3, '#E39B86'); set(fx, 4, '#E39B86'); set(fx, 3, '#F2E3A0'); }
      if (o.acc === 'scarf') { R(6, 13, 12, 13, '#D4B95E'); if (!back) R(11, 12, 14, 16, '#B89A45'); }
      // руки
      const fa = n => ARMS.front[SIDE_TO_FRONT[n] || n] || ARMS.front.down;
      const L = fa(P.armL || 'down'), Rr = mirror(fa(P.armR || 'down'));
      arm(L, top ? tL : sk, sk);
      arm(Rr, top ? tD : skD, skD);
    }

    // контур
    const out = [];
    Object.keys(g).forEach(k => {
      const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const n = (x + dx) + ',' + (y + dy); if (!g[n]) out.push(n); });
    });
    out.forEach(n => { if (!g[n]) g[n] = OUT; });
    return g;
  }

  function drawGrid(ctx, g, s, ox, oy, flip) {
    for (const k in g) {
      const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1);
      ctx.fillStyle = g[k]; ctx.fillRect(ox + (flip ? 19 - x : x) * s, oy + y * s, s, s);
    }
  }

  // Персонаж в позе. (ox, oy) — левый верх сетки; ноги стоят на oy + 27s.
  const cache = new Map();
  function gridCached(o, view, pose) {
    const k = JSON.stringify([o, view, pose || null]);
    let g = cache.get(k);
    if (!g) { g = charGrid(o, view, pose); if (cache.size > 600) cache.clear(); cache.set(k, g); }
    return g;
  }
  function drawPose(ctx, o, s, ox, oy, view, pose, flip, shadow) {
    const P = pose || {};
    if (shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(ox + 5 * s, oy + 27 * s, 10 * s, s); }
    drawGrid(ctx, gridCached(o, view, P), s, ox + (P.dx || 0) * s * (flip ? -1 : 1), oy + (P.dy || 0) * s, flip);
  }
  // совместимость: старый вызов (ноги на oy + 28s)
  function drawChar(ctx, o, s, ox = 0, oy = 0) { drawPose(ctx, o, s, ox, oy + s, 'front', null, false, true); }

  function renderChar(canvas, o, s = 1, view, pose) {
    canvas.width = 20 * s; canvas.height = 29 * s;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPose(ctx, o, s, 0, s, view || 'front', pose, false, true);
  }

  /* ---------- анимации ---------- */
  const ANIMS = {
    walk_normal: { name: 'Обычная', kind: 'walk', view: 'side', fps: 8, frames: [{ legs: 1, armF: 'swingB', armB: 'swingF' }, { legs: 0, dy: -1 }, { legs: -1, armF: 'swingF', armB: 'swingB' }, { legs: 0, dy: -1 }] },
    walk_bouncy: { name: 'Вприпрыжку', kind: 'walk', view: 'side', fps: 7, frames: [{ legs: 1, armF: 'swingB', armB: 'swingF' }, { legs: 0, dy: -4, mouth: 'smile' }, { legs: -1, armF: 'swingF', armB: 'swingB' }, { legs: 0, dy: -4, mouth: 'smile' }] },
    walk_proud: { name: 'Важная', kind: 'walk', view: 'side', fps: 4, frames: [{ legs: 1, armF: 'hip', armB: 'hip' }, { legs: 0, armF: 'hip', armB: 'hip' }, { legs: -1, armF: 'hip', armB: 'hip' }, { legs: 0, armF: 'hip', armB: 'hip' }] },
    walk_sneak: { name: 'Крадётся', kind: 'walk', view: 'side', fps: 5, frames: [{ legs: 1, armF: 'forward', armB: 'forward', dy: 1 }, { legs: 0, armF: 'forward', armB: 'forward' }, { legs: -1, armF: 'forward', armB: 'forward', dy: 1 }, { legs: 0, armF: 'forward', armB: 'forward' }] },
    walk_run: { name: 'Бегом', kind: 'walk', view: 'side', fps: 12, frames: [{ legs: 2, armF: 'swingB', armB: 'swingF', dy: -1 }, { legs: 0, dy: -2 }, { legs: -2, armF: 'swingF', armB: 'swingB', dy: -1 }, { legs: 0, dy: -2 }] },
    wave: { name: 'Прощание', kind: 'emote', view: 'front', fps: 4, frames: [{ armR: 'up', mouth: 'smile' }, { armR: 'wave', mouth: 'smile' }] },
    air_kiss: { name: 'Воздушный поцелуй', kind: 'emote', view: 'front', fps: 3, frames: [{ armR: 'mouth', eyes: 'closed', mouth: 'kiss' }, { armR: 'mouth', eyes: 'closed', mouth: 'kiss' }, { armR: 'out', mouth: 'smile', fx: 'fly1' }, { armR: 'out', mouth: 'smile', fx: 'fly2' }] },
    kiss: { name: 'Поцелуй', kind: 'duo', fps: 3, frames: [{ gap: 4 }, { gap: 2, blush: true }, { gap: 0, eyes: 'closed', mouth: 'kiss', blush: true, fx: 'heart' }, { gap: 0, eyes: 'closed', mouth: 'kiss', blush: true, fx: 'heart2' }] },
    hug: { name: 'Обнимашки', kind: 'duo', fps: 3, frames: [{ gap: 4, mouth: 'smile' }, { gap: 1, armF: 'forward', armB: 'forward', eyes: 'closed', mouth: 'smile' }, { gap: 1, armF: 'forward', armB: 'forward', eyes: 'closed', mouth: 'smile', fx: 'heart' }, { gap: 1, armF: 'forward', armB: 'forward', eyes: 'closed', mouth: 'smile', blush: true, fx: 'heart2' }] },
    dance: { name: 'Танец', kind: 'emote', view: 'front', fps: 5, frames: [{ armL: 'up', armR: 'hip', mouth: 'smile' }, { armL: 'out', armR: 'out', dy: -2, mouth: 'smile' }, { armL: 'hip', armR: 'up', mouth: 'smile' }, { armL: 'out', armR: 'out', dy: -2, mouth: 'smile' }] },
    joy: { name: 'Прыжок радости', kind: 'emote', view: 'front', fps: 6, frames: [{}, { dy: -4, armL: 'wave', armR: 'wave', eyes: 'closed', mouth: 'smile' }, { dy: -8, armL: 'up', armR: 'up', eyes: 'closed', mouth: 'smile' }, { dy: -4, armL: 'wave', armR: 'wave', eyes: 'closed', mouth: 'smile' }] },
    shy: { name: 'Смущение', kind: 'emote', view: 'front', fps: 3, frames: [{ blush: true, eyes: 'closed', armL: 'mouth' }, { blush: true, eyes: 'closed', armL: 'mouth', dx: 1 }, { blush: true, eyes: 'closed', armL: 'mouth' }, { blush: true, eyes: 'closed', armL: 'mouth', dx: -1 }] },
    heart: { name: 'Сердечко', kind: 'emote', view: 'front', fps: 3, frames: [{ armL: 'up', armR: 'up', mouth: 'smile', fx: 'heart' }, { armL: 'up', armR: 'up', mouth: 'smile', fx: 'heart2' }] }
  };
  const WALKS = Object.keys(ANIMS).filter(k => ANIMS[k].kind === 'walk');
  const EMOTES = Object.keys(ANIMS).filter(k => ANIMS[k].kind !== 'walk');
  function animFrame(id, ms) { const a = ANIMS[id]; if (!a) return {}; return a.frames[Math.floor(ms / 1000 * a.fps) % a.frames.length]; }

  const HEART = ['.rr.rr.', 'rrwrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
  function drawHeart(ctx, cx, cy, p) {
    HEART.forEach((row, j) => [...row].forEach((c, i) => { if (c !== '.') { ctx.fillStyle = c === 'w' ? '#EDE4CF' : '#C0593A'; ctx.fillRect(Math.round(cx + (i - 3.5) * p), Math.round(cy + (j - 3) * p), p, p); } }));
  }
  function drawFx(ctx, fx, cx, footY, s, dir) {
    if (!fx) return; dir = dir || 1;
    const p = Math.max(2, Math.round(s * 0.6));
    if (fx === 'heart') drawHeart(ctx, cx, footY - 32 * s, p);
    if (fx === 'heart2') drawHeart(ctx, cx, footY - 34 * s, p + 1);
    if (fx === 'fly1') drawHeart(ctx, cx + dir * 11 * s, footY - 16 * s, p);
    if (fx === 'fly2') drawHeart(ctx, cx + dir * 16 * s, footY - 20 * s, p + 1);
  }

  // Рисует анимацию (одиночную или парную). cx — центр, footY — линия земли.
  function drawAnim(ctx, id, hero, partner, ms, s, cx, footY, opts) {
    const a = ANIMS[id]; if (!a) { drawPose(ctx, hero, s, Math.round(cx - 10 * s), footY - 27 * s, 'front', null); return; }
    const f = animFrame(id, ms), flip = !!(opts && opts.flip);
    if (a.kind === 'duo') {
      const gap = f.gap == null ? 2 : f.gap, oy = footY - 27 * s;
      const oxA = Math.round(cx - (14 + gap / 2) * s), oxB = oxA + (9 + gap) * s;
      drawPose(ctx, partner || hero, s, oxB, oy, 'side', f, true);
      drawPose(ctx, hero, s, oxA, oy, 'side', f, false);
      drawFx(ctx, f.fx, cx, footY, s, 1);
      return;
    }
    drawPose(ctx, hero, s, Math.round(cx - 10 * s), footY - 27 * s, a.view, f, flip);
    drawFx(ctx, f.fx, cx, footY, s, flip ? -1 : 1);
  }

  /* ---------- Лесная сцена (сетка 64×40) ---------- */
  function sceneGrid() {
    const W = 64, H = 40, g = Array.from({ length: H }, () => Array(W).fill(null));
    const st = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let c = y < 6 ? '#161B12' : y < 12 ? '#1E2618' : y < 18 ? '#283321' : y < 22 ? '#33422A' : '#3E5231';
      if (y >= 27) c = y < 29 ? ((x % 3) ? '#5B7A3A' : '#6E9145') : ((x + y) % 2 ? '#4A3626' : '#3B2B1E');
      st(x, y, c);
    }
    for (let x = 0; x < W; x++) { const h = 20 + Math.round(2 * Math.sin(x / 4) + Math.sin(x / 1.7)); for (let y = h; y < 27; y++) st(x, y, '#47603A'); }
    for (let x = 0; x < W; x++) { const h = 4 + Math.round(2 * Math.sin(x / 3) + 1.5 * Math.cos(x / 5)); for (let y = 0; y < h; y++) st(x, y, (x + y) % 4 ? '#2F4A26' : '#3E5E30'); }
    [[2, 4], [57, 5]].forEach(([tx, w]) => { for (let y = 0; y < 29; y++) for (let x = tx; x < tx + w; x++) st(x, y, x === tx ? '#5E4530' : (x === tx + w - 1 ? '#33251A' : '#4A3626')); });
    for (let y = 0; y < 6; y++) for (let x = 0; x < 10; x++) if ((x * 7 + y * 3) % 5) st(x, y, '#3E5E30');
    for (let y = 0; y < 7; y++) for (let x = 53; x < 64; x++) if ((x * 5 + y) % 4) st(x, y, '#3E5E30');
    // мухомор
    for (let y = 15; y < 22; y++) { const r = Math.min(6, (y - 14) * 2); for (let x = 19 - r; x <= 19 + r; x++) st(x, y, '#C0593A'); }
    [[16, 18], [21, 17], [18, 20], [23, 20], [14, 21], [19, 16]].forEach(([x, y]) => st(x, y, '#EDE4CF'));
    for (let x = 14; x <= 24; x++) st(x, 21, '#9E4630');
    for (let y = 22; y < 29; y++) for (let x = 18; x <= 20; x++) st(x, y, x === 20 ? '#C9B994' : '#E3D6B5');
    [[28, '#9C6B3A'], [33, '#C0593A'], [9, '#B5893F']].forEach(([cx, cap]) => {
      for (let x = cx - 2; x <= cx + 2; x++) st(x, 25, cap); for (let x = cx - 1; x <= cx + 1; x++) st(x, 24, cap); st(cx, 26, '#E3D6B5'); st(cx, 27, '#E3D6B5');
    });
    // лягушка
    for (let y = 25; y < 29; y++) for (let x = 40; x <= 46; x++) st(x, y, '#8FB25A');
    for (let x = 41; x <= 45; x++) st(x, 28, '#C3D88A');
    st(41, 23, '#EDE4CF'); st(45, 23, '#EDE4CF'); st(41, 24, '#12150E'); st(45, 24, '#12150E'); st(39, 28, '#6E9145'); st(47, 28, '#6E9145');
    // улитка
    for (let y = 24; y < 28; y++) for (let x = 49; x <= 52; x++) st(x, y, '#8A6A3A');
    st(50, 25, '#D4B95E'); st(51, 26, '#D4B95E'); st(50, 26, '#D4B95E');
    for (let x = 47; x <= 53; x++) st(x, 28, '#A9A68C'); st(47, 27, '#A9A68C'); st(46, 26, '#A9A68C');
    // папоротники
    [6, 25, 36, 54].forEach(fx => { for (let i = 0; i < 4; i++) { st(fx, 28 - i, '#6E9145'); st(fx - 1 - (i % 2), 27 - i, '#5B7A3A'); st(fx + 1 + (i % 2), 27 - i, '#5B7A3A'); } });
    return g;
  }
  const FIREFLIES = [[12, 9], [24, 6], [31, 12], [38, 8], [46, 14], [50, 5], [27, 17], [8, 14], [42, 19]];

  function drawScene(ctx, s = 10, t = 0) {
    const g = sceneGrid();
    g.forEach((row, y) => row.forEach((c, x) => { ctx.fillStyle = c; ctx.fillRect(x * s, y * s, s, s); }));
    FIREFLIES.forEach(([x, y], i) => {
      const on = Math.sin(t / 400 + i * 1.7) > -0.3;
      if (on) { ctx.fillStyle = '#F2E3A0'; ctx.fillRect(x * s, y * s + Math.round(Math.sin(t / 700 + i) * 2), s, s); }
    });
  }

  /* ---------- Иконки 8×8 ---------- */
  const IC = { r: '#C0593A', w: '#EDE4CF', b: '#D9C9A3', g: '#5B7A3A', G: '#A8C46A', d: '#12150E', s: '#A9A68C', o: '#8A6A3A', y: '#D4B95E', Y: '#F2E3A0', c: '#9B8AC4', C: '#C9BCEB', B: '#4A3626' };
  const ICONS = {
    mushroom: ['..rrrr..', '.rrwrrr.', 'rrrrrwrr', 'rwrrrrrr', '..bbbb..', '...bb...', '...bb...', 'GGGGGGGG'],
    frog: ['.ww..ww.', '.wd..dw.', 'GGGGGGGG', 'GGGGGGGG', 'GgggggGG', '.GggggG.', 'GG....GG', '........'],
    snail: ['........', '...ooo..', '..oyyyo.', '..oyoyo.', 's.oooyo.', 'ss.ooo..', 'ssssssss', '........'],
    fern: ['...G....', '..GgG...', '.G.G.G..', '..GgG.G.', 'G.G.GgG.', '.GgG.G..', '...G....', '..BBB...'],
    crystal: ['...c....', '..cCc...', '..cCc.c.', '.ccCcCc.', '.cCccCc.', '.cCc.cc.', '..ccccc.', '.BBBBBB.'],
    lantern: ['...BB...', '..BBBB..', '.B.yy.B.', '.ByYYyB.', '.ByYYyB.', '.B.yy.B.', '..BBBB..', '........'],
    heart: ['.rr.rr.', 'rrwrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
    gift: ['....yy..yy....', '...yYy..yYy...', '....yyyyyy....', 'rrrrrryyrrrrrr', 'rrrrrryYrrrrrr', 'rrrrrryyrrrrrr', '.rrrrryyrrrrr.', '.rrrrryyrrrrr.', '.rrrrryyrrrrr.', '.rrrrryyrrrrr.', '.rrrrryyrrrrr.', '.rrrrryyrrrrr.']
  };
  function drawIcon(canvas, name, outline = false) {
    const m = ICONS[name]; if (!m) return;
    const pad = outline ? 1 : 0;
    canvas.width = m[0].length + pad * 2; canvas.height = m.length + pad * 2;
    const ctx = canvas.getContext('2d');
    const g = {};
    m.forEach((row, y) => [...row].forEach((ch, x) => { if (IC[ch]) g[(x + pad) + ',' + (y + pad)] = IC[ch]; }));
    if (outline) {
      const out = [];
      Object.keys(g).forEach(k => { const [x, y] = k.split(',').map(Number); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const n = (x + dx) + ',' + (y + dy); if (!g[n]) out.push(n); }); });
      out.forEach(n => { if (!g[n]) g[n] = OUT; });
    }
    drawGrid(ctx, g, 1, 0, 0);
  }

  /* ---------- Готовые герои ---------- */
  const HEROES = {
    asem: { name: 'Асем', role: 'Кого ищем', skin: '#F0CBA8', hair: '#5A3A26', style: 'long', eyes: '#5B7A3A', top: '#C0593A', topType: 'hoodie', bottom: '#3E4A33', bottomType: 'pants', shoes: '#EDE4CF', acc: 'none', walk: 'walk_bouncy', emotes: ['wave', 'air_kiss', 'hug'] },
    you: { name: 'Вы', role: 'Главный герой', skin: '#C99A6E', hair: '#221A14', style: 'curtains', eyes: '#4A3626', top: '#6E9145', topType: 'tshirt', bottom: '#5E4530', bottomType: 'pants', shoes: '#2A2420', acc: 'none', walk: 'walk_normal', emotes: ['wave', 'hug'] },
    base: { name: 'Новый герой', role: 'Друг', skin: '#C9B994', mannequin: true }
  };

  global.PX = { shade, charGrid, drawGrid, drawPose, drawChar, renderChar, drawAnim, drawHeart, animFrame, ANIMS, WALKS, EMOTES, HAIR, drawScene, drawIcon, HEROES, ICONS };
}
window.PXFactory = PXFactory;
PXFactory(window);
