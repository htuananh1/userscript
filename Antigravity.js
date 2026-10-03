var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
// Single source of truth for the Antigravity client version reported to Google.
// Update this one line when a new IDE release lands: https://antigravity.google/docs/changelog/?tab=hub
var CLIENT_VERSION = "2.19.1";
var CONFIG = {
  clientId: "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com",
  clientSecret: "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",
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  redirectUri: "http://localhost:8085/callback",
  scopes: [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/cclog",
    "https://www.googleapis.com/auth/experimentsandconfigs"
  ],
  loadCodeAssistUrl: "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist",
  onboardUserUrl: "https://cloudcode-pa.googleapis.com/v1internal:onboardUser",
  fetchModelsUrl: "https://daily-cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels",
  quotaSummaryUrl: "https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary",
  chatDailyEndpoint: "https://daily-cloudcode-pa.googleapis.com",
  userAgent: `antigravity/ide/${CLIENT_VERSION} darwin/arm64`
};
var DEFAULT_FALLBACK_MODELS = [
  { id: "gemini-3.8-flash-high", upstream: "gemini-3.8-flash-high" },
  { id: "gemini-3.8-flash-medium", upstream: "gemini-3.8-flash-medium" },
  { id: "gemini-3.8-flash-low", upstream: "gemini-3.8-flash-low" },
  { id: "gemini-3.8-flash", upstream: "gemini-3.8-flash-tiered" },
  { id: "gemini-3.1-pro-high", upstream: "gemini-3.1-pro-high" },
  { id: "gemini-pro-agent", upstream: "gemini-pro-agent" },
  { id: "claude-sonnet-4-6", upstream: "claude-sonnet-4-6" },
  { id: "claude-opus-4-6-thinking", upstream: "claude-opus-4-6-thinking" },
  { id: "gpt-oss-120b", upstream: "gpt-oss-120b-medium" },
  { id: "gpt-oss-120b-medium", upstream: "gpt-oss-120b-medium" }
];
var DEFAULT_FALLBACK_THOUGHT_SIGNATURE = "ErIFCq8FAWkUfRNRX+NpVttXND51fOWY2hAQlaCbGt6pi0rvvTxuV8kx81UNuxvcT5yUwIw/bXJgBlSGjXDEmRfsrsPLVRhu5mCSLhO2CPEBn5wZI6RecFaTIWpvFzNq176sQpq29EI3xWzMkn1XqdJ/smbc8H+g4Mdl3X5QmoRTbLkP7YIIxJkF+V2XdN5yIgmG8Uv8kPWoK/LsYdGM+oKB49HFY0aZOtdyhYxFW8c/02Dw87SRWRN9jBPY1aQNbol2kk+/HYCD+Otcl4soCMNyVlY6441qnq3kNo/c+CA6r60wKrLV9vmVwoezRYfE4d08e7nho8p2HmckbMJeBU6mhA+/yNR3yVYo8LAS6QYD0HnkDbEFazg1Ubi1v+hjT48Goo9yFDKenaMAzrZSbTZxKVxkjfe04hoBKbrqVBxiEP69QUIF4KrSn+aH5XcBkVMqPfU/QzHjjgKTEUMEqIdeYFzd1F1Vo+rwrVM13LyWrvZU5WnD5+Z34afw9EFQgWXK3VOy8wqi0qXu6hFWWjw+8te5n8s7EITqp7JzlIOIkLrsKhbK9CnnKw3YkZEGjlyc6noDFmi10uvQqsN7LxLrv4kniZbjgdc5tvlf/c2BE9My+cQzGY2Y3YQLcz6Ggoi0ZNP+8AZ3u7KNXTr+Awr564Hnfy3oYq5zVLDObDZU5JToWh9oYRiplL13A3XN9Cgf6XdW/IG2/UsOuql/t6B0nmjOYl9Xl7WZbrGhtMtdKmnGGpf+3uSTXr+/GbuRMZERKcokFlKlaLYj0O1TWeVD7bkKIprzE1o3EDaA/wk2wMVPUR/Ec+LiNivDaBV7S+/BYo+KBH953S4GusDdnHdSnx383MXNzfJG8bAb6cEgaWnUHWbc48bVbmc6mAhgJtG+bS/SvFoAWRqgTeeYOi5Lo7s7";
var memoryCache = {
  accounts: null,
  accountsLoadedAt: 0,
  models: null,
  modelsExpiresAt: 0,
  cachedApiKey: null,
  apiKeyLoadedAt: 0,
  allowedKeysOverride: null,
  allowedKeysOverrideAt: 0,
  accountsLock: null,
  usageCache: /* @__PURE__ */ new Map(),
  refreshLocks: /* @__PURE__ */ new Map(),
  signatures: /* @__PURE__ */ new Map(),
  latestSignature: DEFAULT_FALLBACK_THOUGHT_SIGNATURE,
  lastKvSig: null,
  lastKvSigTime: 0,
  rrCounter: 0,
  swrrState: /* @__PURE__ */ new Map()
};
async function safeKvPut(kv, key, value, options) {
  if (!kv || !key || value === void 0) return false;
  try {
    if (options) {
      await kv.put(key, value, options);
    } else {
      await kv.put(key, value);
    }
    return true;
  } catch (err) {
    console.warn(`[KV Warning] B\u1ECF qua l\u1ED7i ghi KV '${key}' (c\xF3 th\u1EC3 do ch\u1EA1m quota 1000 put/ng\xE0y):`, err?.message);
    return false;
  }
}
__name(safeKvPut, "safeKvPut");
var index_default = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return handleCors();
    }
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    try {
      if (pathname === "/" || pathname === "/login") {
        const isAuthed = await verifyApiKey(request, env);
        if (!isAuthed) {
          return renderLoginScreen();
        }
        return await renderDashboard(request, env);
      }
      if (pathname === "/logout") {
        return new Response(null, {
          status: 302,
          headers: {
            "Location": "/",
            "Set-Cookie": "gateway_key=; Path=/; Max-Age=0; SameSite=Strict; HttpOnly; Secure"
          }
        });
      }
      if (pathname === "/api/auth/login" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const key = (body.key || "").trim();
        const allowedKeys = await getAllowedApiKeys(env);
        const ok = key && allowedKeys.some((k) => timingSafeEqualStrings(k, key));
        if (ok) {
          return Response.json({ success: true }, {
            headers: {
              ...corsHeaders(),
              "Set-Cookie": sessionCookie(key)
            }
          });
        }
        if (key) recordAuthFailure(key);
        return Response.json({ success: false, error: "API Key không chính xác!" }, {
          status: 401,
          headers: corsHeaders()
        });
      }
      if (pathname === "/api/auth/exchange" && request.method === "POST") {
        if (!await verifyApiKey(request, env)) return unauthorizedResponse();
        return await handleExchangeCode(request, env);
      }
      if (pathname === "/api/accounts" && request.method === "GET") {
        if (!await verifyApiKey(request, env)) return unauthorizedResponse();
        return await handleGetAccounts(env);
      }
      if (pathname.startsWith("/api/accounts/") && request.method === "DELETE") {
        if (!await verifyApiKey(request, env)) return unauthorizedResponse();
        const id = pathname.replace("/api/accounts/", "").trim();
        return await handleDeleteAccount(env, id);
      }
      if (pathname === "/api/usage" && request.method === "GET") {
        if (!await verifyApiKey(request, env)) return unauthorizedResponse();
        const accountId = url.searchParams.get("accountId") || "";
        return await handleGetUsage(env, accountId);
      }
      if (pathname === "/api/balance" && request.method === "GET") {
        if (!await verifyApiKey(request, env)) return unauthorizedResponse();
        const model = url.searchParams.get("model") || "gemini-3.8-flash-high";
        return await handleGetBalanceStatus(env, model);
      }
      if (pathname === "/api/models/sync" && request.method === "POST") {
        if (!await verifyApiKey(request, env)) return unauthorizedResponse();
        return await handleSyncModels(env);
      }
      if (pathname === "/api/key/update" && request.method === "POST") {
        if (!await verifyApiKey(request, env)) return unauthorizedResponse();
        return await handleUpdateApiKey(request, env);
      }
      if ((pathname === "/v1/models" || pathname === "/models") && request.method === "GET") {
        if (!await verifyApiKey(request, env)) return unauthorizedResponse();
        return await handleListModels(env);
      }
      if ((pathname === "/v1/chat/completions" || pathname === "/chat/completions") && request.method === "POST") {
        if (!await verifyApiKey(request, env)) return unauthorizedResponse();
        return await handleChatCompletions(request, env, ctx);
      }
      if (pathname === "/api/stats" && request.method === "GET") {
        if (!await verifyApiKey(request, env)) return unauthorizedResponse();
        return Response.json({
          success: true,
          enabled: false,
          message: "T\xEDnh n\u0103ng th\u1ED1ng k\xEA token \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EE1 b\u1ECF \u0111\u1EC3 t\u1ED1i \u01B0u hi\u1EC7u n\u0103ng v\xE0 \u0111\u1ED9 \u1ED5n \u0111\u1ECBnh."
        }, { headers: corsHeaders() });
      }
      return new Response("Not Found", { status: 404 });
    } catch (err) {
      return new Response(JSON.stringify({
        error: {
          message: err?.message || String(err),
          type: "internal_server_error",
          code: 500
        }
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() }
      });
    }
  },
  // =========================================================================
  // CRON TRIGGER: TỰ ĐỘNG ĐỒNG BỘ MODELS MỚI NHẤT TỪ UPSTREAM
  // Cấu hình lịch trong wrangler.toml ([triggers] crons). Xem log qua `wrangler tail`.
  // =========================================================================
  async scheduled(controller, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const result = await refreshModelsCache(env);
        if (result && result.added.length > 0) {
          console.log(`[Cron Models Sync] \u2705 \u0110\xE3 t\u1EF1 \u0111\u1ED9ng c\u1EADp nh\u1EADt ${result.added.length} model m\u1EDBi: ${result.added.join(", ")}`);
        } else if (result) {
          console.log(`[Cron Models Sync] OK (${result.models.length} models), kh\xF4ng c\xF3 model m\u1EDBi.`);
        } else {
          console.warn("[Cron Models Sync] B\u1ECF qua l\u1EA7n n\xE0y: upstream kh\xF4ng ph\u1EA3n h\u1ED3i ho\u1EB7c pool ch\u01B0a c\xF3 t\xE0i kho\u1EA3n.");
        }
      } catch (err) {
        console.warn("[Cron Models Sync] L\u1ED7i:", err?.message || String(err));
      }
    })());
  }
};
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key"
  };
}
__name(corsHeaders, "corsHeaders");
function handleCors() {
  return new Response(null, { headers: corsHeaders() });
}
__name(handleCors, "handleCors");
function decodeJwtEmail(jwt) {
  if (!jwt) return null;
  try {
    const parts = jwt.split(".");
    if (parts.length >= 2) {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = atob(base64);
      const payload = JSON.parse(json);
      return payload.email || payload.sub || null;
    }
  } catch (_) {
  }
  return null;
}
__name(decodeJwtEmail, "decodeJwtEmail");
async function getAllowedApiKeys(env) {
  // A key just rotated through /api/key/update wins for 5 minutes. The KV value
  // is the source of truth but env.API_KEY is an operator-managed binding the
  // Worker cannot delete, so honour the rotation first and let the operator
  // remove the old env var.
  if (memoryCache.allowedKeysOverride && Date.now() - (memoryCache.allowedKeysOverrideAt || 0) < 3e5) {
    return memoryCache.allowedKeysOverride.slice();
  }
  const keys = [];
  const envKey = (env.API_KEY || "").trim();
  if (envKey) keys.push(envKey);
  const now = Date.now();
  if (memoryCache.cachedApiKey && now - memoryCache.apiKeyLoadedAt < 3e4) {
    if (memoryCache.cachedApiKey && !keys.includes(memoryCache.cachedApiKey)) {
      keys.push(memoryCache.cachedApiKey);
    }
  } else if (env.ANTIGRAVITY_KV) {
    try {
      const customKey = await env.ANTIGRAVITY_KV.get("custom_api_key");
      if (customKey && customKey.trim()) {
        const trimmed = customKey.trim();
        memoryCache.cachedApiKey = trimmed;
        memoryCache.apiKeyLoadedAt = now;
        if (!keys.includes(trimmed)) {
          keys.push(trimmed);
        }
      }
    } catch (_) {
    }
  }
  return keys;
}
__name(getAllowedApiKeys, "getAllowedApiKeys");
async function getRequiredApiKey(env) {
  const envKey = (env.API_KEY || "").trim();
  if (envKey) return envKey;
  const now = Date.now();
  if (memoryCache.cachedApiKey && now - memoryCache.apiKeyLoadedAt < 3e4) {
    return memoryCache.cachedApiKey;
  }
  if (env.ANTIGRAVITY_KV) {
    try {
      const customKey = await env.ANTIGRAVITY_KV.get("custom_api_key");
      if (customKey && customKey.trim()) {
        memoryCache.cachedApiKey = customKey.trim();
        memoryCache.apiKeyLoadedAt = now;
        return customKey.trim();
      }
    } catch (_) {
    }
  }
  return "";
}
__name(getRequiredApiKey, "getRequiredApiKey");
function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}
__name(getCookie, "getCookie");
function maskKey(key) {
  if (!key) return "••••••••";
  if (key.length <= 12) return key.slice(0, 4) + "••••" + key.slice(-2);
  return key.slice(0, 9) + "••••••••••••••••" + key.slice(-4);
}
__name(maskKey, "maskKey");
// One place builds the auth cookie so Secure/SameSite can never drift again.
function sessionCookie(key) {
  return `gateway_key=${encodeURIComponent(key)}; Path=/; Max-Age=2592000; SameSite=Strict; HttpOnly; Secure`;
}
__name(sessionCookie, "sessionCookie");
async function verifyApiKey(request, env) {
  const allowedKeys = await getAllowedApiKeys(env);
  // Fail CLOSED. An empty allow-list used to mean "no auth configured, allow all",
  // which turned the whole pool into a public endpoint the moment API_KEY was
  // unset. A missing config is an operator error, not a valid credential.
  if (allowedKeys.length === 0) {
    console.error("[Auth] Không có API Key nào được cấu hình (env.API_KEY hoặc KV custom_api_key). Từ chối truy cập.");
    return false;
  }
  const authHeader = request.headers.get("Authorization") || "";
  const bearerKey = authHeader.replace(/^Bearer\s+/i, "").trim();
  const xApiKey = (request.headers.get("X-API-Key") || "").trim();
  const cookieKey = (getCookie(request, "gateway_key") || "").trim();
  const presentedKey = bearerKey || xApiKey || cookieKey;
  if (!presentedKey) return false;
  if (!rateLimitAuth(presentedKey)) return false;
  const ok = allowedKeys.some((k) => timingSafeEqualStrings(k, presentedKey));
  if (!ok) recordAuthFailure(presentedKey);
  return ok;
}
__name(verifyApiKey, "verifyApiKey");
var AUTH_FAILURE_WINDOW_MS = 6e5;
var AUTH_MAX_FAILURES = 8;
var authFailures = /* @__PURE__ */ new Map();
function rateLimitAuth(key) {
  const now = Date.now();
  const rec = authFailures.get(key);
  if (!rec || now - rec.first > AUTH_FAILURE_WINDOW_MS) return true;
  if (rec.count < AUTH_MAX_FAILURES) return true;
  return false;
}
__name(rateLimitAuth, "rateLimitAuth");
function recordAuthFailure(key) {
  const now = Date.now();
  const rec = authFailures.get(key);
  if (!rec || now - rec.first > AUTH_FAILURE_WINDOW_MS) {
    authFailures.set(key, { first: now, count: 1 });
    return;
  }
  rec.count++;
  if (authFailures.size > 512) {
    for (const [k, v] of authFailures) {
      if (now - v.first > AUTH_FAILURE_WINDOW_MS) authFailures.delete(k);
    }
  }
}
__name(recordAuthFailure, "recordAuthFailure");
// Constant-time compare. String equality leaks length and prefix via timing,
// which is exactly what an offline key-search needs.
function timingSafeEqualStrings(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const maxLen = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    diff |= (a.charCodeAt(i % a.length) || 0) ^ (b.charCodeAt(i % b.length) || 0);
  }
  return diff === 0;
}
__name(timingSafeEqualStrings, "timingSafeEqualStrings");
function unauthorizedResponse() {
  return new Response(JSON.stringify({
    error: {
      message: "Truy c\u1EADp b\u1ECB t\u1EEB ch\u1ED1i! API Key kh\xF4ng ch\xEDnh x\xE1c ho\u1EB7c b\u1ECB thi\u1EBFu. Vui l\xF2ng cung c\u1EA5p kh\xF3a b\xED m\u1EADt qua header 'Authorization: Bearer <API_KEY>'.",
      type: "invalid_request_error",
      code: "invalid_api_key"
    }
  }), {
    status: 401,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}
__name(unauthorizedResponse, "unauthorizedResponse");
async function handleUpdateApiKey(request, env) {
  if (!env.ANTIGRAVITY_KV) {
    return Response.json({ success: false, error: "Ch\u01B0a c\u1EA5u h\xECnh ANTIGRAVITY_KV!" }, { status: 500, headers: corsHeaders() });
  }
  const { newApiKey } = await request.json().catch(() => ({}));
  const trimmed = (newApiKey || "").trim();
  if (!trimmed || trimmed.length < 8) {
    return Response.json({ success: false, error: "API Key m\u1EDBi ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 8 k\xFD t\u1EF1!" }, { status: 400, headers: corsHeaders() });
  }
  const ok = await safeKvPut(env.ANTIGRAVITY_KV, "custom_api_key", trimmed);
  if (!ok) {
    // safeKvPut swallows the quota error. Reporting success here would leave the
    // old key active while the UI claims the new one is live.
    return Response.json({ success: false, error: "Không ghi được key mới xuống KV (có thể đã chạm quota 1000 put/ngày). Key cũ vẫn đang hoạt động." }, { status: 503, headers: corsHeaders() });
  }
  // The env key must leave the allow-list too, otherwise the old env.API_KEY
  // keeps working and the dashboard's "bắt buộc dùng key mới" claim is a lie.
  // The override is per-isolate and intentionally wins over env for 5 minutes;
  // the message tells the operator to remove API_KEY in the Cloudflare dashboard.
  memoryCache.allowedKeysOverride = [trimmed];
  memoryCache.allowedKeysOverrideAt = Date.now();
  memoryCache.cachedApiKey = trimmed;
  memoryCache.apiKeyLoadedAt = Date.now();
  return Response.json({
    success: true,
    message: "Đã cập nhật API Key. Lưu ý: biến môi trường API_KEY trong Cloudflare vẫn được chấp nhận cho tới khi bạn xoá nó — hãy xoá/sửa trong Dashboard để khóa cũ thôi hiệu lực.",
    maskedKey: maskKey(trimmed)
  }, {
    headers: {
      ...corsHeaders(),
      "Set-Cookie": sessionCookie(trimmed)
    }
  });
}
__name(handleUpdateApiKey, "handleUpdateApiKey");
async function getAccountsList(env) {
  const now = Date.now();
  if (memoryCache.accounts && now - memoryCache.accountsLoadedAt < 12e4) {
    return memoryCache.accounts;
  }
  let accounts = [];
  if (env.ANTIGRAVITY_KV) {
    const raw = await env.ANTIGRAVITY_KV.get("accounts", { type: "json" }).catch(() => null);
    if (raw && Array.isArray(raw)) {
      accounts = raw;
    } else {
      const oldCreds = await env.ANTIGRAVITY_KV.get("credentials", { type: "json" }).catch(() => null);
      if (oldCreds && oldCreds.refreshToken) {
        const email = decodeJwtEmail(oldCreds.idToken) || oldCreds.email || "Primary Account";
        accounts = [{
          id: "acc_default",
          email,
          projectId: oldCreds.projectId || "aicode-consumers",
          accessToken: oldCreds.accessToken,
          refreshToken: oldCreds.refreshToken,
          expiresAt: oldCreds.expiresAt || 0,
          createdAt: Date.now()
        }];
        await safeKvPut(env.ANTIGRAVITY_KV, "accounts", JSON.stringify(accounts));
      } else {
        accounts = [];
      }
    }
  }
  memoryCache.accounts = accounts;
  memoryCache.accountsLoadedAt = now;
  return accounts;
}
__name(getAccountsList, "getAccountsList");
async function saveAccountsList(env, accounts) {
  memoryCache.accounts = accounts;
  memoryCache.accountsLoadedAt = Date.now();
  if (env.ANTIGRAVITY_KV) {
    // Read-modify-write of `accounts` without a lock lets two isolates overwrite
    // each other: a deletion can resurrect, a fresh account can vanish. Serialize
    // per-isolate and re-read under the lock so a concurrent add is not lost.
    // KV has no CAS here, so this narrows the window rather than closing it.
    const prev = memoryCache.accountsLock || Promise.resolve();
    const run = prev.then(async () => {
      const onDisk = await env.ANTIGRAVITY_KV.get("accounts", { type: "json" }).catch(() => null);
      if (Array.isArray(onDisk)) {
        const diskIds = new Set(onDisk.map((a) => a.id));
        const merged = accounts.filter((a) => diskIds.has(a.id));
        const incoming = accounts.filter((a) => !onDisk.some((d) => d.id === a.id));
        for (const acc of incoming) merged.push(acc);
        merged.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        memoryCache.accounts = merged;
        accounts.length = 0;
        accounts.push(...merged);
      }
      return await safeKvPut(env.ANTIGRAVITY_KV, "accounts", JSON.stringify(memoryCache.accounts));
    });
    memoryCache.accountsLock = run.catch(() => {});
    const ok = await run;
    if (!ok) {
      console.error("[KV Error] Ghi danh sách tài khoản thất bại — thay đổi KHÔNG được lưu.");
      throw new Error("KV write failed: danh sách tài khoản chưa được lưu");
    }
  }
}
__name(saveAccountsList, "saveAccountsList");
// Cooldown lives in KV so it survives isolate eviction. Storing it only in
// memoryCache meant a warm isolate spun up elsewhere happily retried a blocked
// account immediately, and a 403-quarantined account came straight back.
async function markAccountCooldown(env, account, ms) {
  const now = Date.now();
  const cached = memoryCache.usageCache.get(account.id) || {};
  memoryCache.usageCache.set(account.id, {
    ...cached,
    isRateLimited: true,
    rateLimitExpiresAt: now + ms
  });
  if (!env?.ANTIGRAVITY_KV) return;
  const list = await getAccountsList(env).catch(() => null);
  if (!Array.isArray(list)) return;
  const idx = list.findIndex((a) => a.id === account.id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], isRateLimited: true, rateLimitExpiresAt: now + ms };
  await safeKvPut(env.ANTIGRAVITY_KV, "accounts", JSON.stringify(list));
  memoryCache.accounts = list;
  memoryCache.accountsLoadedAt = now;
}
__name(markAccountCooldown, "markAccountCooldown");
async function getValidTokenForAccount(env, account, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && account.accessToken && now < account.expiresAt - 18e4) {
    return { accessToken: account.accessToken, projectId: account.projectId || "aicode-consumers" };
  }
  if (!forceRefresh && memoryCache.refreshLocks.has(account.id)) {
    return await memoryCache.refreshLocks.get(account.id);
  }
  const promise = (async () => {
    try {
      const res = await fetch(CONFIG.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: account.refreshToken || "",
          client_id: CONFIG.clientId,
          client_secret: CONFIG.clientSecret
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Refresh token l\u1ED7i cho ${account.email}: ` + JSON.stringify(data));
      const newExpiresAt = Date.now() + (data.expires_in - 300) * 1e3;
      account.accessToken = data.access_token;
      account.expiresAt = newExpiresAt;
      const currentList = await getAccountsList(env);
      const idx = currentList.findIndex((a) => a.id === account.id);
      if (idx !== -1) {
        currentList[idx] = account;
        await saveAccountsList(env, currentList);
      }
      return { accessToken: data.access_token, projectId: account.projectId || "aicode-consumers" };
    } finally {
      memoryCache.refreshLocks.delete(account.id);
    }
  })();
  memoryCache.refreshLocks.set(account.id, promise);
  return await promise;
}
__name(getValidTokenForAccount, "getValidTokenForAccount");
function parseQuotaData(account, data) {
  const result = {
    accountId: account.id,
    email: account.email,
    gemini: { fiveHour: null, weekly: null },
    claude: { fiveHour: null, weekly: null }
  };
  if (Array.isArray(data?.groups)) {
    for (const group of data.groups) {
      const name = (group.displayName || "").toLowerCase();
      const isGemini = name.includes("gemini");
      const isClaude = name.includes("claude") || name.includes("gpt");
      for (const bucket of group.buckets || []) {
        const b = {
          window: bucket.window || "",
          resetTime: bucket.resetTime || "",
          description: bucket.description || "",
          remainingPercentage: Math.round((bucket.remainingFraction || 0) * 1e3) / 10
        };
        if (isGemini) {
          if (bucket.window === "5h" || bucket.bucketId?.includes("5h")) result.gemini.fiveHour = b;
          if (bucket.window === "weekly" || bucket.bucketId?.includes("weekly")) result.gemini.weekly = b;
        } else if (isClaude) {
          if (bucket.window === "5h" || bucket.bucketId?.includes("5h")) result.claude.fiveHour = b;
          if (bucket.window === "weekly" || bucket.bucketId?.includes("weekly")) result.claude.weekly = b;
        }
      }
    }
  }
  return result;
}
__name(parseQuotaData, "parseQuotaData");
async function refreshAccountQuotaBackground(env, account) {
  const lockKey = "quota_" + account.id;
  if (memoryCache.refreshLocks.has(lockKey)) {
    return await memoryCache.refreshLocks.get(lockKey);
  }
  const existing = memoryCache.usageCache.get(account.id) || {};
  memoryCache.usageCache.set(account.id, {
    ...existing,
    expiresAt: Date.now() + 30 * 1e3
  });
  const p = (async () => {
    try {
      const { accessToken, projectId } = await getValidTokenForAccount(env, account);
      const res = await fetch(CONFIG.quotaSummaryUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "User-Agent": CONFIG.userAgent,
          "X-Client-Name": "antigravity",
          "X-Client-Version": CLIENT_VERSION,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ...projectId ? { project: projectId } : {} })
      });
      if (!res.ok) return null;
      const data = await res.json();
      const result = parseQuotaData(account, data);
      const current = memoryCache.usageCache.get(account.id) || {};
      memoryCache.usageCache.set(account.id, {
        ...current,
        data: result,
        expiresAt: Date.now() + 5 * 60 * 1e3
        // Cache RAM 5 phút
      });
      return result;
    } catch (err) {
      console.warn(`[Quota SWR] Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt quota ng\u1EA7m cho ${account.email}:`, err?.message);
      return null;
    } finally {
      memoryCache.refreshLocks.delete(lockKey);
    }
  })();
  memoryCache.refreshLocks.set(lockKey, p);
  return await p;
}
__name(refreshAccountQuotaBackground, "refreshAccountQuotaBackground");
async function getAccountQuota(env, account, force = false, ctx) {
  const now = Date.now();
  const cached = memoryCache.usageCache.get(account.id);
  if (!force && cached?.data) {
    if (now >= (cached.expiresAt || 0) && ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(refreshAccountQuotaBackground(env, account));
    }
    return cached.data;
  }
  if (!force) {
    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(refreshAccountQuotaBackground(env, account));
    }
    return { accountId: account.id, email: account.email, gemini: { fiveHour: null, weekly: null }, claude: { fiveHour: null, weekly: null } };
  }
  try {
    const { accessToken, projectId } = await getValidTokenForAccount(env, account);
    const res = await fetch(CONFIG.quotaSummaryUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "User-Agent": CONFIG.userAgent,
        "X-Client-Name": "antigravity",
        "X-Client-Version": CLIENT_VERSION,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ...projectId ? { project: projectId } : {} })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    const result = parseQuotaData(account, data);
    const existing = memoryCache.usageCache.get(account.id) || {};
    memoryCache.usageCache.set(account.id, {
      ...existing,
      data: result,
      expiresAt: now + 5 * 60 * 1e3
    });
    return result;
  } catch (err) {
    return {
      accountId: account.id,
      email: account.email,
      gemini: { fiveHour: null, weekly: null },
      claude: { fiveHour: null, weekly: null },
      error: err?.message || String(err)
    };
  }
}
__name(getAccountQuota, "getAccountQuota");
async function handleGetUsage(env, accountId) {
  const accounts = await getAccountsList(env);
  if (accounts.length === 0) {
    return Response.json({ success: false, error: "Chưa có tài khoản nào" }, { headers: corsHeaders() });
  }
  // Each call here forces a quota request upstream. Without an accountId an
  // unauthenticated (or careless) caller could fan out across the whole pool.
  if (!accountId) {
    return Response.json({ success: false, error: "Thiếu tham số accountId." }, { status: 400, headers: corsHeaders() });
  }
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return Response.json({ success: false, error: "Không tìm thấy tài khoản" }, { status: 404, headers: corsHeaders() });
  const usage = await getAccountQuota(env, acc, true);
  return Response.json({ success: true, usage }, { headers: corsHeaders() });
}
__name(handleGetUsage, "handleGetUsage");
function filterLatestModels(models) {
  if (!Array.isArray(models) || models.length === 0) return DEFAULT_FALLBACK_MODELS;
  const candidates = models.filter((m) => {
    const id = (m.id || "").toLowerCase();
    if (id.startsWith("tab_") || id.includes("autocomplete")) return false;
    if (id.endsWith("-tiered")) return false;
    if (/lite|extra-low|image|preview|pro-low/i.test(id)) return false;
    return true;
  });
  let maxFlashVer = 0, maxProVer = 0;
  for (const m of candidates) {
    const mFlash = m.id.match(/gemini-(\d+\.?\d*)-flash/i);
    if (mFlash && parseFloat(mFlash[1]) > maxFlashVer) maxFlashVer = parseFloat(mFlash[1]);
    const mPro = m.id.match(/gemini-(\d+\.?\d*)-pro/i);
    if (mPro && parseFloat(mPro[1]) > maxProVer) maxProVer = parseFloat(mPro[1]);
  }
  const result = candidates.filter((m) => {
    const id = m.id.toLowerCase();
    if (/claude|gpt-oss|gemini-pro-agent/i.test(id)) return true;
    const mFlash = m.id.match(/gemini-(\d+\.?\d*)-flash/i);
    if (mFlash) return parseFloat(mFlash[1]) >= maxFlashVer;
    const mPro = m.id.match(/gemini-(\d+\.?\d*)-pro/i);
    if (mPro) return parseFloat(mPro[1]) >= maxProVer;
    return false;
  }).map((m) => ({ id: m.id, upstream: m.upstream || m.id }));
  if (result.some((m) => m.id === "gemini-3.8-flash-high") && !result.some((m) => m.id === "gemini-3.8-flash")) {
    result.push({ id: "gemini-3.8-flash", upstream: "gemini-3.8-flash-tiered" });
  }
  if (result.some((m) => m.id === "gpt-oss-120b-medium") && !result.some((m) => m.id === "gpt-oss-120b")) {
    result.push({ id: "gpt-oss-120b", upstream: "gpt-oss-120b-medium" });
  }
  const priority = /* @__PURE__ */ __name((id) => {
    if (id.includes("3.8-flash-high")) return 1;
    if (id.includes("3.8-flash-medium")) return 2;
    if (id.includes("3.8-flash-low")) return 3;
    if (id.includes("3.8-flash")) return 4;
    if (id.includes("pro-high")) return 5;
    if (id.includes("pro-agent")) return 6;
    if (id.includes("sonnet")) return 7;
    if (id.includes("opus")) return 8;
    if (id === "gpt-oss-120b") return 9;
    if (id.includes("gpt-oss")) return 10;
    return 99;
  }, "priority");
  result.sort((a, b) => priority(a.id) - priority(b.id));
  return result.length > 0 ? result : DEFAULT_FALLBACK_MODELS;
}
__name(filterLatestModels, "filterLatestModels");
async function fetchUpstreamModels(env) {
  const accounts = await getAccountsList(env);
  if (accounts.length === 0) return null;
  try {
    const { accessToken, projectId } = await getValidTokenForAccount(env, accounts[0]);
    const res = await fetch(CONFIG.fetchModelsUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "User-Agent": CONFIG.userAgent,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ...projectId ? { project: projectId } : {} })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const discovered = [];
    const rawIds = [];
    if (data.models && typeof data.models === "object") {
      for (const [key, info] of Object.entries(data.models)) {
        rawIds.push(key);
        if (info.isInternal) continue;
        discovered.push({ id: key, upstream: key });
      }
    }
    const modelMap = /* @__PURE__ */ new Map();
    for (const m of DEFAULT_FALLBACK_MODELS) modelMap.set(m.id, m);
    for (const m of discovered) modelMap.set(m.id, m);
    return { merged: Array.from(modelMap.values()), rawIds };
  } catch (_) {
    return null;
  }
}
__name(fetchUpstreamModels, "fetchUpstreamModels");
async function refreshModelsCache(env) {
  const fetched = await fetchUpstreamModels(env);
  if (!fetched) return null;
  const now = Date.now();
  const filtered = filterLatestModels(fetched.merged);
  const expiresAt = now + 6 * 3600 * 1e3;
  let previous = memoryCache.models;
  if (!previous && env.ANTIGRAVITY_KV) {
    const cached = await env.ANTIGRAVITY_KV.get("cached_models", { type: "json" }).catch(() => null);
    if (cached && Array.isArray(cached.models)) previous = cached.models;
  }
  const prevIds = new Set((previous || []).map((m) => m.id));
  const currentIds = new Set(filtered.map((m) => m.id));
  const added = filtered.filter((m) => !prevIds.has(m.id)).map((m) => m.id);
  const removed = (previous || []).filter((m) => !currentIds.has(m.id)).map((m) => m.id);
  memoryCache.models = filtered;
  memoryCache.modelsExpiresAt = expiresAt;
  if (env.ANTIGRAVITY_KV) {
    await safeKvPut(env.ANTIGRAVITY_KV, "cached_models", JSON.stringify({ expiresAt, models: filtered }));
    await safeKvPut(env.ANTIGRAVITY_KV, "models:last_sync", JSON.stringify({ syncedAt: now, count: filtered.length, added, removed }));
  }
  if (added.length > 0) console.log(`[Models Sync] Ph\xE1t hi\u1EC7n model m\u1EDBi: ${added.join(", ")}`);
  if (removed.length > 0) console.warn(`[Models Sync] Model kh\xF4ng c\xF2n tr\xEAn upstream: ${removed.join(", ")}`);
  return { models: filtered, added, removed };
}
__name(refreshModelsCache, "refreshModelsCache");
async function getDynamicModels(env, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && memoryCache.models && now < memoryCache.modelsExpiresAt) {
    return memoryCache.models;
  }
  if (!forceRefresh && env.ANTIGRAVITY_KV) {
    const cached = await env.ANTIGRAVITY_KV.get("cached_models", { type: "json" });
    if (cached && now < cached.expiresAt && Array.isArray(cached.models)) {
      const filtered = filterLatestModels(cached.models);
      memoryCache.models = filtered;
      memoryCache.modelsExpiresAt = cached.expiresAt;
      return filtered;
    }
  }
  const refreshed = await refreshModelsCache(env);
  if (refreshed) return refreshed.models;
  return memoryCache.models || DEFAULT_FALLBACK_MODELS;
}
__name(getDynamicModels, "getDynamicModels");
function resolveUpstreamModel(requestedModel, modelList = []) {
  if (!requestedModel) return "gemini-3.8-flash-high";
  let norm = requestedModel.toLowerCase().trim();
  norm = norm.replace(/^(google|antigravity|openai|custom)\//i, "");
  norm = norm.replace(/[\s_]+/g, "-");
  const match = modelList.find((m) => {
    const mId = m.id.toLowerCase().replace(/[\s_]+/g, "-");
    return mId === norm || m.id.toLowerCase() === requestedModel.toLowerCase().trim();
  });
  if (match) return match.upstream;
  if (/gemini.*3\.?8.*flash.*high/i.test(norm)) return "gemini-3.8-flash-high";
  if (/gemini.*3\.?8.*flash.*low/i.test(norm)) return "gemini-3.8-flash-low";
  if (/gemini.*3\.?8.*flash.*medium/i.test(norm)) return "gemini-3.8-flash-medium";
  if (/gemini.*3\.?8.*flash/i.test(norm)) return "gemini-3.8-flash-high";
  if (/gemini.*3\.?7.*flash/i.test(norm)) return "gemini-3.8-flash-high";
  if (/gemini.*3\.?6.*flash/i.test(norm)) return "gemini-3.8-flash-high";
  if (/gemini.*2\.?5.*flash/i.test(norm)) return "gemini-3.8-flash-high";
  if (/gemini.*3\.?1.*pro.*high/i.test(norm)) return "gemini-3.1-pro-high";
  if (/gemini.*3\.?1.*pro/i.test(norm)) return "gemini-3.1-pro-high";
  if (/gemini.*pro.*agent/i.test(norm)) return "gemini-pro-agent";
  if (/gemini.*pro/i.test(norm)) return "gemini-3.1-pro-high";
  if (/claude.*sonnet/i.test(norm)) return "claude-sonnet-4-6";
  if (/claude.*opus/i.test(norm)) return "claude-opus-4-6-thinking";
  if (/gpt-oss/i.test(norm)) return "gpt-oss-120b-medium";
  return norm;
}
__name(resolveUpstreamModel, "resolveUpstreamModel");
function createOptimizedSseStream(upstreamRes, requestedModel, responseId, env, ctx, promptTokens = 0) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  (async () => {
    if (!upstreamRes.body) {
      await writer.close();
      return;
    }
    const reader = upstreamRes.body.getReader();
    let buffer = "";
    let hasToolCalls = false;
    let toolCallIndex = 0;
    let lastThoughtSignature = memoryCache.latestSignature || null;
    let completionTokens = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let start = 0;
        let nlIdx;
        while ((nlIdx = buffer.indexOf("\n", start)) !== -1) {
          const line = buffer.substring(start, nlIdx).trim();
          start = nlIdx + 1;
          if (line.length < 6 || !line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload.charCodeAt(0) !== 123) continue;
          try {
            const parsed = JSON.parse(payload);
            const candidate = parsed.response?.candidates?.[0] || parsed.candidates?.[0];
            if (!candidate) continue;
            const candSig = candidate.thoughtSignature || candidate.thought_signature;
            if (candSig) lastThoughtSignature = candSig;
            const parts = candidate.content?.parts;
            if (!parts || parts.length === 0) continue;
            const chunkHasToolCall = parts.some((p) => p.functionCall);
            if (chunkHasToolCall) {
              hasToolCalls = true;
            }
            for (let i = 0; i < parts.length; i++) {
              const part = parts[i];
              const partSig = part.thoughtSignature || part.thought_signature;
              if (partSig) lastThoughtSignature = partSig;
              if (part.text) {
                completionTokens += Math.ceil(part.text.length / 3.5);
                if (!hasToolCalls) {
                  const chunkStr = `data: ${JSON.stringify({
                    id: responseId,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1e3),
                    model: requestedModel,
                    choices: [{ index: 0, delta: { content: part.text }, finish_reason: null }]
                  })}

`;
                  await writer.write(encoder.encode(chunkStr));
                } else {
                  const chunkStr = `data: ${JSON.stringify({
                    id: responseId,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1e3),
                    model: requestedModel,
                    choices: [{ index: 0, delta: { reasoning_content: part.text }, finish_reason: null }]
                  })}

`;
                  await writer.write(encoder.encode(chunkStr));
                }
              }
              if (part.functionCall) {
                const realName = part.functionCall.name.replace(/_ide$/, "");
                const callId = part.functionCall.id || "call_" + crypto.randomUUID().slice(0, 8);
                const argsStr = JSON.stringify(part.functionCall.args || {});
                completionTokens += 10 + Math.ceil(argsStr.length / 3.5);
                const sig = partSig || candSig || lastThoughtSignature;
                if (sig) {
                  memoryCache.signatures.set(callId, sig);
                  memoryCache.latestSignature = sig;
                  if (memoryCache.signatures.size > 500) {
                    const firstKey = memoryCache.signatures.keys().next().value;
                    if (firstKey) memoryCache.signatures.delete(firstKey);
                  }
                  const now = Date.now();
                  if (env?.ANTIGRAVITY_KV && sig !== memoryCache.lastKvSig && now - memoryCache.lastKvSigTime > 3e4) {
                    memoryCache.lastKvSig = sig;
                    memoryCache.lastKvSigTime = now;
                    const p = safeKvPut(env.ANTIGRAVITY_KV, "sig:latest", sig, { expirationTtl: 2592e3 });
                    if (ctx && typeof ctx.waitUntil === "function") {
                      ctx.waitUntil(p);
                    }
                  }
                }
                const chunkStr = `data: ${JSON.stringify({
                  id: responseId,
                  object: "chat.completion.chunk",
                  created: Math.floor(Date.now() / 1e3),
                  model: requestedModel,
                  choices: [{
                    index: 0,
                    delta: {
                      tool_calls: [{
                        index: toolCallIndex++,
                        id: callId,
                        type: "function",
                        function: { name: realName, arguments: argsStr }
                      }]
                    },
                    finish_reason: null
                  }]
                })}

`;
                await writer.write(encoder.encode(chunkStr));
              }
            }
          } catch (_) {
          }
        }
        buffer = buffer.substring(start);
      }
      const finalFinishReason = hasToolCalls ? "tool_calls" : "stop";
      const totalTokens = promptTokens + Math.max(completionTokens, 1);
      const finalUsage = {
        prompt_tokens: promptTokens,
        completion_tokens: Math.max(completionTokens, 1),
        total_tokens: totalTokens
      };
      const finalChunk = `data: ${JSON.stringify({
        id: responseId,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1e3),
        model: requestedModel,
        choices: [{ index: 0, delta: {}, finish_reason: finalFinishReason }],
        usage: finalUsage
      })}

`;
      await writer.write(encoder.encode(finalChunk));
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (err) {
      console.error("Stream error:", err);
      try {
        // A client that only logs saw a clean-looking truncated stream. Send a
        // terminal error event plus [DONE] so the failure is visible, then close.
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          error: { message: err?.message || String(err), type: "upstream_error", code: 500 }
        })}\n\n`));
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (_) {
      }
    } finally {
      await writer.close();
    }
  })();
  return readable;
}
__name(createOptimizedSseStream, "createOptimizedSseStream");
var FIXED_CONTEXT_LIMIT = 98304;
var DEFAULT_MAX_CONTEXT_MESSAGES = 160;
var SAFE_OUTPUT_TOKEN_CAP = 65536;
function resolveContextLimit(env) {
  const raw = env && env.MAX_CONTEXT_TOKENS ? parseInt(env.MAX_CONTEXT_TOKENS, 10) : NaN;
  if (Number.isFinite(raw) && raw > 0) return raw;
  return FIXED_CONTEXT_LIMIT;
}
__name(resolveContextLimit, "resolveContextLimit");
var MIN_OUTPUT_TOKEN_FLOOR = 1024;
// Map the OpenAI sampling knobs Google understands, and clamp/validate so an
// out-of-range value produces a clear 400 here instead of a raw proto error.
// Previously temperature was passed through untouched and top_p/stop were
// dropped entirely, so clients silently lost their sampling settings.
function resolveSamplingConfig(body) {
  const cfg = {};
  const temp = Number(body.temperature);
  cfg.temperature = Number.isFinite(temp) ? Math.min(Math.max(temp, 0), 2) : 0.7;
  const topP = Number(body.top_p);
  if (Number.isFinite(topP) && topP > 0 && topP <= 1) cfg.topP = topP;
  const topK = Number(body.top_k);
  if (Number.isFinite(topK) && topK > 0) cfg.topK = Math.floor(topK);
  if (Array.isArray(body.stop) && body.stop.length > 0) {
    const stops = body.stop.slice(0, 5).map((s) => String(s)).filter((s) => s.length > 0);
    if (stops.length > 0) cfg.stopSequences = stops;
  } else if (typeof body.stop === "string" && body.stop.length > 0) {
    cfg.stopSequences = [body.stop];
  }
  // presence_penalty / frequency_penalty have NO counterpart in this upstream
  // generation_config — verified: `penaltyConfig` is rejected as an unknown
  // field, which would 400 the whole request. Ignore them rather than guess.
  return cfg;
}
__name(resolveSamplingConfig, "resolveSamplingConfig");
function resolveMaxOutputTokens(body) {
  const requested = Number(
    (body && (body.max_completion_tokens || body.max_tokens)) || 8192
  );
  if (!Number.isFinite(requested) || requested <= 0) return 8192;
  // Gemini "high" variants spend the budget on reasoning tokens first. A tiny
  // maxOutputTokens therefore returns finish_reason "stop" with an empty body,
  // which OpenAI-compatible clients report as "no reply". Keep a floor.
  return Math.min(Math.max(Math.floor(requested), MIN_OUTPUT_TOKEN_FLOOR), 64e3);
}
__name(resolveMaxOutputTokens, "resolveMaxOutputTokens");
function estimateMessageTokens(msg) {
  if (!msg) return 0;
  let tokens = 4;
  if (typeof msg.content === "string") {
    tokens += Math.ceil(msg.content.length / 3.5);
  } else if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (typeof part === "string") {
        tokens += Math.ceil(part.length / 3.5);
      } else if (part && typeof part === "object") {
        if (part.text) tokens += Math.ceil(part.text.length / 3.5);
        if (part.image_url || part.type === "image_url") tokens += 1e3;
        if (part.input_audio || part.audio_url) tokens += 500;
        if (part.video_url || part.type === "video_url") tokens += 1500;
        if (part.inlineData || part.inline_data) tokens += 1e3;
      }
    }
  } else if (msg.content && typeof msg.content === "object") {
    try {
      tokens += Math.ceil(JSON.stringify(msg.content).length / 3.5);
    } catch (_) {
      tokens += 50;
    }
  }
  if (Array.isArray(msg.tool_calls)) {
    for (const tc of msg.tool_calls) {
      tokens += 10;
      if (tc.function?.arguments) {
        tokens += Math.ceil(String(tc.function.arguments).length / 3.5);
      }
    }
  }
  return tokens;
}
__name(estimateMessageTokens, "estimateMessageTokens");
function pruneMessagesToContextLimit(messages, maxTokens = FIXED_CONTEXT_LIMIT, maxMessages = DEFAULT_MAX_CONTEXT_MESSAGES) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { messages: [], promptTokens: 0 };
  }
  const systemMessages = [];
  let nonSystemMessages = [];
  for (const msg of messages) {
    if (!msg) continue;
    if (msg.role === "system" || msg.role === "developer") {
      systemMessages.push(msg);
    } else {
      nonSystemMessages.push(msg);
    }
  }
  if (nonSystemMessages.length > maxMessages) {
    nonSystemMessages = nonSystemMessages.slice(-maxMessages);
    while (nonSystemMessages.length > 0 && nonSystemMessages[0].role !== "user") {
      nonSystemMessages.shift();
    }
  }
  let systemTokens = 0;
  for (const m of systemMessages) {
    systemTokens += estimateMessageTokens(m);
  }
  let availableTokens = maxTokens - systemTokens - 500;
  if (availableTokens < 2e3) availableTokens = 2e3;
  const blocks = [];
  let totalNonSystemTokens = 0;
  let i = 0;
  while (i < nonSystemMessages.length) {
    const msg = nonSystemMessages[i];
    const msgTok = estimateMessageTokens(msg);
    if (msg.role === "assistant" && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const blockMsgs = [msg];
      let blockTok = msgTok;
      i++;
      while (i < nonSystemMessages.length && nonSystemMessages[i]?.role === "tool") {
        const toolMsg = nonSystemMessages[i];
        blockMsgs.push(toolMsg);
        blockTok += estimateMessageTokens(toolMsg);
        i++;
      }
      blocks.push({ messages: blockMsgs, tokens: blockTok });
      totalNonSystemTokens += blockTok;
    } else {
      blocks.push({ messages: [msg], tokens: msgTok });
      totalNonSystemTokens += msgTok;
      i++;
    }
  }
  if (systemTokens + totalNonSystemTokens <= maxTokens) {
    return {
      messages: [...systemMessages, ...nonSystemMessages],
      promptTokens: Math.max(systemTokens + totalNonSystemTokens, 1)
    };
  }
  const keptBlocks = [];
  let accumulatedTokens = 0;
  for (let b = blocks.length - 1; b >= 0; b--) {
    const block = blocks[b];
    if (accumulatedTokens + block.tokens <= availableTokens || keptBlocks.length === 0) {
      keptBlocks.push(block);
      accumulatedTokens += block.tokens;
    } else {
      break;
    }
  }
  keptBlocks.reverse();
  const keptMessages = [];
  for (const block of keptBlocks) {
    keptMessages.push(...block.messages);
  }
  // Drop leading assistant/tool blocks until a real user turn starts. The old
  // `length > 1` guard stopped one message early and could hand the model an
  // orphan tool result as the entire context, which a long agent loop then
  // compounds turn after turn.
  while (keptMessages.length > 0 && keptMessages[0].role !== "user") {
    accumulatedTokens -= estimateMessageTokens(keptMessages.shift());
  }
  if (keptMessages.length === 0) {
    // Everything was trailing non-user content: keep the conversation usable.
    const last = blocks.length > 0 ? [...blocks[blocks.length - 1].messages] : [];
    return {
      messages: [...systemMessages, ...last],
      promptTokens: Math.max(systemTokens + (blocks.length > 0 ? blocks[blocks.length - 1].tokens : 0), 1)
    };
  }
  return {
    messages: [...systemMessages, ...keptMessages],
    promptTokens: Math.max(systemTokens + Math.max(accumulatedTokens, 0), 1)
  };
}
__name(pruneMessagesToContextLimit, "pruneMessagesToContextLimit");
function sanitizeToolParameters(schema) {
  if (!schema || typeof schema !== "object") return { type: "object", properties: {} };
  const res = { ...schema };
  if (!res.type && res.properties) res.type = "object";
  if (res.type !== "object" && !res.type) res.type = "object";
  delete res.$schema;
  delete res.$id;
  if (res.properties && typeof res.properties === "object") {
    const newProps = {};
    for (const [key, val] of Object.entries(res.properties)) {
      if (!val || typeof val !== "object") {
        newProps[key] = { type: "string" };
        continue;
      }
      const prop = { ...val };
      delete prop.$schema;
      delete prop.$id;
      if (Array.isArray(prop.anyOf) || Array.isArray(prop.oneOf)) {
        const variants = prop.anyOf || prop.oneOf;
        const firstTyped = variants.find((v) => v && v.type);
        prop.type = firstTyped ? firstTyped.type : "string";
        if (prop.type === "array" && firstTyped && firstTyped.items) {
          prop.items = firstTyped.items;
        }
        delete prop.anyOf;
        delete prop.oneOf;
      }
      if (!prop.type) {
        if (prop.properties) prop.type = "object";
        else prop.type = "string";
      }
      if (prop.type === "array" && !prop.items) {
        prop.items = { type: "string" };
      }
      if (prop.type === "object" && prop.properties) {
        newProps[key] = sanitizeToolParameters(prop);
        continue;
      }
      newProps[key] = prop;
    }
    res.properties = newProps;
  }
  if (Array.isArray(res.required)) {
    const validKeys = new Set(Object.keys(res.properties || {}));
    res.required = res.required.filter((k) => validKeys.has(k));
  }
  return res;
}
__name(sanitizeToolParameters, "sanitizeToolParameters");
function formatCountdown(ms) {
  if (typeof ms !== "number" || ms <= 0 || ms === Infinity || isNaN(ms)) {
    return "\u0110\u1EA7y (100%)";
  }
  const totalSec = Math.floor(ms / 1e3);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor(totalSec % 86400 / 3600);
  const mins = Math.floor(totalSec % 3600 / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${totalSec}s`;
}
__name(formatCountdown, "formatCountdown");
function calculateAccountBalanceMetrics(acc, upstreamModel, now) {
  const cached = memoryCache.usageCache.get(acc.id);
  const isClaude = (upstreamModel || "").toLowerCase().includes("claude");
  if (cached?.isRateLimited && cached.rateLimitExpiresAt && now < cached.rateLimitExpiresAt) {
    const remSec = Math.ceil((cached.rateLimitExpiresAt - now) / 1e3);
    return {
      tier: 5,
      tierLabel: "T\u1EA1m d\u1EEBng",
      tierColor: "#ef4444",
      score: -100,
      effectiveWeight: 0,
      dispatchMode: "\u26D4 T\u1EA1m kh\xF3a (Cooldown)",
      dispatchColor: "#ef4444",
      fiveHour: 0,
      weekly: 0,
      fiveHourResetMs: Infinity,
      weeklyResetMs: Infinity,
      fiveHourCountdown: "--",
      weeklyCountdown: "--",
      reason: `Cooldown (${remSec}s)`
    };
  }
  let fiveHourRem = 100;
  let weeklyRem = 100;
  let fiveHourResetMs = Infinity;
  let weeklyResetMs = Infinity;
  if (cached?.data) {
    const q = cached.data;
    const bucketGroup = isClaude ? q.claude : q.gemini;
    if (bucketGroup) {
      if (typeof bucketGroup.fiveHour?.remainingPercentage === "number") {
        fiveHourRem = Math.max(0, Math.min(100, bucketGroup.fiveHour.remainingPercentage));
      }
      if (typeof bucketGroup.weekly?.remainingPercentage === "number") {
        weeklyRem = Math.max(0, Math.min(100, bucketGroup.weekly.remainingPercentage));
      }
      if (bucketGroup.fiveHour?.resetTime) {
        const resetTs = new Date(bucketGroup.fiveHour.resetTime).getTime();
        if (!isNaN(resetTs) && resetTs > now) {
          fiveHourResetMs = resetTs - now;
        }
      }
      if (bucketGroup.weekly?.resetTime) {
        const resetTs = new Date(bucketGroup.weekly.resetTime).getTime();
        if (!isNaN(resetTs) && resetTs > now) {
          weeklyResetMs = resetTs - now;
        }
      }
    }
  }
  const fiveHourCountdown = formatCountdown(fiveHourResetMs);
  const weeklyCountdown = formatCountdown(weeklyResetMs);
  if (fiveHourRem <= 0 || weeklyRem <= 0) {
    return {
      tier: 4,
      tierLabel: "H\u1EBFt Quota",
      tierColor: "#dc2626",
      score: -999,
      effectiveWeight: 0,
      dispatchMode: "\u{1F534} C\u1EA1n ki\u1EC7t Quota",
      dispatchColor: "#dc2626",
      fiveHour: fiveHourRem,
      weekly: weeklyRem,
      fiveHourResetMs,
      weeklyResetMs,
      fiveHourCountdown,
      weeklyCountdown,
      reason: fiveHourRem <= 0 ? "H\u1EBFt 5h" : "H\u1EBFt tu\u1EA7n"
    };
  }
  let tier = 1;
  let tierLabel = "D\u1ED3i d\xE0o";
  let tierColor = "#10b981";
  if (fiveHourRem < 15 || weeklyRem < 15) {
    tier = 3;
    tierLabel = "C\u1EA3nh b\xE1o c\u1EA1n";
    tierColor = "#f59e0b";
  } else if (fiveHourRem < 35 || weeklyRem < 30) {
    tier = 2;
    tierLabel = "Ti\u1EBFt ki\u1EC7m";
    tierColor = "#38bdf8";
  }
  let compositeScore = fiveHourRem * 0.4 + weeklyRem * 0.6;
  let dispatchMode = "\u2696\uFE0F C\xE2n b\u1EB1ng SWRR";
  let dispatchColor = "#10b981";
  const RESET_SURGE_WINDOW = 45 * 60 * 1e3;
  if (fiveHourResetMs <= RESET_SURGE_WINDOW && fiveHourRem >= 15) {
    const urgencyFactor = 1 - fiveHourResetMs / RESET_SURGE_WINDOW;
    const surgeBonus = Math.round(25 * urgencyFactor);
    compositeScore += surgeBonus;
    dispatchMode = `\u26A1 T\u1EADn d\u1EE5ng Reset (+${surgeBonus})`;
    dispatchColor = "#a855f7";
  } else {
    const WEEKLY_CYCLE_MS = 7 * 24 * 3600 * 1e3;
    if (weeklyResetMs > 0 && weeklyResetMs < WEEKLY_CYCLE_MS) {
      const expectedWeeklyRem = weeklyResetMs / WEEKLY_CYCLE_MS * 100;
      if (weeklyRem < expectedWeeklyRem - 15) {
        const penalty = Math.min(30, Math.round((expectedWeeklyRem - weeklyRem) * 0.5));
        compositeScore = Math.max(5, compositeScore - penalty);
        dispatchMode = `\u{1F6E1}\uFE0F B\u1EA3o t\u1ED3n Tu\u1EA7n (-${penalty})`;
        dispatchColor = "#0284c7";
      }
    }
  }
  if (dispatchMode === "\u2696\uFE0F C\xE2n b\u1EB1ng SWRR" && (fiveHourRem < 20 || weeklyRem < 20)) {
    dispatchMode = "\u26A0\uFE0F Ti\u1EBFt ki\u1EC7m Quota";
    dispatchColor = "#f59e0b";
  }
  const finalScore = Math.round(compositeScore * 10) / 10;
  const effectiveWeight = Math.max(1, Math.round(finalScore));
  return {
    tier,
    tierLabel,
    tierColor,
    score: finalScore,
    effectiveWeight,
    dispatchMode,
    dispatchColor,
    fiveHour: fiveHourRem,
    weekly: weeklyRem,
    fiveHourResetMs,
    weeklyResetMs,
    fiveHourCountdown,
    weeklyCountdown,
    reason: "S\u1EB5n s\xE0ng"
  };
}
__name(calculateAccountBalanceMetrics, "calculateAccountBalanceMetrics");
function getRankedAccounts(env, accounts, upstreamModel, ctx) {
  if (!Array.isArray(accounts) || accounts.length <= 1) return accounts || [];
  const now = Date.now();
  const evaluated = accounts.map((acc, index) => {
    const cached = memoryCache.usageCache.get(acc.id);
    if (!cached || now >= (cached.expiresAt || 0)) {
      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(refreshAccountQuotaBackground(env, acc));
      }
    }
    const metrics = calculateAccountBalanceMetrics(acc, upstreamModel, now);
    return {
      account: acc,
      index,
      ...metrics
    };
  });
  const eligible = evaluated.filter((e) => e.tier <= 3 && e.effectiveWeight > 0);
  const ineligible = evaluated.filter((e) => e.tier > 3 || e.effectiveWeight <= 0);
  ineligible.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return b.score - a.score;
  });
  if (eligible.length === 0) {
    evaluated.sort((a, b) => b.score - a.score);
    return evaluated.map((e) => e.account);
  }
  if (eligible.length === 1) {
    return [eligible[0].account, ...ineligible.map((e) => e.account)];
  }
  memoryCache.rrCounter = ((memoryCache.rrCounter || 0) + 1) % eligible.length;
  const rotatedEligible = [
    ...eligible.slice(memoryCache.rrCounter),
    ...eligible.slice(0, memoryCache.rrCounter)
  ];
  const totalWeight = rotatedEligible.reduce((sum, e) => sum + e.effectiveWeight, 0);
  for (const e of rotatedEligible) {
    const prevWeight = memoryCache.swrrState.get(e.account.id) || 0;
    memoryCache.swrrState.set(e.account.id, prevWeight + e.effectiveWeight);
  }
  let selected = rotatedEligible[0];
  let maxWeight = memoryCache.swrrState.get(selected.account.id) ?? -Infinity;
  for (let i = 1; i < rotatedEligible.length; i++) {
    const w = memoryCache.swrrState.get(rotatedEligible[i].account.id) ?? -Infinity;
    if (w > maxWeight) {
      maxWeight = w;
      selected = rotatedEligible[i];
    }
  }
  memoryCache.swrrState.set(selected.account.id, maxWeight - totalWeight);
  const otherEligible = rotatedEligible.filter((e) => e.account.id !== selected.account.id);
  otherEligible.sort((a, b) => {
    const wa = memoryCache.swrrState.get(a.account.id) || 0;
    const wb = memoryCache.swrrState.get(b.account.id) || 0;
    if (wb !== wa) return wb - wa;
    return b.score - a.score;
  });
  return [selected.account, ...otherEligible.map((e) => e.account), ...ineligible.map((e) => e.account)];
}
__name(getRankedAccounts, "getRankedAccounts");
async function handleGetBalanceStatus(env, upstreamModel = "gemini-3.8-flash-high") {
  const accounts = await getAccountsList(env);
  const now = Date.now();
  const list = accounts.map((acc, index) => {
    const metrics = calculateAccountBalanceMetrics(acc, upstreamModel, now);
    return {
      id: acc.id,
      email: acc.email,
      index,
      ...metrics
    };
  });
  const eligible = list.filter((e) => e.tier <= 3 && e.effectiveWeight > 0);
  const totalWeight = eligible.reduce((sum, e) => sum + e.effectiveWeight, 0);
  let nextActiveId = "";
  if (eligible.length > 0) {
    let maxVirtualWeight = -Infinity;
    for (const e of eligible) {
      const curr = memoryCache.swrrState.get(e.id) || 0;
      const virtualWeight = curr + e.effectiveWeight;
      if (virtualWeight > maxVirtualWeight) {
        maxVirtualWeight = virtualWeight;
        nextActiveId = e.id;
      }
    }
  } else if (list.length > 0) {
    nextActiveId = list[0].id;
  }
  const result = list.map((item) => {
    const isEligible = item.tier <= 3 && item.effectiveWeight > 0;
    const trafficShare = isEligible && totalWeight > 0 ? Math.round(item.effectiveWeight / totalWeight * 1e3) / 10 : 0;
    return {
      ...item,
      trafficShare,
      isNext: item.id === nextActiveId
    };
  });
  return Response.json({
    success: true,
    nextAccountId: nextActiveId,
    model: upstreamModel,
    totalWeight,
    accounts: result
  }, { headers: corsHeaders() });
}
__name(handleGetBalanceStatus, "handleGetBalanceStatus");
async function handleChatCompletions(request, env, ctx) {
  const accounts = await getAccountsList(env);
  if (accounts.length === 0) {
    // 503, not 401: an empty pool is a server-side misconfiguration. Returning
    // 401 told every client its own API key was wrong, which sends users off to
    // rotate a perfectly good key.
    return new Response(JSON.stringify({
      error: {
        message: "Chưa có tài khoản nào được kết nối vào Antigravity Pool! Vui lòng truy cập trang Web UI Dashboard để kết nối tài khoản Google.",
        type: "upstream_error",
        code: "no_accounts_configured"
      }
    }), {
      status: 503,
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    // The old `.catch(() => ({}))` turned a malformed body into an empty object,
    // which then got answered as a bare "Hello" — a 200 for garbage input.
    return new Response(JSON.stringify({
      error: {
        message: "Body yêu cầu không phải JSON hợp lệ.",
        type: "invalid_request_error",
        code: 400
      }
    }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders() } });
  }
  const stream = body.stream === true;
  const dynamicModels = await getDynamicModels(env);
  const upstreamModel = resolveUpstreamModel(body.model, dynamicModels);
  function parseDataUri(uri) {
    if (typeof uri !== "string") return null;
    if (uri.startsWith("data:")) {
      const match = uri.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return {
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        };
      }
    }
    return null;
  }
  __name(parseDataUri, "parseDataUri");
  function extractMessageParts(content) {
    if (typeof content === "string") return [{ text: content || " " }];
    if (!content) return [{ text: " " }];
    if (Array.isArray(content)) {
      const parts = [];
      for (const item of content) {
        if (typeof item === "string") {
          parts.push({ text: item });
        } else if (item && typeof item === "object") {
          if (item.type === "text" && item.text) {
            parts.push({ text: item.text });
          } else if (item.type === "image_url" && item.image_url) {
            const url = typeof item.image_url === "string" ? item.image_url : item.image_url.url;
            const parsed = parseDataUri(url);
            if (parsed) parts.push(parsed);
            else if (typeof url === "string" && url) {
              // Previously dropped silently, so the model got a content block with
              // no image and hallucinated a description of it.
              parts.push({
                text: `[Hình ảnh bị bỏ qua: gateway chỉ nhận ảnh dạng data URI base64, không tải được URL ${url.slice(0, 120)}]`
              });
            }
          } else if (item.type === "input_audio" && item.input_audio) {
            const audioData = item.input_audio.data;
            const fmt = item.input_audio.format || "wav";
            if (audioData) {
              parts.push({
                inlineData: {
                  mimeType: `audio/${fmt}`,
                  data: audioData
                }
              });
            }
          } else if (item.type === "audio_url" && item.audio_url) {
            const url = typeof item.audio_url === "string" ? item.audio_url : item.audio_url.url;
            const parsed = parseDataUri(url);
            if (parsed) parts.push(parsed);
          } else if (item.type === "video_url" && item.video_url) {
            const url = typeof item.video_url === "string" ? item.video_url : item.video_url.url;
            const parsed = parseDataUri(url);
            if (parsed) parts.push(parsed);
          } else if ((item.type === "image" || item.type === "document") && item.source?.type === "base64") {
            if (item.source.data) {
              parts.push({
                inlineData: {
                  mimeType: item.source.media_type || (item.type === "document" ? "application/pdf" : "image/jpeg"),
                  data: item.source.data
                }
              });
            }
          } else if (item.url && typeof item.url === "string" && item.url.startsWith("data:")) {
            const parsed = parseDataUri(item.url);
            if (parsed) parts.push(parsed);
          } else if (item.inlineData?.data && item.inlineData?.mimeType) {
            parts.push({ inlineData: item.inlineData });
          } else if (item.inline_data?.data && item.inline_data?.mime_type) {
            parts.push({ inlineData: { mimeType: item.inline_data.mime_type, data: item.inline_data.data } });
          } else if (item.text) {
            parts.push({ text: item.text });
          }
        }
      }
      return parts.length > 0 ? parts : [{ text: " " }];
    }
    if (typeof content === "object") {
      return [{ text: content.text || JSON.stringify(content) }];
    }
    return [{ text: String(content) }];
  }
  __name(extractMessageParts, "extractMessageParts");
  const rawMessages = body.messages || [];
  const maxTokens = resolveContextLimit(env);
  const maxMessages = env && env.MAX_CONTEXT_MESSAGES ? parseInt(env.MAX_CONTEXT_MESSAGES, 10) : DEFAULT_MAX_CONTEXT_MESSAGES;
  const { messages, promptTokens } = pruneMessagesToContextLimit(rawMessages, maxTokens, maxMessages);
  const toolNameMap = /* @__PURE__ */ new Map();
  let lastAssistantIdx = -1;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "assistant") {
      lastAssistantIdx = i;
      if (Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls) {
          const id = tc.id;
          const name = tc.function?.name || tc.name;
          if (id && name) {
            toolNameMap.set(id, name);
          }
        }
      }
    }
  }
  const declaredFnNames = /* @__PURE__ */ new Set();
  if (Array.isArray(body.tools)) {
    for (const t of body.tools) {
      const fn = t.function || t;
      declaredFnNames.add(`${(fn.name || "tool").replace(/_ide$/, "")}_ide`);
    }
  }
  // memoryCache.latestSignature is seeded with DEFAULT_FALLBACK_THOUGHT_SIGNATURE at
  // init, so `fallbackSig` was never falsy and the KV lookup below was dead code
  // that still cost a KV read per request. Seed first, read KV only on a cold isolate.
  let fallbackSig = memoryCache.latestSignature;
  if (!fallbackSig && env.ANTIGRAVITY_KV) {
    try {
      const fetched = await env.ANTIGRAVITY_KV.get("sig:latest");
      if (fetched) {
        memoryCache.latestSignature = fetched;
        fallbackSig = fetched;
      }
    } catch (_) {
    }
  }
  if (!fallbackSig) {
    fallbackSig = DEFAULT_FALLBACK_THOUGHT_SIGNATURE;
    memoryCache.latestSignature = DEFAULT_FALLBACK_THOUGHT_SIGNATURE;
  }
  const contents = [];
  let systemInstruction = void 0;
  function appendContentPart(role, part) {
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts.push(part);
    } else {
      contents.push({ role, parts: [part] });
    }
  }
  __name(appendContentPart, "appendContentPart");
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "developer") {
      msg.role = "system";
    }
    const msgParts = extractMessageParts(msg.content);
    if (msg.role === "system") {
      const textParts = msgParts.filter((p) => p.text).map((p) => ({
        text: p.text.replace(/^x-anthropic-billing-header:[^\n]*\n?/gim, "")
      }));
      // Merge, do not overwrite. Assigning here dropped every system message but
      // the last one, silently losing the primary system prompt.
      const merged = [...(systemInstruction?.parts || []), ...textParts];
      systemInstruction = { parts: merged.length > 0 ? merged : [{ text: " " }] };
    } else if (msg.role === "user") {
      for (const p of msgParts) {
        appendContentPart("user", p);
      }
    } else if (msg.role === "assistant") {
      const parts = [...msgParts.filter((p) => p.text && p.text.trim().length > 0)];
      if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls) {
          const fn = tc.function || tc;
          const cleanName = (fn.name || "tool").replace(/_ide$/, "");
          const fnName = `${cleanName}_ide`;
          let argsObj = {};
          if (typeof fn.arguments === "object" && fn.arguments !== null) {
            argsObj = fn.arguments;
          } else if (typeof fn.arguments === "string") {
            const trimmed = fn.arguments.trim();
            if (trimmed.charCodeAt(0) === 123) {
              try {
                argsObj = JSON.parse(trimmed);
              } catch (_) {
                argsObj = {};
              }
            }
          }
          const callId = tc.id || "call_" + crypto.randomUUID().slice(0, 8);
          const partObj = {
            functionCall: { id: callId, name: fnName, args: argsObj }
          };
          const sig = (tc.id ? memoryCache.signatures.get(tc.id) : null) || fallbackSig || DEFAULT_FALLBACK_THOUGHT_SIGNATURE;
          partObj.thoughtSignature = sig;
          partObj.thought_signature = sig;
          parts.push(partObj);
        }
      }
      if (parts.length === 0) {
        parts.push({ text: " " });
      }
      for (const p of parts) {
        appendContentPart("model", p);
      }
    } else if (msg.role === "tool") {
      let toolName = msg.name;
      if (!toolName && msg.tool_call_id) {
        toolName = toolNameMap.get(msg.tool_call_id);
      }
      if (!toolName) {
        toolName = "tool";
      }
      // Google 400s with "Request contains an invalid argument" whenever a
      // functionResponse carries a different name than the functionCall it
      // answers. Clients that bridge deferred tools (Hermes' tool_call) send the
      // internal name on the result, e.g. mcp__github__create_issue, which was
      // never declared. The call's own name is always the one the model saw, so
      // it wins; the result's name is only a fallback when the call frame is gone.
      const callFnName = msg.tool_call_id ? toolNameMap.get(msg.tool_call_id) : null;
      if (callFnName) toolName = callFnName;
      else if (declaredFnNames.size > 0 && !declaredFnNames.has(`${toolName}_ide`)) {
        toolName = [...declaredFnNames][0].slice(0, -"_ide".length);
      }
      const upstreamFnName = `${toolName.replace(/_ide$/, "")}_ide`;
      let parsedContent;
      if (typeof msg.content === "object" && msg.content !== null) {
        parsedContent = msg.content;
      } else {
        const toolStr = typeof msg.content === "string" ? msg.content : msg.content != null ? String(msg.content) : "";
        const trimmed = toolStr.trim();
        if (trimmed.charCodeAt(0) === 123) {
          try {
            parsedContent = JSON.parse(trimmed);
          } catch (_) {
            parsedContent = { output: toolStr };
          }
        } else {
          parsedContent = { output: toolStr };
        }
      }
      const funcResp = {
        name: upstreamFnName,
        response: parsedContent
      };
      if (msg.tool_call_id) {
        funcResp.id = msg.tool_call_id;
      }
      appendContentPart("user", { functionResponse: funcResp });
    }
  }
  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "Hello" }] });
  }
  if (contents.length > 0 && contents[0].role === "model") {
    contents.unshift({ role: "user", parts: [{ text: "Hello" }] });
  }
  if (contents.length > 0 && contents[contents.length - 1].role === "model") {
    contents.push({ role: "user", parts: [{ text: "Please proceed." }] });
  }
  for (let c = 0; c < contents.length; c++) {
    const item = contents[c];
    if (item.role === "user" && Array.isArray(item.parts)) {
      const prevItem = c > 0 ? contents[c - 1] : null;
      const prevHasFc = prevItem && prevItem.role === "model" && Array.isArray(prevItem.parts) && prevItem.parts.some((p) => p.functionCall);
      if (!prevHasFc) {
        for (let pIdx = 0; pIdx < item.parts.length; pIdx++) {
          const part = item.parts[pIdx];
          if (part.functionResponse) {
            const fnName = part.functionResponse.name || "tool";
            const respData = part.functionResponse.response;
            const textContent = typeof respData === "object" ? JSON.stringify(respData) : String(respData ?? "");
            item.parts[pIdx] = { text: `[Tool Result ${fnName}]: ${textContent}` };
          }
        }
      }
    }
  }
  for (let c = 0; c < contents.length; c++) {
    const item = contents[c];
    if (item.role === "model" && Array.isArray(item.parts)) {
      const fcParts = item.parts.filter((p) => p.functionCall);
      if (fcParts.length > 0) {
        for (const p of fcParts) {
          if (!p.thoughtSignature && !p.thought_signature) {
            p.thoughtSignature = DEFAULT_FALLBACK_THOUGHT_SIGNATURE;
            p.thought_signature = DEFAULT_FALLBACK_THOUGHT_SIGNATURE;
          }
        }
        const nextContent = contents[c + 1];
        if (!nextContent || nextContent.role !== "user" || !Array.isArray(nextContent.parts) || !nextContent.parts.some((p) => p.functionResponse)) {
          // Google requires every functionCall to be answered. Say the tool never
          // ran instead of "success" — the old literal told the model the work was
          // done, and it then reported results it never received.
          const missingResponses = fcParts.map((fc) => ({
            functionResponse: {
              name: fc.functionCall.name,
              id: fc.functionCall.id,
              response: { error: "tool result missing: the previous tool call was not executed" }
            }
          }));
          if (nextContent && nextContent.role === "user") {
            nextContent.parts.unshift(...missingResponses);
          } else {
            contents.splice(c + 1, 0, { role: "user", parts: missingResponses });
            c++;
          }
        }
      }
    }
  }
  const mergedContents = [];
  for (const item of contents) {
    const last = mergedContents[mergedContents.length - 1];
    if (last && last.role === item.role) {
      last.parts.push(...item.parts);
    } else {
      mergedContents.push(item);
    }
  }
  contents.length = 0;
  contents.push(...mergedContents);
  let agTools = void 0;
  if (body.tools && Array.isArray(body.tools) && body.tools.length > 0) {
    const decls = body.tools.map((t) => {
      const fn = t.function || t;
      return {
        name: `${(fn.name || "tool").replace(/_ide$/, "")}_ide`,
        description: fn.description || "",
        parameters: sanitizeToolParameters(fn.parameters)
      };
    });
    agTools = [{ functionDeclarations: decls }];
  }
  function getCandidateModels(primaryModel) {
    const list = [primaryModel];
    if (primaryModel === "gemini-3.8-flash-high") {
      list.push("gemini-3.8-flash-tiered", "gemini-3.8-flash-medium", "gemini-3.8-flash-low");
    } else if (primaryModel === "gemini-3.8-flash-medium") {
      list.push("gemini-3.8-flash-tiered", "gemini-3.8-flash-low", "gemini-3.8-flash-high");
    } else if (primaryModel === "gemini-3.8-flash-low" || primaryModel === "gemini-3.8-flash-tiered") {
      list.push("gemini-3.8-flash-tiered", "gemini-3.8-flash-medium", "gemini-3.8-flash-high");
    } else if (primaryModel === "gemini-3.1-pro-high") {
      list.push("gemini-pro-agent", "gemini-3.8-flash-tiered", "gemini-3.8-flash-high");
    } else if (primaryModel === "gemini-pro-agent") {
      list.push("gemini-3.1-pro-high", "gemini-3.8-flash-tiered", "gemini-3.8-flash-high");
    } else if (primaryModel.includes("claude-sonnet-4-6")) {
      list.push("claude-opus-4-6-thinking", "gemini-3.8-flash-tiered", "gemini-3.8-flash-high");
    } else if (primaryModel.includes("claude-opus-4-6-thinking")) {
      list.push("claude-sonnet-4-6", "gemini-3.8-flash-tiered", "gemini-3.8-flash-high");
    } else if (primaryModel.includes("gpt-oss")) {
      list.push("gemini-3.8-flash-tiered", "gemini-3.8-flash-high");
    } else {
      list.push("gemini-3.8-flash-tiered", "gemini-3.8-flash-high");
    }
    return [...new Set(list)];
  }
  __name(getCandidateModels, "getCandidateModels");
  const candidateModels = getCandidateModels(upstreamModel);
  let lastErrorText = "";
  let lastStatus = 503;
  const action = stream ? "streamGenerateContent?alt=sse" : "generateContent";
  const upstreamUrl = `${CONFIG.chatDailyEndpoint}/v1internal:${action}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      console.warn(`[Global-Backoff] To\xE0n b\u1ED9 ${accounts.length} accounts v\xE0 ${candidateModels.length} models \u0111\u1EC1u b\u1EADn. Ch\u1EDD 1500ms \u0111\u1EC3 Google x\u1EA3 ngh\u1EBDn v\xE0 th\u1EED l\u1EA1i...`);
      await new Promise((r) => setTimeout(r, 1500));
    }
    for (const currentModel of candidateModels) {
      const orderedAccounts = getRankedAccounts(env, accounts, currentModel, ctx);
      for (let i = 0; i < orderedAccounts.length; i++) {
        const currentAccount = orderedAccounts[i];
        try {
          const { accessToken, projectId } = await getValidTokenForAccount(env, currentAccount);
          const agPayload = {
            project: projectId,
            model: currentModel,
            userAgent: "antigravity",
            requestType: "agent",
            requestId: `agent/${crypto.randomUUID()}/${Date.now()}/${crypto.randomUUID()}/1`,
            request: {
              contents,
              ...systemInstruction && { systemInstruction },
              ...agTools && { tools: agTools },
              generationConfig: {
                ...resolveSamplingConfig(body),
                maxOutputTokens: resolveMaxOutputTokens(body)
              },
              sessionId: `session-${Date.now()}`
            }
          };
          let upstreamRes = await fetch(upstreamUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "User-Agent": CONFIG.userAgent
            },
            body: JSON.stringify(agPayload)
          });
          if (upstreamRes.status === 401) {
            console.warn(`[Auto-Heal] Upstream tr\u1EA3 v\u1EC1 401 cho ${currentAccount.email}. \u0110ang force refresh token...`);
            try {
              const refreshed = await getValidTokenForAccount(env, currentAccount, true);
              upstreamRes = await fetch(upstreamUrl, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${refreshed.accessToken}`,
                  "Content-Type": "application/json",
                  "User-Agent": CONFIG.userAgent
                },
                body: JSON.stringify(agPayload)
              });
            } catch (rfErr) {
              console.warn(`[Auto-Heal] Force refresh th\u1EA5t b\u1EA1i cho ${currentAccount.email}:`, rfErr?.message);
            }
          }
          if (upstreamRes.status === 400) {
            const errTextPeek = await upstreamRes.text();
            if (errTextPeek.includes("thought_signature") || errTextPeek.includes("thoughtSignature")) {
              console.warn("[Auto-Heal] Upstream b\xE1o 400 missing thought_signature. \u0110ang t\u1EF1 \u0111\u1ED9ng v\xE1 fallback signature v\xE0 g\u1EEDi l\u1EA1i...");
              for (const item of contents) {
                if (item.role === "model" && Array.isArray(item.parts)) {
                  for (const part of item.parts) {
                    if (part.functionCall) {
                      part.thoughtSignature = DEFAULT_FALLBACK_THOUGHT_SIGNATURE;
                      part.thought_signature = DEFAULT_FALLBACK_THOUGHT_SIGNATURE;
                    }
                  }
                }
              }
              upstreamRes = await fetch(upstreamUrl, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                  "User-Agent": CONFIG.userAgent
                },
                body: JSON.stringify(agPayload)
              });
            } else {
              let errMsg = errTextPeek;
              try {
                const parsed = JSON.parse(errTextPeek);
                if (parsed?.error?.message) errMsg = parsed.error.message;
              } catch (_) {
              }
              if (/not found|not supported|unsupported|is not available/i.test(errMsg)) {
                console.warn(`[Auto-Failover] Model ${currentModel} tr\u1EA3 v\u1EC1 400 (${errMsg}). B\u1ECF qua v\xE0 th\u1EED model ti\u1EBFp theo...`);
                lastStatus = 400;
                lastErrorText = errMsg;
                break;
              }
              return new Response(JSON.stringify({
                error: {
                  message: errMsg,
                  type: "invalid_request_error",
                  code: 400
                }
              }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders() }
              });
            }
          }
          if (upstreamRes.status === 400) {
            const finalErr400 = await upstreamRes.text();
            let errMsg = finalErr400;
            try {
              const parsed = JSON.parse(finalErr400);
              if (parsed?.error?.message) errMsg = parsed.error.message;
            } catch (_) {
            }
            if (/not found|not supported|unsupported|is not available/i.test(errMsg)) {
              console.warn(`[Auto-Failover] Model ${currentModel} tr\u1EA3 v\u1EC1 400 sau v\xE1 signature (${errMsg}). B\u1ECF qua v\xE0 th\u1EED model ti\u1EBFp theo...`);
              lastStatus = 400;
              lastErrorText = errMsg;
              break;
            }
            return new Response(JSON.stringify({
              error: {
                message: errMsg,
                type: "invalid_request_error",
                code: 400
              }
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders() }
            });
          }
          if ([500, 502, 503, 504].includes(upstreamRes.status)) {
            lastStatus = upstreamRes.status;
            lastErrorText = await upstreamRes.text();
            console.warn(`[Instant-Failover] Upstream tr\u1EA3 v\u1EC1 m\xE3 ${upstreamRes.status} cho ${currentAccount.email} (${currentModel}). Chuy\u1EC3n ngay t\u1EE9c th\xEC sang t\xE0i kho\u1EA3n/model ti\u1EBFp theo...`);
            continue;
          }
          if (upstreamRes.status === 429) {
            lastStatus = 429;
            lastErrorText = await upstreamRes.text();
            console.warn(`[Auto-Failover] Tài khoản ${currentAccount.email} gặp giới hạn hạn ngạch (429) khi gọi ${currentModel}. Cooldown 30s rồi chuyển sang tài khoản tiếp theo...`);
            markAccountCooldown(env, currentAccount, 30e3);
            continue;
          }
          if (upstreamRes.status === 403) {
            // 403 means the account is not permitted for this API, not that it is
            // briefly busy. Treating it as a 30s rate-limit cooldown kept a
            // permanently blocked account in rotation forever.
            lastStatus = 403;
            lastErrorText = await upstreamRes.text();
            console.warn(`[Auto-Failover] Tài khoản ${currentAccount.email} bị từ chối quyền (403) khi gọi ${currentModel}. Loại khỏi pool trong 1 giờ.`);
            markAccountCooldown(env, currentAccount, 36e5);
            continue;
          }
          if (upstreamRes.status === 401) {
            // A 401 that survives a forced refresh means the refresh token is
            // dead. Retrying it forever burns a slot in the rotation, so
            // quarantine it and let the operator re-link the account.
            currentAccount.accessToken = void 0;
            currentAccount.expiresAt = 0;
            currentAccount.refreshToken = void 0;
            lastStatus = 401;
            lastErrorText = await upstreamRes.text();
            console.warn(`[Auto-Failover] Tài khoản ${currentAccount.email} bị 401 Unauthorized sau force refresh — refresh token đã chết. Loại khỏi pool, cần liên kết lại tài khoản.`);
            markAccountCooldown(env, currentAccount, 864e5);
            continue;
          }
          if (!upstreamRes.ok) {
            lastStatus = upstreamRes.status;
            lastErrorText = await upstreamRes.text();
            console.warn(`[Auto-Failover] T\xE0i kho\u1EA3n ${currentAccount.email} upstream tr\u1EA3 v\u1EC1 m\xE3 ${upstreamRes.status}: ${lastErrorText}`);
            continue;
          }
          if (!stream) {
            const agData = await upstreamRes.json();
            const candidate = agData.response?.candidates?.[0] || agData.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            let text = "";
            const toolCalls = [];
            let lastThoughtSignature = memoryCache.latestSignature || candidate?.thoughtSignature || candidate?.thought_signature || null;
            for (const part of parts) {
              const partSig = part.thoughtSignature || part.thought_signature;
              if (partSig) lastThoughtSignature = partSig;
              if (part.text) {
                text += part.text;
              }
              if (part.functionCall) {
                const realName = part.functionCall.name.replace(/_ide$/, "");
                const callId = part.functionCall.id || "call_" + crypto.randomUUID().slice(0, 8);
                const sig = partSig || candidate?.thoughtSignature || candidate?.thought_signature || lastThoughtSignature;
                if (sig) {
                  memoryCache.signatures.set(callId, sig);
                  memoryCache.latestSignature = sig;
                  if (memoryCache.signatures.size > 500) {
                    const firstKey = memoryCache.signatures.keys().next().value;
                    if (firstKey) memoryCache.signatures.delete(firstKey);
                  }
                  const now = Date.now();
                  if (env?.ANTIGRAVITY_KV && sig !== memoryCache.lastKvSig && now - memoryCache.lastKvSigTime > 3e4) {
                    memoryCache.lastKvSig = sig;
                    memoryCache.lastKvSigTime = now;
                    const p = safeKvPut(env.ANTIGRAVITY_KV, "sig:latest", sig, { expirationTtl: 2592e3 });
                    if (ctx && typeof ctx.waitUntil === "function") {
                      ctx.waitUntil(p);
                    }
                  }
                }
                toolCalls.push({
                  id: callId,
                  type: "function",
                  function: {
                    name: realName,
                    arguments: JSON.stringify(part.functionCall.args || {})
                  }
                });
              }
            }
            let completionTokens = 0;
            if (text) completionTokens += Math.ceil(text.length / 3.5);
            for (const tc of toolCalls) {
              completionTokens += 10 + Math.ceil((tc.function?.arguments || "").length / 3.5);
            }
            if (completionTokens === 0) completionTokens = 1;
            // Prefer upstream's own accounting when it provides any; the /3.5
            // estimate below badly undercounts Vietnamese text.
            const upUsage = agData.response?.usageMetadata || agData.usageMetadata;
            const usage = {
              prompt_tokens: upUsage?.promptTokenCount || promptTokens,
              completion_tokens: upUsage?.candidatesTokenCount ?? upUsage?.totalTokenCount ?? completionTokens,
              total_tokens: upUsage?.totalTokenCount || promptTokens + completionTokens
            };
            const finishReason = String(candidate?.finishReason || candidate?.finish_reason || "").toUpperCase();
            const msgObj = {
              role: "assistant",
              content: toolCalls.length > 0 ? null : text || null
            };
            if (toolCalls.length > 0) {
              msgObj.tool_calls = toolCalls;
            }
            // Report the model that actually answered. Silently serving Flash
            // while the caller asked for Opus misrepresents what they paid for.
            const servedModel = currentModel;
            const servedDowngraded = servedModel !== body.model;
            return Response.json({
              id: "chatcmpl-" + crypto.randomUUID(),
              object: "chat.completion",
              created: Math.floor(Date.now() / 1e3),
              model: servedModel,
              ...(servedDowngraded ? {
                "x-requested-model": body.model,
                "x-model-downgraded": "true"
              } : {}),
              choices: [{
                index: 0,
                message: msgObj,
                finish_reason: toolCalls.length > 0 ? "tool_calls" : finishReason === "MAX_TOKENS" ? "length" : "stop"
              }],
              usage
            }, { headers: corsHeaders() });
          }
          const responseId = "chatcmpl-" + crypto.randomUUID();
          const streamBody = createOptimizedSseStream(upstreamRes, body.model, responseId, env, ctx, promptTokens);
          return new Response(streamBody, {
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
              ...corsHeaders()
            }
          });
        } catch (err) {
          lastErrorText = err?.message || String(err);
          lastStatus = 500;
          console.warn(`[Auto-Failover] L\u1ED7i k\u1EBFt n\u1ED1i t\xE0i kho\u1EA3n ${currentAccount.email}: ${lastErrorText}`);
          continue;
        }
      }
    }
  }
  return new Response(JSON.stringify({
    error: {
      message: `To\xE0n b\u1ED9 ${accounts.length} t\xE0i kho\u1EA3n trong Antigravity Pool \u0111\u1EC1u kh\xF4ng ph\u1EA3n h\u1ED3i th\xE0nh c\xF4ng (m\xE3 cu\u1ED1i: ${lastStatus}). Chi ti\u1EBFt: ${lastErrorText}`,
      type: "upstream_error",
      code: lastStatus
    }
  }), {
    status: lastStatus || 503,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}
__name(handleChatCompletions, "handleChatCompletions");
async function handleExchangeCode(request, env) {
  if (!env.ANTIGRAVITY_KV) {
    return Response.json({ success: false, error: "Ch\u01B0a c\u1EA5u h\xECnh ANTIGRAVITY_KV!" }, { status: 500, headers: corsHeaders() });
  }
  const { callbackUrl } = await request.json().catch(() => ({}));
  let code = (callbackUrl || "").trim();
  if (code.includes("code=")) {
    try {
      const url = new URL(code);
      code = url.searchParams.get("code") || code;
    } catch (_) {
      const match = code.match(/code=([^&]+)/);
      if (match) code = decodeURIComponent(match[1]);
    }
  }
  if (!code) {
    return Response.json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y m\xE3 code trong chu\u1ED7i \u0111\xE3 nh\u1EADp!" }, { status: 400, headers: corsHeaders() });
  }
  const tokenRes = await fetch(CONFIG.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CONFIG.clientId,
      client_secret: CONFIG.clientSecret,
      code,
      redirect_uri: CONFIG.redirectUri
    })
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    return Response.json({ success: false, error: tokens.error_description || JSON.stringify(tokens) }, { status: 400, headers: corsHeaders() });
  }
  const metadata = { ideType: 9, platform: 1, pluginType: 2 };
  const loadRes = await fetch(CONFIG.loadCodeAssistUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
      "User-Agent": CONFIG.userAgent
    },
    body: JSON.stringify({ metadata })
  });
  const loadData = await loadRes.json();
  let projectId = loadData.cloudaicompanionProject;
  if (typeof projectId === "object" && projectId?.id) projectId = projectId.id;
  if (!projectId) {
    const onboardRes = await fetch(CONFIG.onboardUserUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
        "User-Agent": CONFIG.userAgent
      },
      body: JSON.stringify({ tierId: "legacy-tier", metadata })
    });
    const onboardData = await onboardRes.json();
    const respProj = onboardData.response?.cloudaicompanionProject;
    projectId = (typeof respProj === "object" ? respProj.id : respProj) || "default";
  }
  const email = decodeJwtEmail(tokens.id_token) || `T\xE0i kho\u1EA3n ${Date.now()}`;
  const accounts = await getAccountsList(env);
  const existingIdx = accounts.findIndex((a) => a.email === email);
  const accountItem = {
    id: existingIdx !== -1 ? accounts[existingIdx].id : `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    email,
    projectId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + (tokens.expires_in - 300) * 1e3,
    updatedAt: Date.now()
  };
  if (existingIdx !== -1) {
    accounts[existingIdx] = accountItem;
  } else {
    accounts.push(accountItem);
  }
  await saveAccountsList(env, accounts);
  await getDynamicModels(env, true);
  // Never echo credentials back. The old response returned the whole accountItem,
  // including accessToken and refreshToken, straight into the browser's network tab.
  return Response.json({
    success: true,
    account: { id: accountItem.id, email: accountItem.email, projectId: accountItem.projectId },
    totalAccounts: accounts.length
  }, { headers: corsHeaders() });
}
__name(handleExchangeCode, "handleExchangeCode");
async function handleGetAccounts(env) {
  const accounts = await getAccountsList(env);
  const safeAccounts = accounts.map((a) => ({
    id: a.id,
    email: a.email,
    projectId: a.projectId,
    expiresAt: a.expiresAt,
    isExpired: Date.now() > a.expiresAt
  }));
  return Response.json({ success: true, accounts: safeAccounts }, { headers: corsHeaders() });
}
__name(handleGetAccounts, "handleGetAccounts");
async function handleDeleteAccount(env, id) {
  const accounts = await getAccountsList(env);
  const filtered = accounts.filter((a) => a.id !== id);
  try {
    // Throw on KV failure — the old version swallowed it and answered
    // "success", so the UI showed the account gone while KV still held it.
    await saveAccountsList(env, filtered);
  } catch (err) {
    return Response.json({ success: false, error: err?.message || String(err) }, { status: 500, headers: corsHeaders() });
  }
  memoryCache.usageCache.delete(id);
  return Response.json({ success: true, remaining: filtered.length }, { headers: corsHeaders() });
}
__name(handleDeleteAccount, "handleDeleteAccount");
async function handleSyncModels(env) {
  try {
    const result = await refreshModelsCache(env);
    if (!result) {
      return Response.json({
        success: false,
        error: "Kh\xF4ng l\u1EA5y \u0111\u01B0\u1EE3c danh s\xE1ch models t\u1EEB upstream (pool tr\u1ED1ng ho\u1EB7c upstream l\u1ED7i). Danh s\xE1ch hi\u1EC7n t\u1EA1i gi\u1EEF nguy\xEAn."
      }, { status: 502, headers: corsHeaders() });
    }
    return Response.json({
      success: true,
      count: result.models.length,
      added: result.added,
      removed: result.removed,
      message: result.added.length > 0 ? `\u{1F195} Ph\xE1t hi\u1EC7n ${result.added.length} model m\u1EDBi: ${result.added.join(", ")}` : "Kh\xF4ng c\xF3 model m\u1EDBi.",
      models: result.models
    }, { headers: corsHeaders() });
  } catch (err) {
    return Response.json({ success: false, error: err?.message || String(err) }, { status: 500, headers: corsHeaders() });
  }
}
__name(handleSyncModels, "handleSyncModels");
async function handleListModels(env) {
  const dynamicModels = await getDynamicModels(env);
  const filtered = filterLatestModels(dynamicModels);
  const ctx = resolveContextLimit(env);
  const models = filtered.map((m) => ({
    id: m.id,
    object: "model",
    created: 17e8,
    owned_by: "google-antigravity",
    context_length: ctx,
    context_window: ctx,
    max_tokens: Math.min(ctx, SAFE_OUTPUT_TOKEN_CAP)
  }));
  return Response.json({ object: "list", data: models }, { headers: corsHeaders() });
}
__name(handleListModels, "handleListModels");
function renderLoginScreen() {
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u0110\u0103ng nh\u1EADp \u2022 Antigravity Gateway</title>
  <style>
    :root { --bg: #0b0f19; --card: #151e32; --border: #24324f; --primary: #38bdf8; --text: #f1f5f9; --muted: #94a3b8; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 24px 16px; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 32px 28px; max-width: 440px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; }
    .lock-icon { font-size: 42px; margin-bottom: 10px; }
    h1 { font-size: 20px; margin: 0 0 6px 0; color: #fff; }
    p { color: var(--muted); font-size: 13px; line-height: 1.5; margin: 0 0 20px 0; }
    input[type=password], input[type=text] { width: 100%; box-sizing: border-box; padding: 12px 14px; background: #0f172a; border: 1px solid var(--border); color: #f8fafc; border-radius: 8px; font-size: 14px; font-family: monospace; margin-bottom: 14px; outline: none; transition: border-color 0.2s; }
    input[type=password]:focus, input[type=text]:focus { border-color: var(--primary); }
    button.btn { width: 100%; display: inline-flex; align-items: center; justify-content: center; background: #0284c7; color: white; padding: 12px 16px; border-radius: 8px; text-decoration: none; border: none; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; }
    button.btn:hover { background: #0369a1; }
    .err-msg { color: #ef4444; font-size: 13px; font-weight: 600; margin-bottom: 14px; text-align: left; }
    .badge-secure { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.2); padding: 2px 8px; border-radius: 20px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="lock-icon">\u{1F510}</div>
    <div class="badge-secure">\u{1F6E1}\uFE0F Gateway Protected</div>
    <h1>C\u1ED5ng Qu\u1EA3n Tr\u1ECB Antigravity</h1>
    <p>Dashboard \u0111\xE3 \u0111\u01B0\u1EE3c kh\xF3a \u0111\u1EC3 b\u1EA3o v\u1EC7 t\xE0i kho\u1EA3n v\xE0 h\u1EA1n ng\u1EA1ch. Vui l\xF2ng nh\u1EADp API Key \u0111\u1EC3 truy c\u1EADp.</p>
    
    <div id="errMsg" class="err-msg" style="display: none;"></div>

    <form onsubmit="handleLogin(event)">
      <input type="password" id="keyInput" placeholder="Nh\u1EADp API Key (sk-ag-...)" autofocus required />
      <button type="submit" id="submitBtn" class="btn">\u{1F513} M\u1EDF Kh\xF3a Dashboard</button>
    </form>
  </div>

  <script>
    async function handleLogin(e) {
      e.preventDefault();
      const key = document.getElementById('keyInput').value.trim();
      const errEl = document.getElementById('errMsg');
      const btn = document.getElementById('submitBtn');

      if (!key) return;
      btn.disabled = true;
      btn.innerText = '\u23F3 \u0110ang ki\u1EC3m tra...';
      errEl.style.display = 'none';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('gateway_key', key);
          window.location.href = '/?key=' + encodeURIComponent(key);
        } else {
          errEl.innerText = '\u274C ' + (data.error || 'API Key kh\xF4ng ch\xEDnh x\xE1c!');
          errEl.style.display = 'block';
          btn.disabled = false;
          btn.innerText = '\u{1F513} M\u1EDF Kh\xF3a Dashboard';
        }
      } catch (err) {
        errEl.innerText = '\u274C L\u1ED7i k\u1EBFt n\u1ED1i t\u1EDBi Gateway!';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.innerText = '\u{1F513} M\u1EDF Kh\xF3a Dashboard';
      }
    }
  <\/script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() }
  });
}
__name(renderLoginScreen, "renderLoginScreen");
async function renderDashboard(request, env) {
  const accounts = await getAccountsList(env);
  const sanitizedAccounts = accounts.map((a) => ({ id: a.id, email: a.email, projectId: a.projectId }));
  const origin = new URL(request.url).origin;
  const models = await getDynamicModels(env);
  const activeKey = await getRequiredApiKey(env);
  const authUrl = `${CONFIG.authUrl}?` + new URLSearchParams({
    client_id: CONFIG.clientId,
    response_type: "code",
    redirect_uri: CONFIG.redirectUri,
    scope: CONFIG.scopes.join(" "),
    access_type: "offline",
    prompt: "consent"
  }).toString();
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Antigravity Multi-Account Gateway</title>
  <style>
    :root { --bg: #0b0f19; --card: #151e32; --border: #24324f; --primary: #38bdf8; --text: #f1f5f9; --muted: #94a3b8; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 24px 16px; margin: 0; display: flex; justify-content: center; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 28px; max-width: 720px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h1 { font-size: 22px; margin: 0 0 6px 0; color: var(--primary); }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; }
    .badge-online { background: #064e3b; color: #6ee7b7; border: 1px solid #059669; }
    .badge-offline { background: #7f1d1d; color: #fca5a5; border: 1px solid #dc2626; }
    
    .tabs-container { display: flex; align-items: center; gap: 8px; margin: 16px 0 12px 0; overflow-x: auto; padding-bottom: 4px; }
    .acc-tab { background: #0f172a; border: 1px solid var(--border); color: var(--muted); padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; }
    .acc-tab:hover { background: #1e293b; color: white; }
    .acc-tab.active { background: #0284c7; color: white; border-color: #38bdf8; box-shadow: 0 0 10px rgba(2,132,199,0.4); }
    .btn-add-tab { background: #1e293b; border: 1px dashed #475569; color: #38bdf8; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; white-space: nowrap; }
    .btn-add-tab:hover { background: #334155; border-color: #38bdf8; }

    .step-box { background: rgba(11, 15, 25, 0.6); border: 1px solid var(--border); border-radius: 10px; padding: 18px; margin: 14px 0; }
    .step-title { font-weight: 600; font-size: 15px; color: #e2e8f0; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    
    a.btn, button.btn { display: inline-flex; align-items: center; justify-content: center; background: #0284c7; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; border: none; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s; }
    a.btn:hover, button.btn:hover { background: #0369a1; }
    button.btn-danger { background: #991b1b; }
    button.btn-danger:hover { background: #b91c1c; }
    button.btn-sm { padding: 5px 10px; font-size: 12px; background: #334155; }
    button.btn-sm:hover { background: #475569; }
    
    input[type=text], input[type=password] { width: 100%; box-sizing: border-box; padding: 10px; background: #0f172a; border: 1px solid var(--border); color: #f8fafc; border-radius: 8px; font-size: 13px; margin: 6px 0; outline: none; }
    input[type=text]:focus, input[type=password]:focus { border-color: var(--primary); }
    code { background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #fbbf24; font-family: monospace; }
    pre { background: #0b0f19; border: 1px solid var(--border); padding: 12px; border-radius: 8px; overflow-x: auto; color: #bae6fd; font-size: 12px; margin: 6px 0 0 0; }
    .model-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .model-tag { background: #1e293b; border: 1px solid var(--border); padding: 3px 8px; border-radius: 6px; font-size: 11px; color: #7dd3fc; font-family: monospace; }
    
    .quota-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 8px; }
    @media (max-width: 600px) { .quota-grid { grid-template-columns: 1fr; } }
    .quota-box { background: #0f172a; border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
    .quota-name { font-weight: 600; font-size: 13px; color: #38bdf8; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
    .quota-metric { margin-bottom: 8px; }
    .quota-label { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-bottom: 3px; }
    .progress-bar-bg { background: #1e293b; border-radius: 99px; height: 7px; overflow: hidden; width: 100%; }
    .progress-bar-fill { height: 100%; border-radius: 99px; transition: width 0.5s; }
    .fill-green { background: #10b981; }
    .fill-yellow { background: #f59e0b; }
    .fill-red { background: #ef4444; }
    .quota-reset { font-size: 10px; color: #64748b; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h1>\u{1F680} Antigravity Gateway</h1>
        <p style="color: var(--muted); margin: 0; font-size: 13px;">Multi-Account Pool \u2022 B\u1EA3o v\u1EC7 b\u1EB1ng API Key b\xED m\u1EADt</p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span class="badge ${accounts.length > 0 ? "badge-online" : "badge-offline"}">
          \u25CF Pool: ${accounts.length} T\xE0i kho\u1EA3n
        </span>
        <a href="/logout" onclick="localStorage.removeItem('gateway_key')" class="btn btn-sm" style="background: #334155; text-decoration: none;">\u{1F6AA} \u0110\u0103ng xu\u1EA5t</a>
      </div>
    </div>

    <!-- H\xC0NG TABS CH\u1ECCN T\xC0I KHO\u1EA2N -->
    <div class="tabs-container" id="tabsList">
      ${accounts.map((acc, idx) => `
        <div class="acc-tab ${idx === 0 ? "active" : ""}" onclick="switchAccount('${acc.id}', this)">
          <span>\u{1F464} ${acc.email.split("@")[0]}</span>
        </div>
      `).join("")}
      <div class="btn-add-tab" onclick="toggleAddAccountModal()">\u2795 Th\xEAm t\xE0i kho\u1EA3n</div>
    </div>

    <!-- KHUNG QUOTA C\u1EE6A T\xC0I KHO\u1EA2N \u0110ANG CH\u1ECCN -->
    <div class="step-box" id="activeAccountCard" style="${accounts.length > 0 ? "" : "display: none;"}">
      <div class="step-title">
        <span id="currentAccountHeader">\u{1F4CA} H\u1EA1n ng\u1EA1ch t\xE0i kho\u1EA3n</span>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-sm" onclick="reloadCurrentQuota()">\u{1F504} L\xE0m m\u1EDBi</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCurrentAccount()">\u{1F5D1}\uFE0F X\xF3a</button>
        </div>
      </div>
      <div id="quotaLoading" style="color: var(--muted); font-size: 12px;">\u0110ang ki\u1EC3m tra quota...</div>
      <div id="quotaContainer" class="quota-grid" style="display: none;">
        <div class="quota-box">
          <div class="quota-name"><span>\u2728 Gemini Models</span><span style="font-size: 10px; color: var(--muted);">Flash & Pro</span></div>
          <div class="quota-metric">
            <div class="quota-label"><span>5 gi\u1EDD:</span><b id="gemini5h">--%</b></div>
            <div class="progress-bar-bg"><div id="gemini5hBar" class="progress-bar-fill fill-green" style="width: 0%;"></div></div>
            <div id="gemini5hReset" class="quota-reset">--</div>
          </div>
          <div class="quota-metric">
            <div class="quota-label"><span>Tu\u1EA7n:</span><b id="geminiWeekly">--%</b></div>
            <div class="progress-bar-bg"><div id="geminiWeeklyBar" class="progress-bar-fill fill-green" style="width: 0%;"></div></div>
            <div id="geminiWeeklyReset" class="quota-reset">--</div>
          </div>
        </div>

        <div class="quota-box">
          <div class="quota-name"><span>\u{1F3AD} Claude & GPT</span><span style="font-size: 10px; color: var(--muted);">Sonnet & Opus</span></div>
          <div class="quota-metric">
            <div class="quota-label"><span>5 gi\u1EDD:</span><b id="claude5h">--%</b></div>
            <div class="progress-bar-bg"><div id="claude5hBar" class="progress-bar-fill fill-green" style="width: 0%;"></div></div>
            <div id="claude5hReset" class="quota-reset">--</div>
          </div>
          <div class="quota-metric">
            <div class="quota-label"><span>Tu\u1EA7n:</span><b id="claudeWeekly">--%</b></div>
            <div class="progress-bar-bg"><div id="claudeWeeklyBar" class="progress-bar-fill fill-green" style="width: 0%;"></div></div>
            <div id="claudeWeeklyReset" class="quota-reset">--</div>
          </div>
        </div>
      </div>
    </div>

    <!-- B\u1EA2NG C\xC2N B\u1EB0NG T\u1EA2I USAGE QUOTA (5H & TU\u1EA6N) -->
    <div class="step-box" style="margin-top: 14px;">
      <div class="step-title">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>\u2696\uFE0F B\u1ED9 \u0110i\u1EC1u Ph\u1ED1i C\xE2n B\u1EB1ng T\u1EA3i \u2022 Dynamic SWRR Balancer v2.0</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <select id="balanceModelSelect" onchange="loadBalanceTable()" style="background: #0f172a; border: 1px solid var(--border); color: #38bdf8; padding: 4px 8px; border-radius: 6px; font-size: 12px; outline: none; cursor: pointer;">
            <option value="gemini-3.8-flash-high" selected>\u2728 gemini-3.8-flash-high</option>
            <option value="gemini-3.8-flash-medium">\u26A1 gemini-3.8-flash-medium</option>
            <option value="gemini-3.1-pro-high">\u{1F9E0} gemini-3.1-pro-high</option>
            <option value="claude-sonnet-4-6">\u{1F3AD} claude-sonnet-4-6</option>
            <option value="claude-opus-4-6-thinking">\u{1F52E} claude-opus-4-6-thinking</option>
            <option value="gpt-oss-120b">\u{1F310} gpt-oss-120b</option>
          </select>
          <button class="btn btn-sm" onclick="loadBalanceTable()">\u{1F504} C\u1EADp nh\u1EADt</button>
        </div>
      </div>
      <p style="color: var(--muted); font-size: 12px; margin: 0 0 10px 0; line-height: 1.5;">
        H\u1EC7 th\u1ED1ng \u0111i\u1EC1u ph\u1ED1i l\u01B0u l\u01B0\u1EE3ng theo thu\u1EADt to\xE1n <b>Smooth Weighted Round-Robin (SWRR)</b> k\u1EBFt h\u1EE3p <b>T\u1EADn d\u1EE5ng Reset kh\u1EA9n c\u1EA5p (Urgent Reset Harvesting)</b> v\xE0 <b>B\u1EA3o t\u1ED3n h\u1EA1n ng\u1EA1ch Tu\u1EA7n (Burn-Rate Preservation)</b>. T\u1EF1 \u0111\u1ED9ng chia t\u1EA3i m\u01B0\u1EE3t m\xE0 theo t\u1EF7 l\u1EC7 th\u1EDDi gian th\u1EF1c.
      </p>
      <div id="balanceTableContainer" style="overflow-x: auto;">
        <div style="color: var(--muted); font-size: 12px; padding: 8px 0;">\u0110ang n\u1EA1p tr\u1EA1ng th\xE1i c\xE2n b\u1EB1ng...</div>
      </div>
    </div>

    <!-- FORM TH\xCAM T\xC0I KHO\u1EA2N -->
    <div class="step-box" id="addAccountBox" style="${accounts.length === 0 ? "" : "display: none;"}">
      <div class="step-title">
        <span>\u2795 Th\xEAm t\xE0i kho\u1EA3n Google v\xE0o Pool</span>
        ${accounts.length > 0 ? `<button class="btn btn-sm" onclick="toggleAddAccountModal()">\u0110\xF3ng</button>` : ""}
      </div>
      <p style="color: var(--muted); font-size: 13px; margin: 0 0 8px 0;">
        B\u1EA5m \u0111\u0103ng nh\u1EADp b\u1EB1ng t\xE0i kho\u1EA3n Google \u0111\u1EC3 c\u1ED9ng d\u1ED3n quota:
      </p>
      <a href="${authUrl}" target="_blank" class="btn">\u{1F517} 1. \u0110\u0103ng nh\u1EADp Google</a>
      <input type="text" id="callbackInput" placeholder="D\xE1n link callback: http://localhost:8085/callback?code=4/0A..." />
      <button class="btn" onclick="submitNewAccount()">\u26A1 2. Th\xEAm v\xE0o Pool</button>
      <div id="statusMsg" style="margin-top: 8px; font-weight: 600; font-size: 13px;"></div>
    </div>

    <!-- Models List -->
    <div class="step-box">
      <div class="step-title">
        <span>\u{1F916} Models h\u1ED7 tr\u1EE3 (${models.length}) \u2022 C\u1ED1 \u0111\u1ECBnh Context: 262K</span>
        <button class="btn btn-sm" onclick="syncModels()">\u{1F504} C\u1EADp nh\u1EADt Models</button>
      </div>
      <div class="model-tags">
        ${models.slice(0, 15).map((m) => `<span class="model-tag">${m.id}</span>`).join("")}
        ${models.length > 15 ? `<span class="model-tag">+${models.length - 15} models</span>` : ""}
      </div>
    </div>

    <!-- C\u1EA5u h\xECnh IDE -->
    <div class="step-box">
      <div class="step-title">\u{1F4CB} C\u1EA5u h\xECnh Cursor / Claude Code / Cline / Hermes</div>
      <pre>Base URL: ${origin}/v1
API Key:  ${activeKey ? "xác thực qua cookie phiên đăng nhập (không in ra HTML)" : "[Chưa thiết lập]"}</pre>
    </div>

    <!-- \u0110\u1ED5i API Key b\u1EA3o v\u1EC7 Gateway -->
    <div class="step-box">
      <div class="step-title">\u{1F511} \u0110\u1ED5i API Key b\u1EA3o v\u1EC7 Gateway</div>
      <p style="color: var(--muted); font-size: 13px; margin: 0 0 8px 0;">
        Kh\xF3a hi\u1EC7n t\u1EA1i: <code>${maskKey(activeKey)}</code>. Nh\u1EADp key m\u1EDBi (t\u1ED1i thi\u1EC3u 8 k\xFD t\u1EF1):
      </p>
      <div style="display: flex; gap: 8px;">
        <input type="text" id="newApiKeyInput" placeholder="V\xED d\u1EE5: sk-ag-..." style="margin: 0;" />
        <button class="btn" style="white-space: nowrap;" onclick="changeApiKey()">\u{1F4BE} L\u01B0u Key m\u1EDBi</button>
      </div>
      <div id="keyUpdateMsg" style="margin-top: 8px; font-weight: 600; font-size: 13px;"></div>
    </div>
  </div>

  <script>
    let currentAccountId = "${accounts[0]?.id || ""}";
    const accountsData = ${JSON.stringify(sanitizedAccounts)};

    async function changeApiKey() {
      const input = document.getElementById('newApiKeyInput');
      const msg = document.getElementById('keyUpdateMsg');
      const val = (input.value || '').trim();
      if (!val || val.length < 8) {
        msg.innerText = '\u274C API Key ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 8 k\xFD t\u1EF1!';
        msg.style.color = '#ef4444';
        return;
      }
      msg.innerText = '\u0110ang l\u01B0u...';
      msg.style.color = 'var(--muted)';
      try {
        const res = await fetch('/api/key/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ newApiKey: val }),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('gateway_key', val);
          msg.innerText = '\u2705 ' + data.message;
          msg.style.color = '#10b981';
          setTimeout(() => location.reload(), 1500);
        } else {
          msg.innerText = '\u274C L\u1ED7i: ' + (data.error || 'Kh\xF4ng th\u1EC3 \u0111\u1ED5i key');
          msg.style.color = '#ef4444';
        }
      } catch (err) {
        msg.innerText = '\u274C L\u1ED7i k\u1EBFt n\u1ED1i: ' + err.message;
        msg.style.color = '#ef4444';
      }
    }

    function authHeaders() {
      const k = localStorage.getItem('gateway_key') || '';
      return k ? { 'Authorization': 'Bearer ' + k } : {};
    }

    function getBarColor(pct) {
      if (pct > 50) return 'fill-green';
      if (pct > 20) return 'fill-yellow';
      return 'fill-red';
    }

    function formatTime(isoStr) {
      if (!isoStr) return '';
      try {
        const d = new Date(isoStr);
        return 'H\u1ED3i: ' + d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) + ' ' + d.toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'});
      } catch (e) { return ''; }
    }

    function switchAccount(accId, tabEl) {
      currentAccountId = accId;
      document.querySelectorAll('.acc-tab').forEach(t => t.classList.remove('active'));
      if (tabEl) tabEl.classList.add('active');
      const acc = accountsData.find(a => a.id === accId);
      if (acc) {
        document.getElementById('currentAccountHeader').innerText = '\u{1F4CA} H\u1EA1n ng\u1EA1ch: ' + acc.email;
        loadQuotaForAccount(accId);
      }
    }

    async function loadQuotaForAccount(accId) {
      const loading = document.getElementById('quotaLoading');
      const container = document.getElementById('quotaContainer');
      loading.style.display = 'block';
      loading.innerText = '\u0110ang t\u1EA3i quota...';
      container.style.display = 'none';

      try {
        const res = await fetch('/api/usage?accountId=' + accId, {
          headers: authHeaders(),
          credentials: 'include'
        });
        const data = await res.json();
        if (!data.success) {
          const errDetail = typeof data.error === 'object' ? data.error?.message || JSON.stringify(data.error) : (data.error || 'Kh\xF4ng th\u1EC3 t\u1EA3i quota');
          loading.innerText = 'L\u1ED7i quota: ' + errDetail;
          return;
        }
        const u = data.usage || (Array.isArray(data.usages) ? data.usages[0] : null);
        if (!u) {
          loading.innerText = 'Ch\u01B0a c\xF3 th\xF4ng tin quota';
          return;
        }

        if (u.gemini?.fiveHour) {
          const p = u.gemini.fiveHour.remainingPercentage ?? 0;
          document.getElementById('gemini5h').innerText = p + '%';
          const b = document.getElementById('gemini5hBar');
          b.style.width = p + '%';
          b.className = 'progress-bar-fill ' + getBarColor(p);
          document.getElementById('gemini5hReset').innerText = formatTime(u.gemini.fiveHour.resetTime);
        }
        if (u.gemini?.weekly) {
          const p = u.gemini.weekly.remainingPercentage ?? 0;
          document.getElementById('geminiWeekly').innerText = p + '%';
          const b = document.getElementById('geminiWeeklyBar');
          b.style.width = p + '%';
          b.className = 'progress-bar-fill ' + getBarColor(p);
          document.getElementById('geminiWeeklyReset').innerText = formatTime(u.gemini.weekly.resetTime);
        }

        if (u.claude?.fiveHour) {
          const p = u.claude.fiveHour.remainingPercentage ?? 0;
          document.getElementById('claude5h').innerText = p + '%';
          const b = document.getElementById('claude5hBar');
          b.style.width = p + '%';
          b.className = 'progress-bar-fill ' + getBarColor(p);
          document.getElementById('claude5hReset').innerText = formatTime(u.claude.fiveHour.resetTime);
        }
        if (u.claude?.weekly) {
          const p = u.claude.weekly.remainingPercentage ?? 0;
          document.getElementById('claudeWeekly').innerText = p + '%';
          const b = document.getElementById('claudeWeeklyBar');
          b.style.width = p + '%';
          b.className = 'progress-bar-fill ' + getBarColor(p);
          document.getElementById('claudeWeeklyReset').innerText = formatTime(u.claude.weekly.resetTime);
        }

        loading.style.display = 'none';
        container.style.display = 'grid';
      } catch (err) {
        loading.innerText = 'L\u1ED7i k\u1EBFt n\u1ED1i: ' + err.message;
      }
    }

    function reloadCurrentQuota() {
      if (currentAccountId) loadQuotaForAccount(currentAccountId);
    }

    async function deleteCurrentAccount() {
      if (!currentAccountId) return;
      if (!confirm('B\u1EA1n c\xF3 ch\u1EAFc mu\u1ED1n x\xF3a t\xE0i kho\u1EA3n n\xE0y kh\u1ECFi Pool?')) return;
      await fetch('/api/accounts/' + currentAccountId, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      location.reload();
    }

    function toggleAddAccountModal() {
      const box = document.getElementById('addAccountBox');
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
      if (box.style.display === 'block') {
        box.scrollIntoView({ behavior: 'smooth' });
      }
    }

    async function submitNewAccount() {
      const input = document.getElementById('callbackInput').value.trim();
      const statusEl = document.getElementById('statusMsg');
      if (!input) return alert('Vui l\xF2ng d\xE1n link callback!');
      statusEl.innerText = '\u23F3 \u0110ang x\xE1c th\u1EF1c v\xE0 th\xEAm t\xE0i kho\u1EA3n v\xE0o Pool...';
      statusEl.style.color = '#38bdf8';
      const res = await fetch('/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callbackUrl: input })
      });
      const data = await res.json();
      if (data.success) {
        statusEl.innerText = '\u2705 Th\xEAm th\xE0nh c\xF4ng t\xE0i kho\u1EA3n: ' + data.account.email;
        statusEl.style.color = '#34d399';
        setTimeout(() => location.reload(), 1200);
      } else {
        statusEl.innerText = '\u274C L\u1ED7i: ' + (data.error || 'Th\u1EA5t b\u1EA1i');
        statusEl.style.color = '#f87171';
      }
    }

    async function syncModels() {
      const res = await fetch('/api/models/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('\u0110\xE3 c\u1EADp nh\u1EADt ' + data.count + ' models!');
        location.reload();
      } else {
        alert('L\u1ED7i: ' + data.error);
      }
    }

    async function loadBalanceTable() {
      const container = document.getElementById('balanceTableContainer');
      if (!container) return;
      const modelSelect = document.getElementById('balanceModelSelect');
      const selectedModel = modelSelect ? modelSelect.value : 'gemini-3.8-flash-high';

      try {
        const res = await fetch('/api/balance?model=' + encodeURIComponent(selectedModel), {
          headers: authHeaders(),
          credentials: 'include'
        });
        const data = await res.json();
        if (!data.success || !Array.isArray(data.accounts)) {
          container.innerHTML = '<div style="color: var(--muted); font-size: 12px; padding: 6px 0;">Kh\xF4ng th\u1EC3 t\u1EA3i d\u1EEF li\u1EC7u c\xE2n b\u1EB1ng.</div>';
          return;
        }

        let html = '<table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; min-width: 650px;">';
        html += '<tr style="border-bottom: 1px solid var(--border); color: var(--muted);">';
        html += '<th style="padding: 8px 6px;">T\xE0i kho\u1EA3n</th>';
        html += '<th style="padding: 8px 6px;">H\u1EA1n ng\u1EA1ch 5 Gi\u1EDD</th>';
        html += '<th style="padding: 8px 6px;">H\u1EA1n ng\u1EA1ch Tu\u1EA7n</th>';
        html += '<th style="padding: 8px 6px;">T\u1EF7 l\u1EC7 Traffic (SWRR)</th>';
        html += '<th style="padding: 8px 6px;">Ch\u1EBF \u0111\u1ED9 \u0110i\u1EC1u ph\u1ED1i</th>';
        html += '<th style="padding: 8px 6px;">L\u01B0\u1EE3t ti\u1EBFp theo</th>';
        html += '</tr>';

        for (const a of data.accounts) {
          const nextBadge = a.isNext 
            ? '<span style="background: #0284c7; color: white; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; box-shadow: 0 0 8px rgba(2,132,199,0.5);">\u2B50 L\u01B0\u1EE3t ti\u1EBFp theo</span>' 
            : '<span style="color: #64748b; font-size: 11px;">Lu\xE2n phi\xEAn ti\u1EBFp sau</span>';
          
          const modeBadge = '<span style="background: ' + (a.dispatchColor || '#10b981') + '22; color: ' + (a.dispatchColor || '#10b981') + '; border: 1px solid ' + (a.dispatchColor || '#10b981') + '44; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap;">' + a.dispatchMode + '</span>';

          html += '<tr style="border-bottom: 1px solid #1e293b;">';
          
          html += '<td style="padding: 10px 6px; font-weight: 600; color: #f8fafc;">';
          html += '<div>\u{1F464} ' + a.email.split('@')[0] + '</div>';
          html += '<div style="color: #64748b; font-size: 10px; font-family: monospace;">' + a.email + '</div>';
          html += '</td>';

          html += '<td style="padding: 10px 6px; min-width: 110px;">';
          html += '<div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">';
          html += '<b style="color: ' + getBarColorHex(a.fiveHour) + ';">' + a.fiveHour + '%</b>';
          html += '<span style="color: #64748b; font-size: 10px;">\u23F3 ' + (a.fiveHourCountdown || '--') + '</span>';
          html += '</div>';
          html += '<div class="progress-bar-bg" style="height: 5px;"><div class="progress-bar-fill" style="width: ' + a.fiveHour + '%; background: ' + getBarColorHex(a.fiveHour) + ';"></div></div>';
          html += '</td>';

          html += '<td style="padding: 10px 6px; min-width: 110px;">';
          html += '<div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">';
          html += '<b style="color: ' + getBarColorHex(a.weekly) + ';">' + a.weekly + '%</b>';
          html += '<span style="color: #64748b; font-size: 10px;">\u23F3 ' + (a.weeklyCountdown || '--') + '</span>';
          html += '</div>';
          html += '<div class="progress-bar-bg" style="height: 5px;"><div class="progress-bar-fill" style="width: ' + a.weekly + '%; background: ' + getBarColorHex(a.weekly) + ';"></div></div>';
          html += '</td>';

          html += '<td style="padding: 10px 6px; min-width: 120px;">';
          html += '<div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">';
          html += '<b style="color: #38bdf8;">' + (a.trafficShare || 0) + '%</b>';
          html += '<span style="color: #64748b; font-size: 10px;">W: ' + (a.effectiveWeight || 0) + '</span>';
          html += '</div>';
          html += '<div class="progress-bar-bg" style="height: 5px;"><div class="progress-bar-fill" style="width: ' + (a.trafficShare || 0) + '%; background: #38bdf8;"></div></div>';
          html += '</td>';

          html += '<td style="padding: 10px 6px;">' + modeBadge + '</td>';
          html += '<td style="padding: 10px 6px;">' + nextBadge + '</td>';
          html += '</tr>';
        }

        html += '</table>';
        container.innerHTML = html;
      } catch (err) {
        container.innerHTML = '<div style="color: #f87171; font-size: 12px; padding: 6px 0;">L\u1ED7i: ' + err.message + '</div>';
      }
    }

    function getBarColorHex(p) {
      if (p > 50) return '#10b981';
      if (p > 20) return '#f59e0b';
      return '#ef4444';
    }

    loadBalanceTable();

    if (currentAccountId) {
      const acc = accountsData.find(a => a.id === currentAccountId);
      if (acc) document.getElementById('currentAccountHeader').innerText = '\u{1F4CA} H\u1EA1n ng\u1EA1ch: ' + acc.email;
      loadQuotaForAccount(currentAccountId);
    }
  <\/script>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() }
  });
}
__name(renderDashboard, "renderDashboard");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
