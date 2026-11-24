// ============================================================================
// Médellín — contrôleur de la simulation
// HUD minimal · projets · chronologie · caméra · indicateurs
// ============================================================================

import * as THREE from 'three';
import { createWorld } from './world.js';
import { projects, projectById } from './data.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Références
// ---------------------------------------------------------------------------

const canvas = $('#world');
const body = document.body;
const loader = $('#loader');
const loaderBar = $('#loaderBar');
const loaderPercent = $('#loaderPercent');
const loaderStatus = $('#loaderStatus');
const fallback = $('#webglFallback');
const hotspotsEl = $('#hotspots');
const annotationsToggle = $('#annotationsToggle');
const timeToggle = $('#timeToggle');
const timeLabel = $('#timeLabel');
const tourBtn = $('#tourBtn');
const brandHome = $('#brandHome');
const statusLine = $('#statusLine');
const projectRail = $('#projectRail');
const panel = $('#projectPanel');
const panelClose = $('#panelClose');
const panelNum = $('#panelNum');
const panelMeta = $('#panelMeta');
const panelTitle = $('#panelTitle');
const panelTagline = $('#panelTagline');
const panelStats = $('#panelStats');
const panelMore = $('#panelMore');
const panelMoreBody = $('#panelMoreBody');
const panelBody = $('#panelBody');
const panelNote = $('#panelNote');
const panelStep = $('#panelStep');
const prevProject = $('#prevProject');
const nextProject = $('#nextProject');
const panelTour = $('#panelTour');
const tourStepLabel = $('#tourStepLabel');
const tourProgress = $('#tourProgress');
const tourPrev = $('#tourPrev');
const tourNext = $('#tourNext');
const tourExit = $('#tourExit');
const resetViewBtn = $('#resetView');
const zoomIn = $('#zoomIn');
const zoomOut = $('#zoomOut');
const toastEl = $('#toast');
const metricEls = $$('.metric');

// ---------------------------------------------------------------------------
// Monde 3D
// ---------------------------------------------------------------------------

const params = new URLSearchParams(window.location.search);
const initialTime = params.get('time') === 'day' ? 'day' : 'night';
const initialEra = params.get('era') === 'before' ? 'before' : 'after';

let world = null;

try {
  world = createWorld(canvas);
  world.setEra(initialEra, { instant: true });
  world.setTime(initialTime, { instant: true });
  window.__medellin = world;
} catch (error) {
  console.error('[Médellín] WebGL indisponible :', error);
  body.classList.add('no-webgl');
  if (fallback) fallback.hidden = false;
}

// ---------------------------------------------------------------------------
// État
// ---------------------------------------------------------------------------

let selectedId = null;
let tourActive = false;
let annotationsOn = true;
let currentTime = initialTime;
let toastTimer = null;

const projectIndex = (id) => projects.findIndex((p) => p.id === id);

// ---------------------------------------------------------------------------
// Chargement
// ---------------------------------------------------------------------------

const loadMessages = [
  [8, 'Construction de la vallée…'],
  [26, 'Déploiement des quartiers de colline…'],
  [48, 'Tissage du métro et du Metrocable…'],
  [68, 'Plantation des couloirs verts…'],
  [86, 'Allumage des lumières…'],
  [95, 'Derniers réglages…'],
];

let loadProgress = 0;
const loaderInterval = window.setInterval(() => {
  loadProgress = Math.min(94, loadProgress + 2.4 + Math.random() * 5.2);
  if (loaderBar) loaderBar.style.width = `${loadProgress}%`;
  if (loaderPercent) loaderPercent.textContent = `${Math.round(loadProgress)} %`;
  const msg = loadMessages.filter(([v]) => loadProgress >= v).pop();
  if (msg && loaderStatus) loaderStatus.textContent = msg[1];
}, 140);

