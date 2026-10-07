// ArchiGAN-SL : moteur de la version web (portage du notebook ArchiGAN_SL_v2).
// requete -> parser -> cGAN (MLP, poids exportes) -> snap -> graphe de bulles
//         -> placement v3 -> portes en arbre -> plan (SVG)
"use strict";

const ArchiGAN = (() => {

// ---------------------------------------------------------------------
// Aleatoire reproductible
// ---------------------------------------------------------------------
function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {                       // mulberry32
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare = null;
  return {
    random: next,
    randint: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    choice: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    normal: () => {
      if (spare !== null) { const s = spare; spare = null; return s; }
      let u = 0, v = 0;
      while (u === 0) u = next();
      while (v === 0) v = next();
      const r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    },
  };
}

// arrondi "au pair" comme Python / torch.round
function roundHalfEven(x) {
  const r = Math.round(x);
  return (Math.abs(x % 1) === 0.5 && r % 2 !== 0) ? r - 1 : r;
}

// ---------------------------------------------------------------------
// Vocabulaire et regles
// ---------------------------------------------------------------------
const GENERATIVE_ROOMS = ["salon", "chambre", "douche", "toilettes", "couloir",
                          "bureau", "cuisine", "balcon", "dressing"];
const TOPO_NAMES = ["sdb_suite", "wc_dans_sdb", "dressing_suite",
                    "balcon_chambre", "cuisine_fermee", "bureau_sejour"];
const VECTOR_NAMES = GENERATIVE_ROOMS.concat(TOPO_NAMES);
const IDX = Object.fromEntries(VECTOR_NAMES.map((n, i) => [n, i]));

const ROOM_ADJ = {
  salon:     ["cuisine", "couloir", "balcon", "exterieur", "chambre", "douche", "bureau", "toilettes"],
  couloir:   ["salon", "chambre", "cuisine", "douche", "bureau", "toilettes", "dressing"],
  chambre:   ["couloir", "douche", "dressing", "balcon"],
  cuisine:   ["salon", "couloir", "balcon"],
  douche:    ["chambre", "couloir"],
  toilettes: ["couloir", "douche"],
  bureau:    ["couloir", "salon"],
  dressing:  ["chambre", "couloir"],
  balcon:    ["salon", "chambre", "cuisine"],
  exterieur: ["salon"],
};
const CIRCULATION = new Set(["salon", "couloir"]);
const PRIVATE = new Set(["chambre", "douche", "toilettes", "bureau", "dressing"]);
const ANNEX_OF = { dressing: "chambre", douche: "chambre", balcon: "chambre", toilettes: "douche" };
const DAY_ZONE = new Set(["salon", "cuisine", "balcon", "couloir"]);
const FORBIDDEN = [["toilettes", "cuisine"], ["chambre", "chambre"], ["douche", "cuisine"],
                   ["chambre", "cuisine"], ["toilettes", "bureau"], ["toilettes", "chambre"]]
  .map(p => p.slice().sort().join("|"));
const SIZE_RANGES = {
  salon: [[13, 16], [14, 18]], chambre: [[9, 11], [10, 13]], cuisine: [[8, 11], [9, 11]],
  douche: [[6, 7], [7, 9]], toilettes: [[3, 4], [5, 6]], bureau: [[7, 9], [8, 10]],
  balcon: [[5, 7], [9, 12]], dressing: [[4, 5], [5, 7]],
};
const CELL_M2 = 0.09;

const isLegal = (a, b) => (ROOM_ADJ[a] || []).includes(b) || (ROOM_ADJ[b] || []).includes(a);
function isForbidden(a, b, hasCouloir) {
  if (FORBIDDEN.includes([a, b].sort().join("|"))) return true;
  return hasCouloir && ((a === "toilettes" && b === "salon") || (a === "salon" && b === "toilettes"));
}

// ---------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------
const SYNONYMS = {
  salon: ["salon", "sejour", "séjour", "living", "piece a vivre", "pièce à vivre", "salle de vie"],
  chambre: ["chambre", "chambres", "chb", "bedroom"],
  douche: ["douche", "douches", "salle d'eau", "salle d eau", "salle de bain", "sdb",
           "salle de bains", "bain"],
  toilettes: ["toilettes", "toilette", "wc", "w.c.", "waters", "cabinet"],
  couloir: ["couloir", "couloirs", "corridor", "degagement", "dégagement", "hall"],
  bureau: ["bureau", "bureaux", "office", "espace de travail", "coin bureau"],
  cuisine: ["cuisine", "cuisines", "kitchen", "cuisine equipee", "cuisine équipée"],
  balcon: ["balcon", "balcons", "terrasse", "loggia", "balconnet"],
  dressing: ["dressing", "penderie", "walk-in", "walk in", "garde-robe", "garde robe"],
};
const WORD_NUMBERS = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7,
  huit: 8, zero: 0, "zéro": 0, aucun: 0, aucune: 0, "pas de": 0, sans: 0 };
const TYPO = { studio: 0, t1: 0, f1: 0, t2: 1, f2: 1, t3: 2, f3: 2, t4: 3, f4: 3,
               t5: 4, f5: 4, t6: 5, f6: 5 };
const TOPO_PATTERNS = [
  [/suite parentale|salle d.eau privative|douche privative|sdb privative|chambre avec (?:sa )?(?:salle de bains?|salle d.eau|douche)/u,
   "sdb_suite", 1, { douche: 2, chambre: 1 }],
  [/(?:wc|toilettes?) s[ée]par[ée]s?|(?:wc|toilettes?) ind[ée]pendante?s?/u, "wc_dans_sdb", 0, {}],
  [/(?:wc|toilettes?) dans la (?:salle de bains?|salle d.eau)/u, "wc_dans_sdb", 1,
   { toilettes: 1, douche: 1 }],
  [/dressing (?:dans|attenant|de) la chambre|chambre avec dressing/u, "dressing_suite", 1,
   { dressing: 1, chambre: 1 }],
  [/balcon (?:dans|depuis|de) la chambre|chambre avec balcon/u, "balcon_chambre", 1,
   { balcon: 1, chambre: 1 }],
  [/cuisine (?:ferm[ée]e|ind[ée]pendante|s[ée]par[ée]e)/u, "cuisine_fermee", 1,
   { cuisine: 1, couloir: 1 }],
  [/cuisine (?:ouverte|am[ée]ricaine)/u, "cuisine_fermee", 0, {}],
  [/bureau (?:ouvert sur|dans) (?:le )?(?:s[ée]jour|salon)|coin bureau/u, "bureau_sejour", 1,
   { bureau: 1 }],
  [/bureau (?:ferm[ée]|ind[ée]pendant)/u, "bureau_sejour", 0, { bureau: 1 }],
];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// \b "unicode" (les lettres accentuees comptent comme lettres, comme en Python)
const WB_BEFORE = "(?<![\\p{L}\\p{N}_])", WB_AFTER = "(?![\\p{L}\\p{N}_])";
const NUM = "(\\d+|" + Object.keys(WORD_NUMBERS).map(esc).join("|") + ")";
const toInt = (t) => /^\d+$/.test(t) ? parseInt(t, 10) : WORD_NUMBERS[t];
const normalize = (t) => t.toLowerCase().trim().replace(/’/g, "'");

function findNumber(text, kw) {
  let m = text.match(new RegExp(WB_BEFORE + NUM + "\\s+" + esc(kw) + WB_AFTER, "u"));
  if (m) return toInt(m[1]);
  m = text.match(new RegExp(esc(kw) + "\\s*[:x×]\\s*" + NUM, "u"));
  if (m) return toInt(m[1]);
  return null;
}

function parsePrompt(prompt) {
  const text = normalize(prompt);
  const vec = new Array(VECTOR_NAMES.length).fill(-1);
  for (const [typo, nch] of Object.entries(TYPO)) {
    if (new RegExp(WB_BEFORE + esc(typo) + WB_AFTER, "u").test(text)) {
      vec[IDX.chambre] = nch; vec[IDX.salon] = 1; vec[IDX.cuisine] = 1; break;
    }
  }
  for (const [canon, syns] of Object.entries(SYNONYMS)) {
    let found = null;
    for (const syn of syns.slice().sort((a, b) => b.length - a.length)) {
      const variants = [syn];
      if (syn.includes(" ")) { const k = syn.indexOf(" "); variants.push(syn.slice(0, k) + "s" + syn.slice(k)); }
      else variants.push(syn + "s");
      for (const v of variants) if (text.includes(v)) { found = v; break; }
      if (found) break;
    }
    if (found) {
      const n = findNumber(text, found);
      if (n !== null && n !== undefined) vec[IDX[canon]] = n;
      else {
        const neg = new RegExp("(sans|pas de|aucune?|zero|zéro)\\s+" + esc(found), "u").test(text);
        vec[IDX[canon]] = neg ? 0 : (vec[IDX[canon]] > 0 ? Math.max(1, vec[IDX[canon]]) : 1);
      }
    }
  }
  for (const [re, v, value, needs] of TOPO_PATTERNS) {
    if (re.test(text)) {
      vec[IDX[v]] = value;
      for (const [room, k] of Object.entries(needs)) if (vec[IDX[room]] === -1) vec[IDX[room]] = k;
    }
  }
  if (vec[IDX.salon] === -1) vec[IDX.salon] = 1;
  if (vec[IDX.cuisine] === -1) vec[IDX.cuisine] = 1;
  return vec;
}

function parseFootprint(prompt) {
  const text = normalize(prompt).replace(/,/g, ".");
  const num = "(\\d+(?:\\.\\d+)?)";
  let m = text.match(new RegExp(num + "\\s*[x×]\\s*" + num +
    "\\s*(?:m(?![\\p{L}])|metres?(?![\\p{L}])|mètres?(?![\\p{L}]))", "u"));
  if (m) return { surface: parseFloat(m[1]) * parseFloat(m[2]), dims: [parseFloat(m[1]), parseFloat(m[2])] };
  m = text.match(new RegExp(num + "\\s*(?:m2|m²|m\\^2|metres? carres?|mètres? carrés?)", "u"));
  if (m) return { surface: parseFloat(m[1]), dims: null };
  return {};
}

// ---------------------------------------------------------------------
// cGAN : passe avant du generateur (MLP + BatchNorm en mode evaluation)
// ---------------------------------------------------------------------
function linear(x, L) {          // L = {W: [out][in], b: [out]}
  const y = new Array(L.b.length);
  for (let o = 0; o < L.b.length; o++) {
    let s = L.b[o]; const w = L.W[o];
    for (let i = 0; i < x.length; i++) s += w[i] * x[i];
    y[o] = s;
  }
  return y;
}
const leaky = (x) => x.map(v => v > 0 ? v : 0.2 * v);
const bnorm = (x, B) => x.map((v, i) => (v - B.mean[i]) / Math.sqrt(B.var[i] + 1e-5) * B.w[i] + B.b[i]);
const sigmoid = (x) => x.map(v => 1 / (1 + Math.exp(-v)));

function generatorForward(W, z, c) {
  let h = z.concat(c);
  h = bnorm(leaky(linear(h, W.l0)), W.bn2);
  h = bnorm(leaky(linear(h, W.l3)), W.bn5);
  h = leaky(linear(h, W.l6));
  return sigmoid(linear(h, W.l8));
}

function makeCondition(cons, maxVec) {
  const mask = cons.map(v => v >= 0 ? 1 : 0);
  const vals = cons.map((v, i) => v >= 0 ? Math.min(1, Math.max(0, v / maxVec[i])) : 0);
  return vals.concat(mask);
}

function generate(model, cons, rng) {
  const z = Array.from({ length: model.latent_dim }, () => rng.normal());
  const out = generatorForward(model.weights, z, makeCondition(cons, model.max_vec));
  const raw = out.map((v, i) => roundHalfEven(v * model.max_vec[i]));
  const fin = raw.map((v, i) => cons[i] >= 0 ? cons[i] : v);
  return { raw, final: fin };
}

// ---------------------------------------------------------------------
// Programme : pieces + topologie
// ---------------------------------------------------------------------
function countsToPieces(vec) {
  const p = {};
  GENERATIVE_ROOMS.forEach((n, i) => { if (vec[i] > 0) p[n] = vec[i]; });
  if (!p.salon) p.salon = 1;
  if (!p.cuisine) p.cuisine = 1;
  if ((p.chambre || 0) >= 2 && !p.couloir) p.couloir = 1;
  return p;
}

function clipTopology(p, topo) {
  const n = (k) => p[k] || 0, hasC = n("couloir") > 0;
  const t = {}; TOPO_NAMES.forEach(k => t[k] = Math.max(0, Math.trunc(topo[k] || 0)));
  t.sdb_suite = Math.min(t.sdb_suite, Math.max(0, n("douche") - 1), n("chambre"));
  t.wc_dans_sdb = n("douche") > 0 ? Math.min(t.wc_dans_sdb, n("toilettes")) : 0;
  t.dressing_suite = n("chambre") > 0 ? Math.min(t.dressing_suite, n("dressing")) : 0;
  t.balcon_chambre = Math.min(t.balcon_chambre, n("balcon"), n("chambre"));
  t.cuisine_fermee = hasC ? Math.min(t.cuisine_fermee, n("cuisine")) : 0;
  t.bureau_sejour = hasC ? Math.min(t.bureau_sejour, n("bureau")) : n("bureau");
  return t;
}

function defaultTopology(p) {
  const n = (k) => p[k] || 0, hasC = n("couloir") > 0;
  return clipTopology(p, {
    sdb_suite: n("douche") - 1, wc_dans_sdb: hasC ? 0 : n("toilettes"),
    dressing_suite: n("dressing"), balcon_chambre: Math.max(0, n("balcon") - 1),
    cuisine_fermee: 0, bureau_sejour: hasC ? 0 : n("bureau") });
}

function vectorToProgram(vec) {
  const pieces = countsToPieces(vec), raw = {};
  TOPO_NAMES.forEach((k, i) => raw[k] = vec[GENERATIVE_ROOMS.length + i]);
  return { pieces, topo: clipTopology(pieces, raw) };
}

// ---------------------------------------------------------------------
// Graphe de bulles
// ---------------------------------------------------------------------
function bubbleGraph(p, topo) {
  topo = topo ? clipTopology(p, topo) : defaultTopology(p);
  const nodes = [], count = {};
  const add = (name, parent) => {
    const k = count[name] || 0; count[name] = k + 1;
    const uid = `${name}_${k}`; nodes.push({ uid, name, parent }); return uid;
  };
  const n = (k) => p[k] || 0;
  const salon = add("salon", null);
  for (let i = 0; i < n("salon") - 1; i++) add("salon", salon);
  const hub = n("couloir") > 0 ? add("couloir", salon) : null;
  for (let i = 0; i < n("couloir") - 1; i++) add("couloir", hub);
  const night = hub || salon;
  for (let i = 0; i < n("cuisine"); i++) add("cuisine", i < topo.cuisine_fermee ? hub : salon);
  const chambres = []; for (let i = 0; i < n("chambre"); i++) chambres.push(add("chambre", night));
  const nShared = n("douche") - topo.sdb_suite, douches = [];
  for (let i = 0; i < n("douche"); i++)
    douches.push(add("douche", i < nShared ? night : chambres[(i - nShared) % chambres.length]));
  for (let i = 0; i < n("toilettes"); i++) add("toilettes", i < topo.wc_dans_sdb ? douches[0] : night);
  for (let i = 0; i < n("bureau"); i++) add("bureau", i < topo.bureau_sejour ? salon : night);
  for (let i = 0; i < n("dressing"); i++)
    add("dressing", i < topo.dressing_suite ? chambres[i % chambres.length] : night);
  for (let i = 0; i < n("balcon"); i++)
    add("balcon", i < topo.balcon_chambre ? chambres[i % chambres.length] : salon);
  return nodes;
}

// ---------------------------------------------------------------------
// Tailles
// ---------------------------------------------------------------------
function expectedArea(p) {
  let a = 0;
  for (const [name, k] of Object.entries(p)) {
    if (SIZE_RANGES[name]) {
      const [[w0, w1], [h0, h1]] = SIZE_RANGES[name];
      a += k * (w0 + w1) / 2 * (h0 + h1) / 2 * CELL_M2;
    }
  }
  const served = (p.chambre || 0) + (p.bureau || 0);
  a += (p.couloir || 0) * 3.5 * (4 + 11 * Math.ceil(served / 2)) * CELL_M2;
  return a;
}
const areaScale = (p, target) =>
  !target ? 1 : Math.min(1.5, Math.max(0.75, Math.sqrt(target / expectedArea(p))));
const gridSizeFor = (p, target) =>
  Math.max(60, Math.ceil(2.2 * Math.sqrt(Math.max(expectedArea(p), target || 0) / CELL_M2)));

function roomDims(name, p, scale, rng) {
  if (name === "couloir") {
    const served = (p.chambre || 0) + (p.bureau || 0);
    const len = 4 + 11 * Math.ceil(Math.max(1, served) / 2);
    return [rng.choice([3, 4]), Math.max(8, roundHalfEven(len * scale))];
  }
  const [[w0, w1], [h0, h1]] = SIZE_RANGES[name];
  return [Math.max(3, roundHalfEven(rng.randint(w0, w1) * scale)),
          Math.max(3, roundHalfEven(rng.randint(h0, h1) * scale))];
}

// ---------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------
const overlap = (a, b) => !(a[0] + a[2] <= b[0] || b[0] + b[2] <= a[0] ||
                            a[1] + a[3] <= b[1] || b[1] + b[3] <= a[1]);
function canPlace(pos, placed, gs) {
  if (pos[0] < 0 || pos[1] < 0 || pos[0] + pos[2] > gs || pos[1] + pos[3] > gs) return false;
  for (const o of placed) if (overlap(pos, o.pos)) return false;
  return true;
}
function candidatePositions(par, w, h, minOv = 3) {
  const [px, py, pw, ph] = par.pos, out = [];
  for (let x = px - w + minOv; x <= px + pw - minOv; x++) { out.push([x, py - h]); out.push([x, py + ph]); }
  for (let y = py - h + minOv; y <= py + ph - minOv; y++) { out.push([px - w, y]); out.push([px + pw, y]); }
  return out;
}

function placeRoomsGraph(p, gs, scale, topo, rng) {
  const nodes = bubbleGraph(p, topo), placed = [], byUid = {};
  const hasC = (p.couloir || 0) > 0;
  for (const node of nodes) {
    const name = node.name;
    const [w, h] = roomDims(name, p, scale, rng);
    const orients = rng.shuffle(w !== h ? [[w, h], [h, w]] : [[w, h]]);
    if (node.parent === null) {
      const r = { name, uid: node.uid, pos: [Math.floor((gs - w) / 2), Math.floor((gs - h) / 2), w, h],
                  parent: null, graphParent: null };
      placed.push(r); byUid[node.uid] = r; continue;
    }
    const par0 = byUid[node.parent];
    const others = placed.filter(q => q !== par0)
      .map(q => ({ q, k: [isLegal(name, q.name) ? 0 : 1, rng.random()] }))
      .sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1]).map(o => o.q);
    const parents = (par0 ? [par0] : []).concat(others);
    const cx = placed.reduce((s, q) => s + q.pos[0] + q.pos[2] / 2, 0) / placed.length;
    const cy = placed.reduce((s, q) => s + q.pos[1] + q.pos[3] / 2, 0) / placed.length;
    let best = null;
    for (const par of parents) {
      if (isForbidden(name, par.name, hasC)) continue;
      for (const [ww, hh] of orients) {
        for (const [x, y] of candidatePositions(par, ww, hh)) {
          const pos = [x, y, ww, hh];
          if (!canPlace(pos, placed, gs)) continue;
          const d = (x + ww / 2 - cx) ** 2 + (y + hh / 2 - cy) ** 2;
          if (!best || d < best.d) best = { d, pos, par };
        }
      }
      if (best) break;
    }
    if (!best) continue;
    const r = { name, uid: node.uid, pos: best.pos, parent: best.par.uid, graphParent: node.parent };
    placed.push(r); byUid[node.uid] = r;
  }
  return placed;
}

