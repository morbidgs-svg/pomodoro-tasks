import { Directory, File, Paths } from "expo-file-system";

// History stores photo paths relative to the app's document folder, because
// on iOS the absolute container path changes when the app is updated.
const DIR = "photos";

function photoDir(): Directory {
  const dir = new Directory(Paths.document, DIR);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function isAbsolute(uri: string): boolean {
  return /^(file|data|blob|https?):/.test(uri);
}

/** Turns a stored photo path into a URI the image components can load. */
export function resolvePhoto(stored: string): string {
  return isAbsolute(stored) ? stored : new File(Paths.document, stored).uri;
}

/** Copies a (cache) photo into permanent storage; returns the path to store. */
export async function persistPhoto(tempUri: string, id: string): Promise<string> {
  const name = `${id}.jpg`;
  const dest = new File(photoDir(), name);
  if (dest.exists) dest.delete();
  await new File(tempUri).copy(dest);
  return `${DIR}/${name}`;
}

export function deletePhoto(stored: string): void {
  try {
    const f = new File(resolvePhoto(stored));
    if (f.exists) f.delete();
  } catch {
    // Missing files are fine - the record is going away anyway.
  }
}