async function finishLoading() {
  try {
    await Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise((resolve) => setTimeout(resolve, 950)),
    ]);
  } catch (_) {
    /* ignore */
  }

  clearInterval(loaderInterval);
  if (loaderBar) loaderBar.style.width = '100%';
  if (loaderPercent) loaderPercent.textContent = '100 %';
  if (loaderStatus) {
    loaderStatus.textContent = world ? 'Simulation prête.' : 'WebGL indisponible.';
  }

  window.setTimeout(() => {
    loader?.classList.add('done');
    body.classList.remove('is-loading');
    if (world) world.playIntro();
    window.setTimeout(() => {
      if (loader?.parentNode) loader.style.display = 'none';
    }, 1200);
  }, 380);
}

finishLoading();

// ---------------------------------------------------------------------------
// Balises 3D
// ---------------------------------------------------------------------------

const markerVec = new THREE.Vector3();

projects.forEach((p) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'hotspot';
  btn.dataset.id = p.id;
  btn.setAttribute('aria-label', `${p.title} — ${p.category}`);

  const dot = document.createElement('span');
  dot.className = 'hotspot-dot';
  dot.textContent = p.num;

  const label = document.createElement('span');
  label.className = 'hotspot-label';
  label.textContent = p.short;

  btn.append(dot, label);
  btn.addEventListener('click', () => {
    body.classList.add('has-interacted');
    openProject(p.id, { fly: true });
  });

  hotspotsEl.appendChild(btn);
  p._el = btn;
});

function updateHotspotVisibility() {
  const show = Boolean(world) && annotationsOn && world.getEra() === 'after';
  hotspotsEl.classList.toggle('is-visible', show);
  hotspotsEl.inert = !show;
  hotspotsEl.setAttribute('aria-hidden', String(!show));
  annotationsToggle?.setAttribute('aria-pressed', String(annotationsOn));
}

function updateHotspots() {
  if (!world || !annotationsOn || world.getEra() !== 'after') return;
  const w = window.innerWidth;
  const h = window.innerHeight;

  projects.forEach((p) => {
    if (!p._el) return;
    markerVec.set(p.marker[0], p.marker[1], p.marker[2]).project(world.camera);
    const x = (markerVec.x * 0.5 + 0.5) * w;
    const y = (-markerVec.y * 0.5 + 0.5) * h;
    const behind = markerVec.z > 1;
    const outside = x < -80 || x > w + 80 || y < -60 || y > h + 60;

    p._el.classList.toggle('is-hidden', behind || outside);
    p._el.classList.toggle('flip', x > w * 0.72);

    if (!behind && !outside) {
      p._el.style.left = `${x}px`;
      p._el.style.top = `${y}px`;
    }
  });
}

// ---------------------------------------------------------------------------
// Rail des projets
// ---------------------------------------------------------------------------

projects.forEach((p) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'rail-item';
  btn.dataset.id = p.id;
  btn.setAttribute('aria-label', `${p.title} — ${p.category}, ${p.year}`);

  const num = document.createElement('span');
  num.className = 'rail-num';
  num.textContent = p.num;

  const name = document.createElement('span');
  name.className = 'rail-name';
  name.textContent = p.short;

  const year = document.createElement('span');
  year.className = 'rail-year';
  year.textContent = p.year;

  btn.append(num, name, year);
  btn.addEventListener('click', () => {
    body.classList.add('has-interacted');
    openProject(p.id, { fly: true });
  });

  projectRail.appendChild(btn);
  p._rail = btn;
});

function setActive(id) {
  projects.forEach((p) => {
    p._el?.classList.toggle('is-active', p.id === id);
    p._rail?.classList.toggle('is-active', p.id === id);
  });
}

// ---------------------------------------------------------------------------
// Panneau projet
// ---------------------------------------------------------------------------

function setMore(open) {
  panelMoreBody.hidden = !open;
  panelMore.setAttribute('aria-expanded', String(open));
  const sign = panelMore.querySelector('.panel-more-sign');
  if (sign) sign.textContent = open ? '−' : '+';
}

function renderPanel(p) {
  panelNum.textContent = p.num;
  panelMeta.textContent = `${p.category} · ${p.year}`;
  panelTitle.textContent = p.title;
  panelTagline.textContent = p.tagline;
  panelBody.textContent = p.body;
  panelNote.textContent = p.note;
  panelStep.textContent = `${p.num} / ${String(projects.length).padStart(2, '0')}`;

  panelStats.replaceChildren(
    ...p.stats.map((s) => {
      const el = document.createElement('div');
      el.className = 'panel-stat';
      const strong = document.createElement('strong');
      strong.textContent = s.value;
      const span = document.createElement('span');
      span.textContent = s.label;
      el.append(strong, span);
      return el;
    })
  );

  setMore(false);
  panel.scrollTop = 0;
}