function recenter(placed, gs) {
  const x0 = Math.min(...placed.map(r => r.pos[0])), y0 = Math.min(...placed.map(r => r.pos[1]));
  const x1 = Math.max(...placed.map(r => r.pos[0] + r.pos[2]));
  const y1 = Math.max(...placed.map(r => r.pos[1] + r.pos[3]));
  const ox = Math.floor((gs - (x1 - x0)) / 2) - x0, oy = Math.floor((gs - (y1 - y0)) / 2) - y0;
  return placed.map(r => Object.assign({}, r, { pos: [r.pos[0] + ox, r.pos[1] + oy, r.pos[2], r.pos[3]] }));
}

// ---------------------------------------------------------------------
// Portes
// ---------------------------------------------------------------------
function findContacts(placed, minLen = 2) {
  const out = [];
  for (let i = 0; i < placed.length; i++) {
    const [ax, ay, aw, ah] = placed[i].pos;
    for (let j = i + 1; j < placed.length; j++) {
      const [bx, by, bw, bh] = placed[j].pos;
      let info = null, lo, hi;
      if (ax + aw === bx) { lo = Math.max(ay, by); hi = Math.min(ay + ah, by + bh); if (hi - lo >= minLen) info = ["vertical", "right", bx, lo, hi]; }
      else if (bx + bw === ax) { lo = Math.max(ay, by); hi = Math.min(ay + ah, by + bh); if (hi - lo >= minLen) info = ["vertical", "left", ax, lo, hi]; }
      else if (ay + ah === by) { lo = Math.max(ax, bx); hi = Math.min(ax + aw, bx + bw); if (hi - lo >= minLen) info = ["horizontal", "bottom", by, lo, hi]; }
      else if (by + bh === ay) { lo = Math.max(ax, bx); hi = Math.min(ax + aw, bx + bw); if (hi - lo >= minLen) info = ["horizontal", "top", ay, lo, hi]; }
      if (info) out.push([i, j, info]);
    }
  }
  return out;
}
function makeDoor(info, a, b, kind = "interieure") {
  const [orientation, side, fixed, lo, hi] = info;
  const along = Math.max(lo, Math.min(hi - 2, Math.floor((lo + hi) / 2) - 1));
  return { pos: orientation === "vertical" ? [fixed, along] : [along, fixed], size: 2,
           orientation, side, rooms: [a, b], kind };
}
function doorCost(a, b, hasC) {
  if (isForbidden(a.name, b.name, hasC)) return 100;
  if (b.graphParent === a.uid || a.graphParent === b.uid) return 0;
  if (isLegal(a.name, b.name)) return (CIRCULATION.has(a.name) || CIRCULATION.has(b.name)) ? 1 : 2;
  return 10;
}
const loopOk = (a) => !a.graphParent || !a.graphParent.startsWith("couloir") || a.name !== "cuisine";

