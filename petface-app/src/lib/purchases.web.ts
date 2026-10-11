// Web preview only: in-app purchases exist only in the store builds.
export const purchasesAvailable = () => false;
export const initPurchases = async () => {};
export const hasPremium = async () => false;
export const getPackages = async () => [];
export const buy = async () => "failed" as const;
export const restore = async () => false;
