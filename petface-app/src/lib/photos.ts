import { Directory, File, Paths } from "expo-file-system";

function photoDir(): Directory {
  const dir = new Directory(Paths.document, "photos");
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Copies a (cache) photo into permanent storage and returns its new URI. */
export async function persistPhoto(tempUri: string, id: string): Promise<string> {
  const dest = new File(photoDir(), `${id}.jpg`);
  if (dest.exists) dest.delete();
  await new File(tempUri).copy(dest);
  return dest.uri;
}

export function deletePhoto(uri: string): void {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Missing files are fine - the record is going away anyway.
  }
}