function doorsTree(placed, grid, gs, hasC) {
  const contacts = findContacts(placed), parent = placed.map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const doors = [], used = new Set();
  const sorted = contacts.map((c, k) => ({ c, k, cost: doorCost(placed[c[0]], placed[c[1]], hasC),
                                           ov: c[2][4] - c[2][3] }))
    .sort((a, b) => a.cost - b.cost || b.ov - a.ov || a.k - b.k);
  for (const { c: [i, j, info] } of sorted) {
    if (find(i) !== find(j)) {
      parent[find(i)] = find(j);
      doors.push(makeDoor(info, placed[i].uid, placed[j].uid)); used.add(i + ":" + j);
    }
  }
  for (const [i, j, info] of contacts) {
    const a = placed[i], b = placed[j];
    if (!used.has(i + ":" + j) && DAY_ZONE.has(a.name) && DAY_ZONE.has(b.name) &&
        isLegal(a.name, b.name) && loopOk(a) && loopOk(b))
      doors.push(makeDoor(info, a.uid, b.uid));
  }
  for (const target of ["couloir", "salon"]) {
    let best = null;
    for (const r of placed.filter(q => q.name === target)) {
      const [x, y, w, h] = r.pos, sides = [];
      sides.push(["horizontal", "top", y, Array.from({ length: w }, (_, k) => [x + k, y - 1])]);
      sides.push(["horizontal", "bottom", y + h, Array.from({ length: w }, (_, k) => [x + k, y + h])]);
      sides.push(["vertical", "left", x, Array.from({ length: h }, (_, k) => [x - 1, y + k])]);
      sides.push(["vertical", "right", x + w, Array.from({ length: h }, (_, k) => [x + w, y + k])]);
      for (const [orient, side, fixed, cells] of sides) {
        let run = 0;
        cells.forEach(([c, rr], k) => {
          const outside = !(c >= 0 && c < gs && rr >= 0 && rr < gs) || grid[rr][c] === null;
          run = outside ? run + 1 : 0;
          if (run && (!best || run > best.run)) {
            const lo = (orient === "horizontal" ? x : y) + k - run + 1;
            best = { run, info: [orient, side, fixed, lo, lo + run], r };
          }
        });
      }
    }
    if (best && best.run >= 3) { doors.push(makeDoor(best.info, best.r.uid, "exterieur", "entree")); break; }
  }
  return doors;
}

