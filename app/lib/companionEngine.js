const EVENT_TYPES = Object.freeze({ BEFORE_TRIP: 'before-trip', START: 'start', LAST_DAY: 'last-day', RETURNED: 'returned', WEEK_AFTER: 'week-after' });

function localDate(value, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

function shiftDate(date, amount) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function companionEventForTrip({ trip, preferences, now = new Date(), timeZone }) {
  if (!trip?.id || !trip.startDateTime || !trip.endDateTime || !preferences?.enabled || !timeZone) return null;
  const today = localDate(now, timeZone);
  const start = localDate(trip.startDateTime, timeZone);
  const end = localDate(trip.endDateTime, timeZone);
  const city = trip.destination?.cityName || trip.destination?.city || '';
  const candidate = [
    [shiftDate(start, -1), EVENT_TYPES.BEFORE_TRIP, preferences.beforeTrip, 'Mañana comienza una historia nueva.'],
    [start, EVENT_TYPES.START, preferences.duringTrip, 'Hoy comienza el viaje.'],
    [end, EVENT_TYPES.LAST_DAY, preferences.duringTrip, 'Hoy todavía queda una página por escribir.'],
    [shiftDate(end, 1), EVENT_TYPES.RETURNED, preferences.afterTrip, 'Esta historia ya volvió con ustedes.'],
    [shiftDate(end, 7), EVENT_TYPES.WEEK_AFTER, preferences.futureMemories, city ? `${city} ya lleva una semana con ustedes.` : 'Esta historia ya lleva una semana con ustedes.'],
  ].find(([date, , enabled]) => date === today && enabled);
  if (!candidate) return null;
  const [, type, , body] = candidate;
  return { key: `${trip.id}:${type}:${today}`, type, body, path: `/trips/${trip.id}`, date: today };
}

export function selectCompanionEvents({ trips = [], preferences, now, timeZone, sentKeys = new Set() }) {
  return trips.map((trip) => companionEventForTrip({ trip, preferences, now, timeZone })).filter((event) => event && !sentKeys.has(event.key));
}

export { EVENT_TYPES };
