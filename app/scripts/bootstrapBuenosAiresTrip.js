#!/usr/bin/env node
// Script administrativo MANUAL (no es un endpoint). Asocia idempotentemente el
// viaje "Buenos Aires, 2026" al usuario owner real:
//
//   node scripts/bootstrapBuenosAiresTrip.js --email="correo@example.com"
//
// El email va SIEMPRE por argumento (nunca hardcodeado). No imprime secretos.
import { parseArgs } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTripsCollection, getUsersCollection } from '../lib/platformMongo.js';
import { BUENOS_AIRES_BOOTSTRAP_KEY, bootstrapBuenosAiresTrip } from '../lib/platformBootstrap.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));

// Carga best-effort de .env.local (para correr fuera de Vercel). No pisa vars ya
// presentes en el entorno. Nunca loguea valores.
function loadEnvLocal() {
  const envPath = resolve(scriptDir, '..', '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  const { values } = parseArgs({ options: { email: { type: 'string' } } });
  if (!values.email) {
    console.error('Uso: node scripts/bootstrapBuenosAiresTrip.js --email="correo@example.com"');
    process.exit(1);
  }

  loadEnvLocal();

  const [users, trips] = await Promise.all([getUsersCollection(), getTripsCollection()]);
  const result = await bootstrapBuenosAiresTrip({ email: values.email, collections: { users, trips } });
  console.log(`[bootstrap] Buenos Aires ${result.outcome} · bootstrapKey="${BUENOS_AIRES_BOOTSTRAP_KEY}" · tripId=${result.tripId}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(`[bootstrap] Error: ${error.message}`);
  process.exit(1);
});
