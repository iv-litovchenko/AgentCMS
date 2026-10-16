import { createRequire } from "node:module";
import { slotsListInputSchema } from "./content-placement-zod.js";

const require = createRequire(import.meta.url);
const {
  resolveSlotsListAddress,
  formatPublicPlacement
} = require("../../lib/config/content-placement.js");

export function registerSlotTools({ reg, client }) {
  const listHandler = async (args) => {
    const { manifestPath, kind } = resolveSlotsListAddress(args);
    const data = await client.get("/api/page/slots", { path: manifestPath });
    return { ...data, placement: formatPublicPlacement(kind, manifestPath) };
  };

  reg(
    "list_slots",
    "List storage slots for a container: topic | channel | media | database | repository (placement.kind + slug path, or legacy path with hub prefix).",
    slotsListInputSchema,
    listHandler
  );
}
