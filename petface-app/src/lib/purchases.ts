import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { config } from "./config";
import { getDeviceId } from "./device";

// Thin wrapper over RevenueCat. When no key is configured (local development)
// every call degrades to "not premium" instead of throwing.

let configured = false;

export function purchasesAvailable(): boolean {
  return !!config.revenueCatKey;
}

export async function initPurchases(): Promise<void> {
  if (configured || !purchasesAvailable()) return;
  Purchases.configure({ apiKey: config.revenueCatKey, appUserID: await getDeviceId() });
  configured = true;
}

export async function hasPremium(): Promise<boolean> {
  if (!configured) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[config.premiumEntitlement];
  } catch {
    return false;
  }
}

export async function getPackages(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export type PurchaseOutcome = "purchased" | "cancelled" | "failed";

export async function buy(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active[config.premiumEntitlement] ? "purchased" : "failed";
  } catch (e) {
    if ((e as { userCancelled?: boolean | null }).userCancelled) return "cancelled";
    return "failed";
  }
}

export async function restore(): Promise<boolean> {
  if (!configured) return false;
  const info = await Purchases.restorePurchases();
  return !!info.entitlements.active[config.premiumEntitlement];
}