// ---------------------------------------------------------------------
// Metriques
// ---------------------------------------------------------------------
function doorGraph(placed, doors) {
  const g = {}; placed.forEach(r => g[r.uid] = new Set());
  for (const d of doors) { const [a, b] = d.rooms; if (g[a] && g[b]) { g[a].add(b); g[b].add(a); } }
  return g;
}
function isConnected(placed, doors) {
  if (!placed.length) return false;
  const g = doorGraph(placed, doors), seen = new Set([placed[0].uid]), todo = [placed[0].uid];
  while (todo.length) for (const n of g[todo.shift()]) if (!seen.has(n)) { seen.add(n); todo.push(n); }
  return seen.size === placed.length;
}
function legalDoorRatio(placed, doors) {
  const ds = doors.filter(d => d.kind !== "entree"); if (!ds.length) return 0;
  const names = Object.fromEntries(placed.map(r => [r.uid, r.name]));
  return ds.filter(d => isLegal(names[d.rooms[0]], names[d.rooms[1]])).length / ds.length;
}
function forbiddenDoors(placed, doors, hasC) {
  const names = Object.fromEntries(placed.map(r => [r.uid, r.name]));
  return doors.filter(d => names[d.rooms[0]] && names[d.rooms[1]] &&
                           isForbidden(names[d.rooms[0]], names[d.rooms[1]], hasC)).length;
}
function compactness(placed) {
  if (!placed.length) return 0;
  const x0 = Math.min(...placed.map(r => r.pos[0])), y0 = Math.min(...placed.map(r => r.pos[1]));
  const x1 = Math.max(...placed.map(r => r.pos[0] + r.pos[2])), y1 = Math.max(...placed.map(r => r.pos[1] + r.pos[3]));
  return placed.reduce((s, r) => s + r.pos[2] * r.pos[3], 0) / Math.max(1, (x1 - x0) * (y1 - y0));
}
function directAccess(placed, doors) {
  if (placed.length < 2) return 1;
  const g = doorGraph(placed, doors), names = Object.fromEntries(placed.map(r => [r.uid, r.name]));
  const ent = doors.find(d => d.kind === "entree");
  const root = ent ? ent.rooms[0] : (placed.find(r => r.name === "salon") || placed[0]).uid;
  const dist = { [root]: 0 }, heap = [[0, root]];
  while (heap.length) {
    heap.sort((a, b) => a[0] - b[0]);
    const [d, u] = heap.shift();
    if (d > (dist[u] ?? 1e9)) continue;
    const step = (u !== root && PRIVATE.has(names[u])) ? 1 : 0;
    for (const v of g[u]) if (d + step < (dist[v] ?? 1e9)) { dist[v] = d + step; heap.push([d + step, v]); }
  }
  let ok = 0;
  for (const u of Object.keys(names)) {
    if (u === root) continue;
    const du = dist[u] ?? 1e9;
    if (du === 0) ok++;
    else if (ANNEX_OF[names[u]] && du === 1 &&
             [...g[u]].some(c => names[c] === ANNEX_OF[names[u]] && (dist[c] ?? 1e9) === 0)) ok++;
  }
  return ok / (placed.length - 1);
}
function realizedTopology(placed, doors) {
  const names = Object.fromEntries(placed.map(r => [r.uid, r.name])), nb = {};
  placed.forEach(r => nb[r.uid] = new Set());
  for (const d of doors) { const [a, b] = d.rooms; if (nb[a] && nb[b]) { nb[a].add(names[b]); nb[b].add(names[a]); } }
  const t = Object.fromEntries(TOPO_NAMES.map(k => [k, 0]));
  const circ = (s) => s.has("salon") || s.has("couloir");
  for (const [u, n] of Object.entries(names)) {
    const s = nb[u];
    if (n === "douche" && s.has("chambre") && !circ(s)) t.sdb_suite++;
    else if (n === "toilettes" && s.has("douche") && !circ(s)) t.wc_dans_sdb++;
    else if (n === "dressing" && s.has("chambre") && !circ(s)) t.dressing_suite++;
    else if (n === "balcon" && s.has("chambre") && !s.has("salon")) t.balcon_chambre++;
    else if (n === "cuisine" && s.has("couloir") && !s.has("salon")) t.cuisine_fermee++;
    else if (n === "bureau" && s.has("salon")) t.bureau_sejour++;
  }
  return t;
}
const surfaceM2 = (placed) => placed.reduce((s, r) => s + r.pos[2] * r.pos[3], 0) * CELL_M2;

