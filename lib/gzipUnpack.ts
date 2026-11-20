// Unpacks a gzip file a piece at a time (2026-11-19).
//
// Why: the food list was carried inside the phone app as a plain 194 MB
// file, the biggest single part of every APK. Tony, the same day: "for the
// love of logic please compress the food list inside the app. The first time
// it loads on a phone after the initial install is fine to be longer as long
// as the user sees and is informed about what they are waiting to happen."
// So the app now carries it gzipped (about 43 MB) and unpacks it on the phone
// the first time it opens, and again only when an update brings a new list.
//
// Kept free of any phone module, so scripts/test_gzip_unpack.js runs it in
// Node against the real file. The caller supplies how to read and write; this
// pushes the pieces through fflate, reports how far it has got, and gives the
// screen a moment between pieces so the progress ring can redraw.
import { Gunzip } from 'fflate';

/** How much of the packed file is read per step: 1 MB. */
export const UNPACK_READ_BYTES = 1 << 20;

export type UnpackIo = {
  /** Size of the packed file, in bytes. */
  packedSize: number;
  /** The next `length` bytes of the packed file (fewer only at its end). */
  read: (length: number) => Uint8Array;
  /** Appends unpacked bytes to the output. */
  write: (bytes: Uint8Array) => void;
  /** Called after each step with how much of the packed file is done, 0 to 1. */
  onProgress?: (fraction: number) => void;
  /** Lets the screen redraw between steps. Defaults to doing nothing. */
  pause?: () => Promise<void>;
};

/**
 * The unpacked size gzip records in its last four bytes (the size modulo
 * 2^32, which is the whole size for any file under 4 GB).
 */
export function recordedUnpackedSize(lastFour: Uint8Array): number {
  if (lastFour.length !== 4) throw new Error('The size gzip records is four bytes.');
  return (lastFour[0] | (lastFour[1] << 8) | (lastFour[2] << 16)) + lastFour[3] * 0x1000000;
}

/**
 * Unpacks the whole file and returns how many bytes were written. Throws if
 * the result is not the size gzip recorded, so a cut-short file is never
 * taken for the food list.
 */
export async function unpackGzip(io: UnpackIo, expectedSize: number | null): Promise<number> {
  let written = 0;
  const gunzip = new Gunzip((chunk) => {
    io.write(chunk);
    written += chunk.length;
  });
  let readSoFar = 0;
  while (readSoFar < io.packedSize) {
    const piece = io.read(Math.min(UNPACK_READ_BYTES, io.packedSize - readSoFar));
    if (piece.length === 0) throw new Error(`The packed file ended early, at ${readSoFar} of ${io.packedSize} bytes.`);
    readSoFar += piece.length;
    gunzip.push(piece, readSoFar >= io.packedSize);
    io.onProgress?.(readSoFar / io.packedSize);
    if (io.pause) await io.pause();
  }
  if (expectedSize !== null && written !== expectedSize) {
    throw new Error(`Unpacked ${written} bytes where ${expectedSize} were expected.`);
  }
  return written;
}
