import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export type PhotoSource = "camera" | "library";

export type PickResult =
  | { ok: true; uri: string }
  | { ok: false; reason: "cancelled" | "permission" };

export async function pickPhoto(source: PhotoSource): Promise<PickResult> {
  const perm =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: "permission" };

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return { ok: false, reason: "cancelled" };
  return { ok: true, uri: result.assets[0].uri };
}

/**
 * Shrinks the photo to 1024px JPEG before upload: plenty of detail for a
 * face, and it keeps both upload time and Claude image-token cost down.
 */
export async function preparePhoto(uri: string): Promise<{ uri: string; base64: string }> {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 1024 }).renderAsync();
  const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!saved.base64) throw new Error("image encoding failed");
  return { uri: saved.uri, base64: saved.base64 };
}