// ---------------------------------------------------------------------
// Plan complet (jusqu'a 5 essais, on garde le premier plan valide)
// ---------------------------------------------------------------------
function layout(p, topo, target, rng, tries = 5) {
  const gs = gridSizeFor(p, target), scale = areaScale(p, target);
  const hasC = (p.couloir || 0) > 0, total = Object.values(p).reduce((a, b) => a + b, 0);
  let best = null, bestScore = null;
  const better = (a, b) => { for (let i = 0; i < a.length; i++) { if (a[i] > b[i]) return true; if (a[i] < b[i]) return false; } return false; };
  for (let t = 0; t < tries; t++) {
    let placed = placeRoomsGraph(p, gs, scale, topo, rng);
    if (!placed.length) continue;
    placed = recenter(placed, gs);
    const grid = Array.from({ length: gs }, () => new Array(gs).fill(null));
    for (const r of placed) for (let yy = r.pos[1]; yy < r.pos[1] + r.pos[3]; yy++)
      for (let xx = r.pos[0]; xx < r.pos[0] + r.pos[2]; xx++) grid[yy][xx] = r.uid;
    const doors = doorsTree(placed, grid, gs, hasC);
    const score = [Math.min(placed.length, total), isConnected(placed, doors) ? 1 : 0,
                   -forbiddenDoors(placed, doors, hasC), directAccess(placed, doors),
                   legalDoorRatio(placed, doors), compactness(placed)];
    if (!best || better(score, bestScore)) { best = { placed, doors, grid, gs }; bestScore = score; }
    if (score[0] === total && score[1] && score[2] === 0 && score[3] === 1 && score[4] >= 0.9) break;
  }
  return best;
}

