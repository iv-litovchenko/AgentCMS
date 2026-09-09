import { z } from "zod";

const STUB_NOTE =
  "Stub only: backend not implemented. Planned GET/POST /api/agent/discuss → awn-storage/_system/discuss/.";

export function registerDiscussTools(reg) {
  reg(
    "zzz_read_discuss_session",
    "Read Discuss panel session (multi-context chat sidebar). " + STUB_NOTE,
    z.object({
      sessionId: z.string().optional().describe("Session id; default = current agent session")
    }),
    ({ sessionId }) => ({
      stub: true,
      status: "not_implemented",
      tool: "zzz_read_discuss_session",
      sessionId: sessionId || null,
      plannedApi: "GET /api/agent/discuss",
      plannedStorage: "awn-storage/_system/discuss/",
      session: null,
      messages: [],
      context: [],
      message: STUB_NOTE
    }),
    { agentScope: false }
  );

  reg(
    "zzz_append_discuss_message",
    "Append message to Discuss panel session. " + STUB_NOTE,
    z.object({
      body: z.string().min(1),
      role: z.enum(["user", "agent"]).optional(),
      author: z.string().optional(),
      sessionId: z.string().optional(),
      context: z
        .array(
          z.object({
            path: z.string().optional(),
            title: z.string().optional(),
            kind: z.string().optional()
          })
        )
        .optional()
        .describe("Context chips attached to the message")
    }),
    ({ body, role, author, sessionId, context }) => ({
      stub: true,
      status: "not_implemented",
      tool: "zzz_append_discuss_message",
      accepted: false,
      plannedApi: "POST /api/agent/discuss",
      plannedStorage: "awn-storage/_system/discuss/",
      payload: {
        body,
        role: role || "agent",
        author: author || null,
        sessionId: sessionId || null,
        context: context || []
      },
      message: STUB_NOTE
    }),
    { agentScope: false }
  );
}
