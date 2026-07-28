import { z } from "zod";

export function registerSlotTools({ reg, client, pagePath }) {
  reg(
    "list_page_slots",
    "List storage slots for a page: slot key, driver (external|internal), path, allowedContent, acceptFiles.",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/page/slots", { path })
  );
}
