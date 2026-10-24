import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createClient } from 'redis';
import { xmlToRedisEntries } from './transform.ts';

const { values, positionals } = parseArgs({
  options: { verbose: { type: 'boolean', short: 'v' } },
  allowPositionals: true,
});

if (positionals.length !== 1) {
  console.error('Usage: export.sh [-v] /path/to/xml');
  process.exit(1);
}

const entries = xmlToRedisEntries(readFileSync(positionals[0], 'utf8'));

const redis = await createClient({
  url: process.env.REDIS_URL,
  socket: { reconnectStrategy: false },
}).connect();

try {
  await redis.mSet(entries);
} finally {
  await redis.close();
}

if (values.verbose) {
  for (const [key, value] of Object.entries(entries)) console.log(`${key} = ${value}`);
}
