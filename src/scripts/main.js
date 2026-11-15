import { SERVICES, BARBERS, TIME_ZONE, madridClock, datePlus, isDate, demoSlots, readableDate, validApiSlots } from './booking.js';

/* 1. Escenas. Scroll nativo + CSS snap: ratón, touch, teclado y anchors. */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const scenes = [...document.querySelectorAll('.scene')];
const chapterLinks = [...document.querySelectorAll('.chapter-link')];
const counter = document.querySelector('#current-scene');
let currentScene = 0;
if ('IntersectionObserver' in window) {
  document.documentElement.classList.add('motion-ready');
  const ratios = new Map();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => ratios.set(entry.target, entry.intersectionRatio));
    let best = scenes[currentScene];
    let highest = 0;
    ratios.forEach((ratio, scene) => { if (ratio > highest) { highest = ratio; best = scene; } });
    if (highest <= 0) return;
    currentScene = scenes.indexOf(best);
    scenes.forEach(scene => scene.classList.toggle('is-active', scene === best));
    chapterLinks.forEach((link, index) => {
      link.classList.toggle('is-current', index === currentScene);
      if (index === currentScene) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    counter.textContent = String(currentScene + 1).padStart(2, '0');
  }, { threshold: [0, .05, .1, .2, .35, .5, .65, .8, 1] });
  scenes.forEach(scene => observer.observe(scene));
}

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    const id = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
});

