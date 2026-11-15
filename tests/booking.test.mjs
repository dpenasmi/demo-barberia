import test from 'node:test';
import assert from 'node:assert/strict';
import { madridClock, demoSlots, isDate, datePlus, validApiSlots } from '../src/scripts/booking.js';

test('Madrid cambia de día respecto a UTC y contempla el horario de verano', () => {
  assert.deepEqual(madridClock(new Date('2026-06-01T22:30:00Z')), { date: '2026-06-02', minute: 30 });
  assert.deepEqual(madridClock(new Date('2026-11-14T23:30:00Z')), { date: '2026-11-15', minute: 30 });
});
test('rechaza fechas inexistentes y calcula los límites entre años', () => {
  assert.equal(isDate('2026-02-30'), false);
  assert.equal(isDate('2026-02-28'), true);
  assert.equal(datePlus('2026-12-31', 1), '2027-01-01');
});
test('no ofrece pasado, domingos ni fechas fuera del horizonte', () => {
  const now = new Date('2026-11-14T09:00:00Z');
  assert.deepEqual(demoSlots('2026-11-13', 'corte', now), []);
  assert.deepEqual(demoSlots('2026-11-15', 'corte', now), []);
  assert.deepEqual(demoSlots('2027-05-01', 'corte', now), []);
});
test('deja antelación y no permite que el servicio termine después del cierre', () => {
  const now = new Date('2026-11-14T17:45:00Z'); // 18:45 Madrid.
  assert.deepEqual(demoSlots('2026-11-14', 'corte-barba', now), []);
  assert.equal(demoSlots('2026-11-14', 'corte', now)[0].time, '19:30');
  const future = demoSlots('2026-11-16', 'corte-barba', now);
  assert.equal(future.at(-1).time, '19:00');
});
test('descarta huecos de API sin identificador o con horas inválidas', () => {
  assert.deepEqual(validApiSlots({ slots: [{ id: 'abc', time: '16:00' }, { id: '', time: '10:00' }, { id: 'x', time: '29:00' }] }), [{ id: 'abc', time: '16:00' }]);
  assert.throws(() => validApiSlots({ wrong: [] }));
});
