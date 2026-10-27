#!/usr/bin/env node
"use strict";

/**
 * Refactor 15 — smoke «одна дверь» (app-* на CMS).
 *
 * Usage:
 *   node scripts/refactor-15-app-door-check.js [baseUrl]
 *   node scripts/refactor-15-app-door-check.js --offline   # только статика реестра (1.4)
 *
 * Default baseUrl: http://127.0.0.1:3000
 */

const path = require("path");
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const offlineOnly = args.includes("--offline");
const baseUrl = (args.find((a) => !a.startsWith("-")) || "http://127.0.0.1:3000").replace(/\/$/, "");

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0" && /^https:/i.test(baseUrl)) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const INTERNAL_PORT_IN_URL = /:(3088|3188|3288|3490)\b/;

async function withEnv(overrides, fn) {
  const saved = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    const val = overrides[key];
    if (val === undefined || val === null) delete process.env[key];
    else process.env[key] = String(val);
  }
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(overrides)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

async function runStaticChecks() {
  let failed = 0;
  const { legacyAppRedirect, buildPlatformAppsPayload, PLATFORM_APP_CATALOG } = require(path.join(
    ROOT,
    "lib/platform/platform-apps"
  ));
  const { isSinglePublicHttpDoor, getClientFacingPorts } = require(path.join(
    ROOT,
    "lib/platform/single-door-ports"
  ));

  const legacyCases = [
    ["/control", "/app-control/"],
    ["/mcp", "/app-mcp"],
    ["/shell", "/app-chat/"],
    ["/commander", "/app-commander/"]
  ];
  for (const [from, to] of legacyCases) {
    const got = legacyAppRedirect(from);
    if (got !== to) {
      console.error(`FAIL legacy ${from} → expected ${to}, got ${got}`);
      failed += 1;
    } else {
      console.log(`OK   legacy redirect ${from} → ${to}`);
    }
  }

  const requiredPaths = new Set(["/", "/app-chat", "/app-commander", "/app-control", "/app-mcp"]);
  for (const entry of PLATFORM_APP_CATALOG) {
    if (!requiredPaths.has(entry.publicPath)) continue;
  }
  for (const need of requiredPaths) {
    if (!PLATFORM_APP_CATALOG.some((e) => e.publicPath === need)) {
      console.error(`FAIL catalog missing publicPath ${need}`);
      failed += 1;
    }
  }

  const publicUrlScenarios = [
    { label: "localhost", AGENT_CMS_PUBLIC_URL: "http://127.0.0.1:3000" },
    { label: "domain", AGENT_CMS_PUBLIC_URL: "https://sitename.example" },
    { label: "public-ip", AGENT_CMS_PUBLIC_URL: "http://203.0.113.10" }
  ];

  for (const scenario of publicUrlScenarios) {
    await withEnv(
      {
        AGENT_CMS_PUBLIC_URL: scenario.AGENT_CMS_PUBLIC_URL,
        AGENT_CMS_SINGLE_HTTP_DOOR: "1",
        AGENT_CMS_EXPOSE_INTERNAL_PORTS: "0",
        NODE_ENV: "production"
      },
      async () => {
        const payload = await buildPlatformAppsPayload({ projectRoot: ROOT });
        const base = String(payload.publicBaseUrl || "").replace(/\/+$/, "");
        if (base !== scenario.AGENT_CMS_PUBLIC_URL.replace(/\/+$/, "")) {
          console.error(
            `FAIL publicBase (${scenario.label}): expected ${scenario.AGENT_CMS_PUBLIC_URL}, got ${payload.publicBaseUrl}`
          );
          failed += 1;
          return;
        }
        for (const app of payload.apps || []) {
          if (typeof app.publicUrl !== "string") continue;
          if (INTERNAL_PORT_IN_URL.test(app.publicUrl)) {
            console.error(`FAIL publicUrl (${scenario.label}) ${app.appId}: ${app.publicUrl}`);
            failed += 1;
          }
          if (!app.publicUrl.startsWith(base)) {
            console.error(`FAIL publicUrl prefix (${scenario.label}) ${app.appId}: ${app.publicUrl}`);
            failed += 1;
          }
        }
        console.log(`OK   public URL matrix (${scenario.label})`);
      }
    );
  }

  await withEnv({ AGENT_CMS_SINGLE_HTTP_DOOR: "1", AGENT_CMS_EXPOSE_INTERNAL_PORTS: "0" }, async () => {
    if (!isSinglePublicHttpDoor()) {
      console.error("FAIL isSinglePublicHttpDoor should be true by default");
      failed += 1;
    } else {
      console.log("OK   isSinglePublicHttpDoor default");
    }
    const ports = getClientFacingPorts();
    if (ports.voiceHttp !== ports.editorHttp || ports.mcpHttp !== ports.editorHttp) {
      console.error("FAIL getClientFacingPorts should align voice/mcp with editor");
      failed += 1;
    } else {
      console.log("OK   getClientFacingPorts aligned");
    }
  });

  return failed;
}

