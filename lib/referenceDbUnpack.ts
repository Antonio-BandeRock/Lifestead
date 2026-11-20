// Puts the food list on the phone from its packed copy (2026-11-19).
//
// The app carries assets/data/foods_reference.db.gz, made from the .db by
// scripts/compress_reference_db.js. This unpacks it beside the database
// folder under a temporary name and swaps it in only once it is whole, so a
// phone that is closed half way keeps the list it had, and the next open
// starts again. The desktop never runs this: its installer carries the plain
// file (lib/desktop/expoSqliteShim.ts).
import { Asset } from 'expo-asset';
import { Directory, File } from 'expo-file-system';
import { recordedUnpackedSize, unpackGzip } from './gzipUnpack';
import { setReferenceUnpackProgress } from './referenceUnpackProgress';

function removeIfThere(uri: string) {
  const file = new File(uri);
  if (file.exists) file.delete();
}

export async function unpackReferenceDatabase(assetModule: number, databaseUri: string): Promise<void> {
  setReferenceUnpackProgress(0);
  try {
    const asset = Asset.fromModule(assetModule);
    await asset.downloadAsync();
    const packed = new File(asset.localUri ?? asset.uri);
    const packedSize = packed.size ?? 0;
    if (packedSize < 18) throw new Error('The packed food list is missing or empty.');

    const reader = packed.open();
    let expected: number | null = null;
    try {
      reader.offset = packedSize - 4;
      expected = recordedUnpackedSize(reader.readBytes(4));
      reader.offset = 0;

      // A fresh install may not have made the database folder yet.
      const folder = new Directory(databaseUri.slice(0, databaseUri.lastIndexOf('/')));
      if (!folder.exists) folder.create({ intermediates: true });

      const tempUri = `${databaseUri}.unpacking`;
      removeIfThere(tempUri);
      const temp = new File(tempUri);
      temp.create();
      const writer = temp.open();
      try {
        await unpackGzip(
          {
            packedSize,
            read: (length) => reader.readBytes(length),
            write: (bytes) => writer.writeBytes(bytes),
            onProgress: (fraction) => setReferenceUnpackProgress(fraction),
            pause: () => new Promise((resolve) => setTimeout(resolve, 0)),
          },
          expected,
        );
      } finally {
        writer.close();
      }

      // Whole: the old list and anything SQLite kept beside it go, then the
      // new one takes its name.
      for (const suffix of ['', '-journal', '-wal', '-shm']) removeIfThere(`${databaseUri}${suffix}`);
      temp.move(new File(databaseUri));
    } finally {
      reader.close();
    }
  } finally {
    setReferenceUnpackProgress(null);
  }
}
