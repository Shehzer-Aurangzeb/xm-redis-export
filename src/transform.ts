import { XMLParser, XMLValidator } from 'fast-xml-parser';

type Cookie = { name?: string; host?: string; '#text'?: string };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  isArray: (tagName) => tagName === 'subdomain' || tagName === 'cookie',
});

export function xmlToRedisEntries(xml: string): Record<string, string> {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    const { msg, line, col } = validation.err;
    throw new Error(`Invalid XML at line ${line}, column ${col}: ${msg}`);
  }

  const { config } = parser.parse(xml);
  if (config === undefined) throw new Error('Missing <config> root element');

  const subdomains: string[] = config.subdomains?.subdomain ?? [];
  const cookies: Cookie[] = config.cookies?.cookie ?? [];

  const entries: Record<string, string> = { subdomains: JSON.stringify(subdomains) };
  for (const { name, host, '#text': value = '' } of cookies) {
    if (!name || !host) throw new Error(`<cookie> needs name and host attributes, got: ${value}`);
    const key = `cookie:${name}:${host}`;
    if (Object.hasOwn(entries, key)) throw new Error(`Duplicate <cookie> name="${name}" host="${host}"`);
    entries[key] = value;
  }
  return entries;
}