const liveChecks = [
  { name: "editor /", path: "/", expectStatus: (s) => s >= 200 && s < 400 },
  { name: "app-chat", path: "/app-chat/", expectStatus: (s) => s >= 200 && s < 400 },
  { name: "app-control", path: "/app-control/", expectStatus: (s) => s >= 200 && s < 500 },
  { name: "app-commander", path: "/app-commander/", expectStatus: (s) => s >= 200 && s < 500 },
  { name: "app-mcp", path: "/app-mcp", expectStatus: (s) => s >= 200 && s < 500 },
  {
    name: "legacy /control redirect",
    path: "/control",
    expectStatus: (s) => s === 301 || s === 302,
    expectLocation: (loc) => loc && loc.includes("/app-control")
  },
  {
    name: "legacy /shell redirect",
    path: "/shell",
    expectStatus: (s) => s === 301 || s === 302,
    expectLocation: (loc) => loc && loc.includes("/app-chat")
  },
  {
    name: "legacy /commander redirect",
    path: "/commander",
    expectStatus: (s) => s === 301 || s === 302,
    expectLocation: (loc) => loc && loc.includes("/app-commander")
  },
  { name: "platform apps API", path: "/api/platform/apps", expectStatus: (s) => s === 200, json: true },
  { name: "platform edge services API", path: "/api/platform/services", expectStatus: (s) => s === 200, json: true },
  {
    name: "editor styles.css",
    path: "/editor/styles.css",
    expectStatus: (s) => s === 200,
    expectContentType: (ct) => ct && ct.includes("text/css")
  },
  {
    name: "voice shell.css (legacy /shell)",
    path: "/shell/shell.css",
    expectStatus: (s) => s === 200,
    expectContentType: (ct) => ct && ct.includes("text/css")
  },
  {
    name: "voice shell.css (/app-chat rewrite)",
    path: "/app-chat/shell.css",
    expectStatus: (s) => s === 200,
    expectContentType: (ct) => ct && ct.includes("text/css")
  },
  {
    name: "commander app-lock css",
    path: "/shell/shell-app-lock.css",
    expectStatus: (s) => s === 200,
    expectContentType: (ct) => ct && ct.includes("text/css")
  },
  {
    name: "control styles.css",
    path: "/app-control/styles.css",
    expectStatus: (s) => s === 200,
    expectContentType: (ct) => ct && ct.includes("text/css")
  },
  {
    name: "control app.js",
    path: "/app-control/app.js",
    expectStatus: (s) => s === 200,
    expectContentType: (ct) => ct && ct.includes("javascript")
  },
  {
    name: "editor app-lock.js",
    path: "/editor/js/app/app-lock.js",
    expectStatus: (s) => s === 200,
    expectContentType: (ct) => ct && ct.includes("javascript")
  },
  { name: "app-lock status API", path: "/api/app-lock/status", expectStatus: (s) => s === 200 }
];

async function headOrGet(urlPath, json) {
  const url = `${baseUrl}${urlPath}`;
  const res = await fetch(url, { redirect: "manual", headers: { Accept: json ? "application/json" : "*/*" } });
  let body = null;
  if (json && res.status === 200) {
    body = await res.json();
  }
  return {
    status: res.status,
    location: res.headers.get("location"),
    contentType: res.headers.get("content-type"),
    body
  };
}

async function runLiveChecks() {
  let failed = 0;
  for (const check of liveChecks) {
    try {
      const { status, location, contentType, body } = await headOrGet(check.path, check.json);
      const ok = check.expectStatus(status);
      if (!ok) {
        console.error(`FAIL ${check.name}: HTTP ${status}${location ? ` → ${location}` : ""}`);
        failed += 1;
        continue;
      }
      if (check.expectContentType && !check.expectContentType(contentType || "")) {
        console.error(`FAIL ${check.name}: Content-Type ${contentType}`);
        failed += 1;
        continue;
      }
      if (check.expectLocation && !check.expectLocation(location)) {
        console.error(`FAIL ${check.name}: bad Location ${location}`);
        failed += 1;
        continue;
      }
      if (check.json && body?.apps) {
        const bad = body.apps.filter(
          (a) => typeof a.publicUrl === "string" && INTERNAL_PORT_IN_URL.test(a.publicUrl)
        );
        if (bad.length) {
          console.error(`FAIL ${check.name}: internal ports in publicUrl:`, bad.map((a) => a.appId));
          failed += 1;
          continue;
        }
        const paths = new Set(body.apps.map((a) => a.publicPath));
        for (const need of ["/app-chat", "/app-commander", "/app-control", "/app-mcp"]) {
          if (!paths.has(need)) {
            console.error(`FAIL ${check.name}: missing catalog path ${need}`);
            failed += 1;
          }
        }
        const base = String(body.publicBaseUrl || "").replace(/\/+$/, "");
        if (base && !baseUrl.startsWith(base.split("://")[0])) {
          // host may differ 127.0.0.1 vs localhost — skip strict host match
        }
      }
      console.log(`OK   ${check.name} (${status})`);
    } catch (error) {
      console.error(`FAIL ${check.name}: ${error.message}`);
      failed += 1;
    }
  }
  return failed;
}

async function main() {
  console.log("--- Refactor 15 app-door (static / 1.4) ---");
  let failed = await runStaticChecks();

  if (!offlineOnly) {
    console.log(`\n--- Live smoke @ ${baseUrl} ---`);
    failed += await runLiveChecks();
  }

  if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll app-door checks passed");
}

main();