function planFromPrompt(model, prompt, opts = {}) {
  const n = opts.n || 1, seed = opts.seed ?? 42, rng = makeRng(seed);
  const t0 = performance.now();
  const cons = parsePrompt(prompt), fp = parseFootprint(prompt);
  const results = [];
  for (let k = 0; k < n; k++) {
    const t1 = performance.now();
    const { raw, final } = generate(model, cons, rng);
    const t2 = performance.now();
    const { pieces, topo } = vectorToProgram(final);
    const L = layout(pieces, topo, fp.surface, rng);
    const t3 = performance.now();
    results.push({
      pieces, topo, raw, final, ...L,
      metrics: Object.assign(metricsOf(L, pieces), { tGen: t2 - t1, tLayout: t3 - t2 }),
    });
  }
  return { prompt, cons, footprint: fp, results, tTotal: performance.now() - t0 };
}

function metricsOf(L, pieces) {
  const hasC = (pieces.couloir || 0) > 0;
  const priv = L.placed.filter(r => PRIVATE.has(r.name)), deg = {};
  L.doors.filter(d => d.kind !== "entree").forEach(d => d.rooms.forEach(u => deg[u] = (deg[u] || 0) + 1));
  const total = Object.values(pieces).reduce((a, b) => a + b, 0);
  return {
        surface: surfaceM2(L.placed), nbPieces: L.placed.length,
        portes: L.doors.filter(d => d.kind !== "entree").length,
        entree: L.doors.some(d => d.kind === "entree"),
        accesDirect: directAccess(L.placed, L.doors),
        portesInterdites: forbiddenDoors(L.placed, L.doors, hasC),
        portesLegales: legalDoorRatio(L.placed, L.doors),
        compacite: compactness(L.placed), connexe: isConnected(L.placed, L.doors),
        topoObtenue: realizedTopology(L.placed, L.doors),
        placement: L.placed.length / total,
        portesPiecePrivee: priv.length ? priv.reduce((s, r) => s + (deg[r.uid] || 0), 0) / priv.length : 0,
  };
}

