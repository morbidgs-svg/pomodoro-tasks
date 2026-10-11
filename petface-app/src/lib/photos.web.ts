// Web preview only: there is no app document folder, so photos keep their
// in-memory URI for the session.
export async function persistPhoto(tempUri: string, _id: string): Promise<string> {
  return tempUri;
}

export function deletePhoto(_uri: string): void {}

export function resolvePhoto(stored: string): string {
  return stored;
}
