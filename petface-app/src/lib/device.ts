import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const KEY = "petface.deviceId";
let cached: string | null = null;

/**
 * A random per-install ID. It is also the RevenueCat app user ID, which is
 * how the server links a device to its subscription.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  let id = await SecureStore.getItemAsync(KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync(KEY, id);
  }
  cached = id;
  return id;
}
