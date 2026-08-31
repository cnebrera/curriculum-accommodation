import { crc32 } from 'node:zlib';

/**
 * A minimal, store-only ZIP writer (019 T-ODT).
 *
 * ODT and DOCX are ZIP containers, and this project ships no ZIP library. Two
 * were available transitively — `jszip` via `mammoth`, `archiver` via
 * `electron-builder` — and both were rejected: a dependency reached through
 * somebody else's `package.json` is a dependency nobody declared, which upgrades
 * without review and disappears when the package that brought it changes.
 *
 * Sixty lines and `node:zlib`'s own `crc32` is the smaller liability.
 *
 * ## Store-only, on purpose
 *
 * No deflate. ODF and OOXML both permit stored entries, a worksheet is a few
 * kilobytes of XML, and the compression would buy nothing measurable while adding
 * the one part of a ZIP writer that is easy to get subtly wrong.
 *
 * ## Deterministic, on purpose
 *
 * A fixed timestamp, so the same document produces byte-identical output. This
 * project records provenance and compares documents; a container whose bytes
 * change with the clock makes "is this the same sheet?" unanswerable.
 */

/** 1980-01-01 00:00, the earliest a DOS timestamp can express. */
const DOS_TIME = 0;
const DOS_DATE = 0x0021;

export interface ZipEntry {
  path: string;
  data: string | Uint8Array;
}

const bytes = (d: string | Uint8Array): Uint8Array =>
  typeof d === 'string' ? new TextEncoder().encode(d) : d;

function u16(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
}
function u32(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
}
const cat = (parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};

/**
 * Build the archive.
 *
 * Entry order is preserved and it matters: ODF requires `mimetype` first, and a
 * reader that finds it elsewhere may refuse the file. So this never sorts.
 */
export function zip(entries: readonly ZipEntry[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.path);
    const data = bytes(entry.data);
    const sum = crc32(data);

    const local = cat([
      u32(0x04034b50), u16(20), u16(0), u16(0),          // sig, version, flags, method=store
      u16(DOS_TIME), u16(DOS_DATE),
      u32(sum), u32(data.length), u32(data.length),
      u16(name.length), u16(0),
      name, data,
    ]);
    locals.push(local);

    central.push(cat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), // sig, made-by, needed, flags, method
      u16(DOS_TIME), u16(DOS_DATE),
      u32(sum), u32(data.length), u32(data.length),
      u16(name.length), u16(0), u16(0),                  // name, extra, comment
      u16(0), u16(0), u32(0),                            // disk, internal attrs, external attrs
      u32(offset),
      name,
    ]));

    offset += local.length;
  }

  const dir = cat(central);
  const eocd = cat([
    u32(0x06054b50), u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(dir.length), u32(offset), u16(0),
  ]);

  return cat([...locals, dir, eocd]);
}
