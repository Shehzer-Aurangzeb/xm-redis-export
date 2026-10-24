import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createClient } from 'redis';
import { xmlToRedisEntries } from './transform.ts';

const usage = 'Usage: export.sh [-v] /path/to/xml';

try {
  const { values, positionals } = parseArgs({
    options: { verbose: { type: 'boolean', short: 'v' } },
    allowPositionals: true,
  });
  if (positionals.length !== 1) throw new Error(usage);

  const [path] = positionals;
  const entries = xmlToRedisEntries(readFileSync(path, 'utf8'));

  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  // Without a listener, a failed connect crashes Node before the catch below runs.
  const redis = createClient({ url, socket: { reconnectStrategy: false } }).on('error', () => {});
  await redis.connect().catch((err) => {
    throw new Error(`Cannot connect to Redis at ${url} (${err.code ?? err.message})`);
  });

  try {
    await redis.mSet(entries);
  } finally {
    await redis.close();
  }

  if (values.verbose) {
    for (const [key, value] of Object.entries(entries)) console.log(`${key} = ${value}`);
  }
} catch (err) {
  console.error(`Error: ${(err as Error).message}`);
  process.exit(1);
}
