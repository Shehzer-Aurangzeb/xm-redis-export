# XML to Redis export

Reads a `config.xml` file and writes its data to Redis:

- `subdomains` holds a JSON array of all `<subdomain>` values
- `cookie:<name>:<host>` holds the text of each `<cookie name="..." host="...">` element

Node.js + TypeScript, Redis, docker-compose.

## Run

Requires Docker with Compose v2.

```sh
./export.sh config.xml       # export
./export.sh -v config.xml    # export and print every saved key
```

Check the result:

```sh
docker compose exec redis redis-cli get cookie:dlp-avast:amazon
docker compose exec redis redis-cli get subdomains
```

Stop Redis with `docker compose down`.

## Tests

Requires Node.js 22.18 or newer (runs TypeScript directly, no build step).

```sh
npm install
npm test
npm run typecheck
```

## Layout

- `src/transform.ts` turns the XML string into Redis key/value pairs (pure function, no I/O)
- `src/transform.test.ts` unit tests for the transform
- `src/main.ts` CLI: reads the file, writes the keys with one `MSET`, prints them with `-v`
- `export.sh` mounts the XML file into the app container and runs it via `docker compose run`

## Decisions and assumptions

- **Parsing is separate from I/O.** `xmlToRedisEntries` takes a string and returns plain data, so the tests need no Redis, no files and no mocks.
- **Invalid input fails the whole export and writes nothing:** malformed XML (reported with line and column), a missing `<config>` root, a `<cookie>` without `name` or `host`, or a duplicate `name`/`host` pair.
- **Values are stored as they appear in the file**, with surrounding whitespace trimmed. Nothing is corrected (for example `Mmm_fhp_dlp_779_ppc_m`).
- **One atomic `MSET`.** Either all keys are written or none, and a reader never sees a half-finished export.
- **No retry logic.** Compose starts the app only after the Redis healthcheck passes; if Redis is still unreachable, the app fails fast with a clear error.
- **Re-running overwrites keys, but does not delete cookie keys that were removed from the XML.** Deleting `cookie:*` could remove keys this app does not own; doing it safely means tracking the exported key set.
- **No persistence.** Redis data lives as long as the Redis container.

## With more time

- A streaming parser and batched writes for very large files (the whole file is read into memory today).
- Cleanup of stale cookie keys between exports.
- An integration test against a real Redis, run in CI.
