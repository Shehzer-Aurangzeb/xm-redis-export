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

## Notes

- All keys are written in one atomic `MSET`, so a reader never sees a half-finished export.
- Re-running overwrites existing keys. Cookie keys that were removed from the XML are not deleted.
- Redis data is not persisted to a volume; it lives as long as the Redis container.