// ---------------------------------------------------------------------
// Rendu SVG (convention architecturale : murs porteurs epais, cloisons,
// portes avec vantail a 90 degres et arc de debattement)
// ---------------------------------------------------------------------
const LABELS = { salon: "SÉJOUR", chambre: "CHAMBRE", douche: "SDB", toilettes: "WC",
  couloir: "COULOIR", bureau: "BUREAU", cuisine: "CUISINE", balcon: "BALCON", dressing: "DRESSING" };

function renderSVG(res) {
  const { placed, doors, grid, gs } = res;
  const isRoom = (c, r) => r >= 0 && r < gs && c >= 0 && c < gs && grid[r][c] !== null;
  const xs = placed.flatMap(r => [r.pos[0], r.pos[0] + r.pos[2]]);
  const ys = placed.flatMap(r => [r.pos[1], r.pos[1] + r.pos[3]]);
  const m = 4, x0 = Math.min(...xs) - m, x1 = Math.max(...xs) + m, y0 = Math.min(...ys) - m, y1 = Math.max(...ys) + m;
  const f = (v) => +v.toFixed(2);
  const P = [];
  P.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" class="plan-svg" role="img" aria-label="Plan généré">`);
  for (const r of placed) {
    const [x, y, w, h] = r.pos;
    P.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" class="room${r.name === "balcon" ? " balcon" : ""}" stroke-width="0.14"/>`);
  }
  const ext = (cells) => cells.some(([c, r]) => !isRoom(c, r));
  for (const r of placed) {
    const [x, y, w, h] = r.pos, lw = r.name === "balcon" ? 0.22 : 0.6;
    const seg = (ax, ay, bx, by) => P.push(`<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" class="wall" stroke-width="${lw}"/>`);
    const row = (yy) => Array.from({ length: w }, (_, k) => [x + k, yy]);
    const col = (xx) => Array.from({ length: h }, (_, k) => [xx, y + k]);
    if (ext(row(y - 1))) seg(x, y, x + w, y);
    if (ext(row(y + h))) seg(x, y + h, x + w, y + h);
    if (ext(col(x - 1))) seg(x, y, x, y + h);
    if (ext(col(x + w))) seg(x + w, y, x + w, y + h);
  }
  const leafArc = (hinge, along, openv, size, cls) => {
    const [ax, ay] = along, [ox, oy] = openv;
    const leaf = [hinge[0] + ox * size, hinge[1] + oy * size], end = [hinge[0] + ax * size, hinge[1] + ay * size];
    const sweep = (ox * ay - oy * ax) > 0 ? 1 : 0;
    P.push(`<line x1="${f(hinge[0])}" y1="${f(hinge[1])}" x2="${f(leaf[0])}" y2="${f(leaf[1])}" class="leaf ${cls}" stroke-width="0.18"/>`);
    P.push(`<path d="M${f(leaf[0])} ${f(leaf[1])} A${size} ${size} 0 0 ${sweep} ${f(end[0])} ${f(end[1])}" class="swing ${cls}" stroke-width="0.08"/>`);
  };
  for (const d of doors) {
    const [gc, gr] = d.pos, ds = d.size, cls = d.kind === "entree" ? "entry" : "";
    if (d.orientation === "vertical") {
      const wx = gc, mid = gr + Math.floor(ds / 2);
      P.push(`<rect x="${wx - 0.4}" y="${gr}" width="0.8" height="${ds}" class="gap"/>`);
      const left = isRoom(wx - 1, mid), right = isRoom(wx, mid);
      const openv = left ? [-1, 0] : (right ? [1, 0] : [-1, 0]);
      const oc = openv[0] < 0 ? wx - 1 : wx, downOk = isRoom(oc, gr + ds);
      leafArc(downOk ? [wx, gr + ds] : [wx, gr], downOk ? [0, -1] : [0, 1], openv, ds, cls);
      if (cls) { const out = left ? 1 : -1;
        P.push(`<text x="${f(wx + out * 2.2)}" y="${f(gr + ds / 2)}" class="entry-label" font-size="0.9" transform="rotate(-90 ${f(wx + out * 2.2)} ${f(gr + ds / 2)})" text-anchor="middle" dominant-baseline="middle">ENTRÉE</text>`); }
    } else {
      const wy = gr, mid = gc + Math.floor(ds / 2);
      P.push(`<rect x="${gc}" y="${wy - 0.4}" width="${ds}" height="0.8" class="gap"/>`);
      const up = isRoom(mid, wy - 1), down = isRoom(mid, wy);
      const openv = down ? [0, 1] : (up ? [0, -1] : [0, 1]);
      const orow = openv[1] < 0 ? wy - 1 : wy, rightOk = isRoom(gc + ds, orow);
      leafArc(rightOk ? [gc, wy] : [gc + ds, wy], rightOk ? [1, 0] : [-1, 0], openv, ds, cls);
      if (cls) { const out = down ? -1 : 1;
        P.push(`<text x="${f(gc + ds / 2)}" y="${f(wy + out * 1.8)}" class="entry-label" font-size="0.9" text-anchor="middle" dominant-baseline="middle">ENTRÉE</text>`); }
    }
  }
  for (const r of placed) {
    const [x, y, w, h] = r.pos, label = LABELS[r.name] || r.name.toUpperCase();
    const vertical = w < 0.75 * label.length && h > w;
    const span = vertical ? h : w;
    const fs = Math.max(0.85, Math.min(1.45, span / (label.length * 0.78)));
    const cx = x + w / 2, cy = y + h / 2, area = (w * h * CELL_M2).toFixed(1).replace(".", ",");
    const big = Math.min(w, h) > 5;
    const tr = vertical ? ` transform="rotate(-90 ${cx} ${cy})"` : "";
    P.push(`<g${tr} text-anchor="middle"><text x="${cx}" y="${f(cy + (big ? -0.2 : 0.35))}" class="label" font-size="${f(fs)}">${label}</text>` +
      (big ? `<text x="${cx}" y="${f(cy + 1.35)}" class="area" font-size="${f(fs * 0.72)}">${area} m²</text>` : "") + `</g>`);
  }
  P.push(`</svg>`);
  return P.join("");
}

return { parsePrompt, parseFootprint, planFromPrompt, renderSVG, makeRng, generate, metricsOf, generatorForward,
         defaultTopology,
         vectorToProgram, layout, VECTOR_NAMES, GENERATIVE_ROOMS, TOPO_NAMES, LABELS };
})();

if (typeof module !== "undefined") module.exports = ArchiGAN;
