// Web preview only: SecureStore isn't available in browsers.
const KEY = "petface.deviceId";

export async function getDeviceId(): Promise<string> {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
