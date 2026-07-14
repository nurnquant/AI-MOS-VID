import { createAssetServices, type AssetServices } from "@aivs/assets";

/** One service container per server process (survives dev hot reloads). */
const globalStore = globalThis as unknown as { aivsServices?: AssetServices };

export function getServices(): AssetServices {
  globalStore.aivsServices ??= createAssetServices();
  return globalStore.aivsServices;
}
