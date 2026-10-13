import { createRequire } from "node:module";
import { slotsListInputSchema } from "./content-placement-zod.js";

const require = createRequire(import.meta.url);
const { resolveSlotsListAddress } = require("../../lib/config/content-placement.js");

export function registerSlotTools({ reg, client }) {
  const listHandler = async (args) => {
    const { manifestPath, kind } = resolveSlotsListAddress(args);
    const data = await client.get("/api/page/slots", { path: manifestPath });
    return { ...data, placement: { kind, path: manifestPath } };
  };

  reg(
    "list_slots",
    "List storage slots for a container: page, channel, or media (placement.kind + path, or legacy path=manifest).",
    slotsListInputSchema,
    listHandler
  );
}
