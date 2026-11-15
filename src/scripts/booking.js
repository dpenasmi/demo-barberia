// Reglas de presentación para la DEMO. La disponibilidad real la decide el servidor.
export const SERVICES = {
  corte: { name: 'Corte', duration: 30, price: 24 },
  barba: { name: 'Barba', duration: 25, price: 18 },
  'corte-barba': { name: 'Corte + barba', duration: 50, price: 38 },
};
export const BARBERS = { any: 'Sin preferencia', alex: 'Álex', marc: 'Marc', dani: 'Dani' };
export const TIME_ZONE = 'Europe/Madrid';

export function madridClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

export function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function datePlus(value, days) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function demoSlots(date, serviceId, now = new Date()) {
  const service = SERVICES[serviceId];
  const clock = madridClock(now);
  if (!service || !isDate(date) || date < clock.date || date > datePlus(clock.date, 60)) return [];
  if (new Date(`${date}T12:00:00Z`).getUTCDay() === 0) return [];
  const slots = [];
  for (let minute = 10 * 60; minute + service.duration <= 20 * 60; minute += 30) {
    // En la demo se exige 30 minutos de antelación.
    if (date === clock.date && minute < clock.minute + 30) continue;
    const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
    slots.push({ id: `demo-${date}-${time}`, time });
  }
  return slots;
}

export function readableDate(value) {
  return new Intl.DateTimeFormat('es-ES', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00Z`));
}

export function validApiSlots(data) {
  if (!data || !Array.isArray(data.slots)) throw new Error('La agenda devolvió una respuesta no válida.');
  return data.slots.filter(slot => slot && typeof slot.id === 'string' && slot.id.length > 0 && slot.id.length < 300 && typeof slot.time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.time)).slice(0, 50);
}