function openProject(id, { fly = true } = {}) {
  const p = projectById(id);
  if (!p || !world) return;

  if (world.getEra() === 'before') {
    applyEra('after', { manual: true });
  }

  selectedId = id;
  renderPanel(p);
  setActive(id);

  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
  body.classList.add('panel-open');
  body.classList.add('has-interacted');

  panelTour.hidden = !tourActive;
  if (tourActive) updateTourUI();

  world.setFocus(p.focus);
  if (fly) world.flyTo(p.view, 1.8);
}

function clearSelection({ reset = true } = {}) {
  selectedId = null;
  tourActive = false;
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  body.classList.remove('panel-open');
  setActive(null);
  syncTourButton();
  if (world) world.setFocus(null);
  if (reset && world) world.resetView();
  panelTour.hidden = true;
}

function closePanel() {
  clearSelection({ reset: true });
}

panelClose.addEventListener('click', closePanel);

function stepProject(dir) {
  const i = selectedId ? projectIndex(selectedId) : -1;
  const next = (i + dir + projects.length) % projects.length;
  openProject(projects[next].id, { fly: true });
}

prevProject.addEventListener('click', () => stepProject(-1));
nextProject.addEventListener('click', () => stepProject(1));

panelMore.addEventListener('click', () => {
  setMore(panelMoreBody.hidden);
});

// ---------------------------------------------------------------------------
// Visite guidée
// ---------------------------------------------------------------------------

function syncTourButton() {
  tourBtn.classList.toggle('is-active', tourActive);
  tourBtn.setAttribute('aria-pressed', String(tourActive));
  const label = tourBtn.querySelector('span');
  if (label) label.textContent = tourActive ? 'Quitter' : 'Visite';
}

function updateTourUI() {
  if (!tourActive || !selectedId) {
    panelTour.hidden = true;
    return;
  }
  panelTour.hidden = false;
  const i = projectIndex(selectedId);
  tourStepLabel.textContent = `Étape ${i + 1} / ${projects.length}`;
  tourProgress.style.width = `${((i + 1) / projects.length) * 100}%`;
  tourNext.textContent = i === projects.length - 1 ? 'Terminer' : 'Suivant →';
  tourPrev.disabled = i === 0;
}

function startTour() {
  if (!world) return;
  tourActive = true;
  syncTourButton();
  openProject(projects[0].id, { fly: true });
  updateTourUI();
  showToast('Visite guidée · 7 étapes');
}

function endTour() {
  const wasActive = tourActive;
  tourActive = false;
  syncTourButton();
  clearSelection({ reset: true });
  if (wasActive) showToast('Visite terminée');
}

tourBtn.addEventListener('click', () => {
  body.classList.add('has-interacted');
  if (tourActive) endTour();
  else startTour();
});

tourNext.addEventListener('click', () => {
  const i = projectIndex(selectedId);
  if (i === projects.length - 1) endTour();
  else openProject(projects[i + 1].id, { fly: true });
});

tourPrev.addEventListener('click', () => {
  const i = projectIndex(selectedId);
  if (i > 0) openProject(projects[i - 1].id, { fly: true });
});

tourExit.addEventListener('click', endTour);

// ---------------------------------------------------------------------------
// Époque / heure
// ---------------------------------------------------------------------------

function updateStatus() {
  const era = world ? world.getEra() : 'after';
  const eraLabel = era === 'after' ? "Aujourd'hui" : '1991';
  const timeText = currentTime === 'night' ? 'Nuit' : 'Jour';
  if (statusLine) statusLine.textContent = `${eraLabel} · ${timeText}`;
}

function applyEra(era, { manual = true } = {}) {
  if (!world) return;
  world.setEra(era);
  body.classList.toggle('era-before', era === 'before');
  body.classList.toggle('era-after', era === 'after');
  $$('[data-set-era]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.setEra === era);
  });
  updateStatus();
  updateHotspotVisibility();

  if (era === 'before') {
    if (selectedId) clearSelection({ reset: true });
    if (tourActive) endTour();
  }
}