// Solo PageUp/PageDown fuera de controles. Rueda, flechas y gestos siguen nativos.
document.addEventListener('keydown', event => {
  if (!['PageDown', 'PageUp'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.target.closest('input, select, textarea, button, a, summary, dialog, [contenteditable]') || document.querySelector('dialog[open]')) return;
  const scene = scenes[currentScene];
  if (scene.getBoundingClientRect().height > window.innerHeight + 60) return;
  const next = Math.max(0, Math.min(scenes.length - 1, currentScene + (event.key === 'PageDown' ? 1 : -1)));
  event.preventDefault();
  scenes[next].scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
});

/* 2. FAQ en diálogo nativo: Escape, foco y cierre por fondo. */
const dialog = document.querySelector('#faq-dialog');
document.querySelector('#open-faq').addEventListener('click', () => {
  dialog.showModal();
  document.body.classList.add('dialog-open');
});
document.querySelector('#close-faq').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
dialog.addEventListener('click', event => {
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
});

/* 3. Reserva: demo sin red por defecto. API configurable, sin secretos en cliente. */
const form = document.querySelector('#booking-form');
const api = form.dataset.api.trim().replace(/\/$/, '');
const demo = api === '';
const service = form.elements.namedItem('service');
const barber = form.elements.namedItem('barber');
const date = form.elements.namedItem('date');
const steps = [...form.querySelectorAll(':scope > fieldset')];
const progress = [...document.querySelectorAll('.booking-progress li')];
const error = document.querySelector('#form-error');
const slotsContainer = document.querySelector('#time-slots');
const availability = document.querySelector('#availability-status');
const detailsButton = document.querySelector('#to-details');
const submitButton = document.querySelector('#submit-booking');
let step = 0;
let slots = [];
let availabilityController;
let requestSequence = 0;
let busy = false;
let idempotencyKey = '';
let payloadFingerprint = '';

if (!demo) {
  document.querySelector('#booking-mode').textContent = 'RESERVA ONLINE';
  document.querySelector('#booking-note').textContent = 'Consulta la disponibilidad de la agenda.';
  document.querySelector('#times-mode').textContent = '';
  submitButton.textContent = 'CONFIRMAR RESERVA ↗';
  document.querySelector('#consent-text').textContent = 'Autorizo el uso de mis datos para gestionar esta cita según la información de privacidad facilitada por la barbería.';
}

function showError(message = '') { error.textContent = message; }

function refreshDateBounds() {
  const today = madridClock().date;
  date.min = today;
  date.max = datePlus(today, 60);
  if (!isDate(date.value) || date.value < today || date.value > date.max) {
    date.value = today;
    if (demo && demoSlots(today, service.value).length === 0) {
      date.value = datePlus(today, 1);
      if (new Date(`${date.value}T12:00:00Z`).getUTCDay() === 0) date.value = datePlus(date.value, 1);
    }
  }
}

function selectedSlot() { return slots.find(slot => slot.id === form.querySelector('input[name="slot"]:checked')?.value); }

function summaryText() {
  const chosen = SERVICES[service.value];
  const slot = selectedSlot();
  return `${chosen.name} · ${chosen.duration} min · ${chosen.price} €\n${readableDate(date.value)} · ${slot?.time || ''} · ${BARBERS[barber.value]}`;
}

function setStep(next, focus = true) {
  step = next;
  steps.forEach((fieldset, index) => {
    fieldset.hidden = index !== step;
    fieldset.disabled = index !== step;
  });
  progress.forEach((item, index) => {
    if (index === step) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
  });
  showError();
  if (step === 2) document.querySelector('#booking-summary').textContent = summaryText();
  if (focus) steps[step].querySelector('input:not([type=hidden]),select,button')?.focus({ preventScroll: true });
}

function renderSlots(nextSlots) {
  slots = nextSlots;
  slotsContainer.replaceChildren();
  nextSlots.forEach((slot, index) => {
    const label = document.createElement('label');
    label.className = 'time-slot';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'slot'; input.value = slot.id;
    input.required = true; input.checked = index === 0;
    const span = document.createElement('span');
    span.textContent = slot.time;
    label.append(input, span); slotsContainer.append(label);
  });
  detailsButton.disabled = nextSlots.length === 0;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options, signal: options.signal || AbortSignal.timeout(15000),
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  if (response.status === 409) { const conflict = new Error('Ese hueco acaba de ocuparse. Elige otra hora.'); conflict.conflict = true; throw conflict; }
  if (!response.ok) throw new Error('No hemos podido conectar con la agenda. Inténtalo de nuevo.');
  return response.json();
}

async function loadAvailability() {
  const sequence = ++requestSequence;
  availabilityController?.abort();
  availabilityController = new AbortController();
  const controller = availabilityController;
  renderSlots([]);
  showError();
  refreshDateBounds();
  if (!date.checkValidity() || !isDate(date.value)) { availability.textContent = 'Selecciona una fecha válida dentro de los próximos 60 días.'; return; }
  if (demo) {
    const result = demoSlots(date.value, service.value);
    renderSlots(result);
    availability.textContent = result.length ? 'Horas simuladas · zona horaria Europe/Madrid.' : 'No hay horas de ejemplo para este día. Prueba otra fecha; los domingos cerramos.';
    return;
  }
  availability.textContent = 'Consultando disponibilidad…';
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const query = new URLSearchParams({ service: service.value, barber: barber.value, date: date.value, timeZone: TIME_ZONE });
    const result = await apiRequest(`/availability?${query}`, { signal: controller.signal });
    if (sequence !== requestSequence) return;
    renderSlots(validApiSlots(result));
    availability.textContent = slots.length ? 'Horas disponibles · Europe/Madrid.' : 'No quedan huecos para este día. Elige otra fecha.';
  } catch (err) {
    if (sequence !== requestSequence) return;
    availability.textContent = '';
    showError(err.name === 'AbortError' ? 'La agenda ha tardado demasiado. Cambia de fecha o vuelve a intentarlo.' : err.message);
  } finally { clearTimeout(timeout); }
}

form.querySelectorAll('.next-step').forEach(button => button.addEventListener('click', async () => {
  if (busy) return;
  if (step === 0) {
    if (!service.reportValidity()) return;
    setStep(1);
    await loadAvailability();
  } else if (step === 1) {
    if (!date.reportValidity()) return;
    if (!selectedSlot()) { showError('Elige una hora disponible para continuar.'); return; }
    setStep(2);
  }
}));
form.querySelectorAll('.back-step').forEach(button => button.addEventListener('click', () => { if (!busy) setStep(Math.max(0, step - 1)); }));
date.addEventListener('change', loadAvailability);
[service, barber].forEach(control => control.addEventListener('change', () => { slots = []; }));
document.querySelectorAll('[data-service], [data-barber]').forEach(link => link.addEventListener('click', () => {
  if (busy) return;
  if (link.dataset.service) service.value = link.dataset.service;
  if (link.dataset.barber) barber.value = link.dataset.barber;
  document.querySelector('#booking-result').hidden = true;
  form.hidden = false;
  slots = [];
  setStep(0, false);
}));

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  if (step !== 2) { steps[step].querySelector('.next-step')?.click(); return; }
  if (!form.reportValidity()) return;
  const clock = madridClock();
  const slot = selectedSlot();
  if (!slot || !isDate(date.value) || date.value < clock.date || date.value > datePlus(clock.date, 60) || (demo && !demoSlots(date.value, service.value).some(item => item.id === slot.id))) {
    setStep(1); await loadAvailability(); showError('Comprueba la fecha y selecciona una hora actualizada.'); return;
  }
  const name = form.elements.namedItem('name').value.trim();
  const email = form.elements.namedItem('email').value.trim();
  const phone = form.elements.namedItem('phone').value.trim();
  if (!name) { showError('Escribe tu nombre.'); return; }
  const summary = summaryText();
  busy = true;
  steps[2].querySelectorAll('input, button').forEach(control => { control.disabled = true; });
  showError(); submitButton.disabled = true;
  submitButton.textContent = demo ? 'PREPARANDO…' : 'CONFIRMANDO…';
  try {
    let bookingId = '';
    if (!demo) {
      const payload = { service: service.value, barber: barber.value, slotId: slot.id, date: date.value, time: slot.time, timeZone: TIME_ZONE, customer: { name, email, phone }, consent: true };
      const fingerprint = JSON.stringify(payload);
      if (fingerprint !== payloadFingerprint) { payloadFingerprint = fingerprint; idempotencyKey = crypto.randomUUID(); }
      const result = await apiRequest('/bookings', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) });
      if (result.status !== 'confirmed' || typeof result.bookingId !== 'string' || !result.bookingId.trim()) throw new Error('La agenda no ha confirmado la cita. No la des por reservada; consulta con la barbería antes de volver a intentarlo.');
      bookingId = result.bookingId;
    }
    document.querySelector('#result-title').textContent = demo ? 'Así de fácil.' : 'Tu cita está confirmada.';
    document.querySelector('#result-copy').textContent = demo
      ? `${name}, así sería tu reserva:\n\n${summary}\n\nSimulación completada. No se ha creado una cita, enviado un email ni guardado tus datos.`
      : `${name}, la agenda ha confirmado tu reserva:\n\n${summary}\n\nReferencia: ${bookingId}`;
    form.hidden = true;
    const resultPanel = document.querySelector('#booking-result');
    resultPanel.hidden = false; resultPanel.focus({ preventScroll: true });
    // No persistimos datos personales en localStorage, cookies o sesión.
    form.elements.namedItem('name').value = '';
    form.elements.namedItem('email').value = '';
    form.elements.namedItem('phone').value = '';
    form.elements.namedItem('consent').checked = false;
  } catch (err) {
    if (err.conflict) { setStep(1); await loadAvailability(); }
    showError(err.name === 'TimeoutError' ? 'No se ha podido verificar la confirmación. Consulta con la barbería antes de repetir la reserva.' : err.message);
  } finally { busy = false; steps[2].querySelectorAll('input, button').forEach(control => { control.disabled = false; }); submitButton.textContent = demo ? 'SIMULAR RESERVA ↗' : 'CONFIRMAR RESERVA ↗'; }
});

document.querySelector('#restart-booking').addEventListener('click', () => {
  form.reset(); slots = []; idempotencyKey = ''; payloadFingerprint = '';
  document.querySelector('#booking-result').hidden = true;
  form.hidden = false; refreshDateBounds(); setStep(0);
});
refreshDateBounds();
setStep(0, false);