function applyTime(time, { manual = true } = {}) {
  if (!world) return;
  currentTime = time;
  world.setTime(time);
  body.classList.toggle('time-night', time === 'night');
  body.classList.toggle('time-day', time === 'day');
  if (timeLabel) timeLabel.textContent = time === 'night' ? 'Nuit' : 'Jour';
  timeToggle?.setAttribute(
    'aria-label',
    time === 'night' ? 'Passer au jour' : 'Passer à la nuit'
  );
  updateStatus();
}

$$('[data-set-era]').forEach((btn) => {
  btn.addEventListener('click', () => {
    body.classList.add('has-interacted');
    applyEra(btn.dataset.setEra, { manual: true });
  });
});

timeToggle.addEventListener('click', () => {
  body.classList.add('has-interacted');
  applyTime(currentTime === 'night' ? 'day' : 'night');
});

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

annotationsToggle.addEventListener('click', () => {
  annotationsOn = !annotationsOn;
  body.classList.add('has-interacted');
  updateHotspotVisibility();
});

// ---------------------------------------------------------------------------
// Caméra
// ---------------------------------------------------------------------------

function resetView() {
  body.classList.add('has-interacted');
  clearSelection({ reset: false });
  world?.resetView();
}

brandHome.addEventListener('click', resetView);
resetViewBtn.addEventListener('click', resetView);
zoomIn.addEventListener('click', () => {
  body.classList.add('has-interacted');
  world?.zoomBy(0.82);
});
zoomOut.addEventListener('click', () => {
  body.classList.add('has-interacted');
  world?.zoomBy(1.22);
});

canvas.addEventListener('pointerdown', () => body.classList.add('has-interacted'), { once: true });

// ---------------------------------------------------------------------------
// Indicateurs interpolés
// ---------------------------------------------------------------------------

const METRICS = [
  { id: 'connectivite', before: 24, after: 92 },
  { id: 'espace', before: 16, after: 84 },
  { id: 'securite', before: 11, after: 76 },
];

function updateMetrics() {
  const p = world && typeof world.getEraProgress === 'function' ? world.getEraProgress() : 1;
  METRICS.forEach((m) => {
    const el = metricEls.find((node) => node.dataset.metric === m.id);
    if (!el) return;
    const value = Math.round(m.before + (m.after - m.before) * p);
    const strong = el.querySelector('.metric-row strong');
    const bar = el.querySelector('.metric-bar i');
    if (strong) strong.textContent = String(value);
    if (bar) bar.style.width = `${value}%`;
  });
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 3000);
}

// ---------------------------------------------------------------------------
// Clavier
// ---------------------------------------------------------------------------

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select, [contenteditable]')) return;

  if (e.key === 'Escape') {
    if (selectedId) closePanel();
    return;
  }

  if (selectedId && e.key === 'ArrowRight') {
    e.preventDefault();
    stepProject(1);
  }
  if (selectedId && e.key === 'ArrowLeft') {
    e.preventDefault();
    stepProject(-1);
  }

  if (e.key.toLowerCase() === 't') applyTime(currentTime === 'night' ? 'day' : 'night');
  if (e.key.toLowerCase() === 'e') applyEra(world?.getEra() === 'before' ? 'after' : 'before');
  if (e.key.toLowerCase() === 'a') {
    annotationsOn = !annotationsOn;
    updateHotspotVisibility();
  }
  if (e.key.toLowerCase() === 'r') resetView();
});

// ---------------------------------------------------------------------------
// Boucle de projection + indicateurs
// ---------------------------------------------------------------------------

function loop() {
  updateHotspots();
  updateMetrics();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

applyEra(initialEra, { manual: false });
applyTime(initialTime, { manual: false });
updateStatus();
updateHotspotVisibility();
updateMetrics();
syncTourButton();
panel.setAttribute('aria-hidden', 'true');
setMore(false);

if (reducedMotion) {
  body.classList.add('reduced-motion');
}
