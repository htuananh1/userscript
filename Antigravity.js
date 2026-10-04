/*!
 * Antigravity Multi-Account Gateway v2.0.0
 * Built: 2026-10-03T06:25:44.475Z
 * Modules: 00-config.js, 10-utils.js, 20-auth.js, 30-storage.js, 40-models.js, 50-translate.js, 60-upstream.js, 70-openai.js, 75-anthropic.js, 80-responses.js, 85-admin.js, 90-dashboard.js, 99-index.js
 * Nguồn: https://github.com/htuananh1/userscript/blob/main/Antigravity.js
 */

/* ======================== 00-config.js ======================== */
/*!
 * ============================================================================
 *  Antigravity Multi-Account Gateway  —  v2.0.0
 *  Single-file Cloudflare Worker (OpenAI / Anthropic / Responses compatible)
 *  Nguồn gốc: https://github.com/htuananh1/userscript/blob/main/Antigravity.js
 *  Build: `node build.mjs` -> Antigravity.js
 * ============================================================================
 *  PHẦN 1/12 — Cấu hình, hằng số & cache bộ nhớ
 * ============================================================================
 */

var GATEWAY_VERSION = "2.0.0";

// Phiên bản client Antigravity báo lên Google. Cập nhật khi IDE ra bản mới:
// https://antigravity.google/docs/changelog/?tab=hub
// Có thể ghi đè không cần build lại:  env.ANTIGRAVITY_CLIENT_VERSION = "2.20.0"
var CLIENT_VERSION = "2.19.1";
var DEFAULT_PLATFORM = "darwin/arm64";

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
  clientName: "antigravity"
};

// Model dự phòng khi chưa đồng bộ được với upstream.
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

// Bí danh model: rất nhiều client (Cursor, Cline, Roo, Continue, SDK cũ...) gửi
// tên model cứng như "gpt-4o" / "claude-3-5-sonnet-20241022". Bảng này giúp
// request không bị 400 "model not found" mà được route về model Antigravity gần
// nhất. Ghi đè/thêm qua env.MODEL_ALIASES (JSON) nếu cần.
var MODEL_ALIASES = {
  // OpenAI cũ -> model Antigravity
  "gpt-4": "gemini-3.1-pro-high",
  "gpt-4-turbo": "gemini-3.1-pro-high",
  "gpt-4o": "gemini-3.8-flash-high",
  "gpt-4o-mini": "gemini-3.8-flash-low",
  "gpt-4.1": "gemini-3.8-flash-high",
  "gpt-4.1-mini": "gemini-3.8-flash-low",
  "gpt-5": "gemini-3.1-pro-high",
  "gpt-5-mini": "gemini-3.8-flash-high",
  "o1": "gemini-3.1-pro-high",
  "o3": "gemini-3.1-pro-high",
  "o3-mini": "gemini-3.8-flash-high",
  "o4-mini": "gemini-3.8-flash-high",
  "gpt-oss-120b-medium": "gpt-oss-120b-medium",
  // Anthropic
  "claude-3-5-sonnet": "claude-sonnet-4-6",
  "claude-3-5-sonnet-latest": "claude-sonnet-4-6",
  "claude-3-7-sonnet": "claude-sonnet-4-6",
  "claude-sonnet-4": "claude-sonnet-4-6",
  "claude-sonnet-4-5": "claude-sonnet-4-6",
  "claude-3-opus": "claude-opus-4-6-thinking",
  "claude-opus-4": "claude-opus-4-6-thinking",
  "claude-opus-4-5": "claude-opus-4-6-thinking",
  "claude-3-5-haiku": "gemini-3.8-flash-low",
  "claude-3-haiku": "gemini-3.8-flash-low",
  // Gemini cũ
  "gemini-1.5-pro": "gemini-3.1-pro-high",
  "gemini-2.0-flash": "gemini-3.8-flash-high",
  "gemini-2.5-pro": "gemini-3.1-pro-high",
  "gemini-2.5-flash": "gemini-3.8-flash-high",
  "gemini-3-pro": "gemini-3.1-pro-high",
  "gemini-3-flash": "gemini-3.8-flash-high",
  // Model "suy luận" khác thường gặp trong client
  "deepseek-r1": "gemini-3.1-pro-high",
  "deepseek-v3": "gemini-3.8-flash-high",
  "qwen-max": "gemini-3.1-pro-high",
  "llama-3.3-70b": "gpt-oss-120b-medium"
};

var DEFAULT_FALLBACK_THOUGHT_SIGNATURE = "ErIFCq8FAWkUfRNRX+NpVttXND51fOWY2hAQlaCbGt6pi0rvvTxuV8kx81UNuxvcT5yUwIw/bXJgBlSGjXDEmRfsrsPLVRhu5mCSLhO2CPEBn5wZI6RecFaTIWpvFzNq176sQpq29EI3xWzMkn1XqdJ/smbc8H+g4Mdl3X5QmoRTbLkP7YIIxJkF+V2XdN5yIgmG8Uv8kPWoK/LsYdGM+oKB49HFY0aZOtdyhYxFW8c/02Dw87SRWRN9jBPY1aQNbol2kk+/HYCD+Otcl4soCMNyVlY6441qnq3kNo/c+CA6r60wKrLV9vmVwoezRYfE4d08e7nho8p2HmckbMJeBU6mhA+/yNR3yVYo8LAS6QYD0HnkDbEFazg1Ubi1v+hjT48Goo9yFDKenaMAzrZSbTZxKVxkjfe04hoBKbrqVBxiEP69QUIF4KrSn+aH5XcBkVMqPfU/QzHjjgKTEUMEqIdeYFzd1F1Vo+rwrVM13LyWrvZU5WnD5+Z34afw9EFQgWXK3VOy8wqi0qXu6hFWWjw+8te5n8s7EITqp7JzlIOIkLrsKhbK9CnnKw3YkZEGjlyc6noDFmi10uvQqsN7LxLrv4kniZbjgdc5tvlf/c2BE9My+cQzGY2Y3YQLcz6Ggoi0ZNP+8AZ3u7KNXTr+Awr564Hnfy3oYq5zVLDObDZU5JToWh9oYRiplL13A3XN9Cgf6XdW/IG2/UsOuql/t6B0nmjOYl9Xl7WZbrGhtMtdKmnGGpf+3uSTXr+/GbuRMZERKcokFlKlaLYj0O1TWeVD7bkKIprzE1o3EDaA/wk2wMVPUR/Ec+LiNivDaBV7S+/BYo+KBH953S4GusDdnHdSnx383MXNzfJG8bAb6cEgaWnUHWbc48bVbmc6mAhgJtG+bS/SvFoAWRqgTeeYOi5Lo7s7";

// ---------------------------------------------------------------------------
// Hằng số giới hạn / thời gian
// ---------------------------------------------------------------------------
var FIXED_CONTEXT_LIMIT = 98304;         // ngữ cảnh mặc định (token)
var DEFAULT_MAX_CONTEXT_MESSAGES = 160;  // số message tối đa giữ lại
var SAFE_OUTPUT_TOKEN_CAP = 65536;       // trần cứng maxOutputTokens
var MIN_OUTPUT_TOKEN_FLOOR = 1024;       // sàn maxOutputTokens (model thinking cần chỗ)
var DEFAULT_MAX_OUTPUT_TOKENS = 8192;

var AUTH_FAILURE_WINDOW_MS = 600000;     // 10 phút
var AUTH_MAX_FAILURES = 8;               // /key
var IP_FAILURE_WINDOW_MS = 300000;       // 5 phút
var IP_MAX_FAILURES = 25;               // /IP
var RATE_LIMIT_WINDOW_MS = 60000;

var ACCOUNTS_CACHE_MS = 120000;          // cache danh sách tài khoản (RAM)
var SESSION_CACHE_MS = 60000;            // cache xác thực session cookie (RAM)
var QUOTA_CACHE_MS = 300000;             // cache quota thành công (RAM) 5 phút
var QUOTA_STALE_MS = 30000;              // hạn "mềm" trước khi SWR nền chạy lại
var USAGE_API_CACHE_MS = 5000;           // /api/usage: chống spam upstream
var MODELS_CACHE_MS = 21600000;          // 6 giờ
var SIG_KV_TTL_SEC = 2592000;            // 30 ngày
var SESSION_TTL_SEC = 2592000;           // 30 ngày (cookie session)

// ---------------------------------------------------------------------------
// Cache trong bộ nhớ isolate
// ---------------------------------------------------------------------------
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
  accountLocks: new Map(),        // id -> Promise (khoá ghi theo từng account)
  usageCache: new Map(),          // id -> { data, expiresAt, isRateLimited, rateLimitExpiresAt }
  usageApiCache: new Map(),       // id -> { at, payload }
  refreshLocks: new Map(),        // khoá chống gọi trùng (token/quota)
  signatures: new Map(),          // callId -> thoughtSignature
  latestSignature: DEFAULT_FALLBACK_THOUGHT_SIGNATURE,
  lastKvSig: null,
  lastKvSigTime: 0,
  rrCounter: 0,
  swrrState: new Map(),           // accountId -> trọng số ảo (SWRR)
  rateBuckets: new Map(),         // key -> { count, windowStart }
  authFailures: new Map(),        // apiKey -> { first, count }
  ipFailures: new Map(),          // ip -> { first, count }
  sessions: new Map(),            // sid -> { key, exp }
  statsFlushedAt: 0,
  modelsLastError: null,
  lastUpstreamError: null
};

/* ======================== 10-utils.js ======================== */
/* ============================================================================
 *  PHẦN 2/12 — Tiện ích dùng chung, thống kê & log
 * ============================================================================
 */

// ------------------------------ Env helpers --------------------------------
function envStr(env, name, def) {
  const v = env && env[name] != null ? String(env[name]).trim() : "";
  return v !== "" ? v : def;
}
function envInt(env, name, def, min, max) {
  const raw = parseInt(envStr(env, name, ""), 10);
  if (!Number.isFinite(raw)) return def;
  if (min != null && raw < min) return min;
  if (max != null && raw > max) return max;
  return raw;
}
function envBool(env, name, def) {
  const raw = envStr(env, name, "").toLowerCase();
  if (raw === "") return def;
  return !["0", "false", "no", "off", "disabled"].includes(raw);
}
function clientVersion(env) {
  return envStr(env, "ANTIGRAVITY_CLIENT_VERSION", CLIENT_VERSION);
}
function userAgentFor(env) {
  return `antigravity/ide/${clientVersion(env)} ${envStr(env, "ANTIGRAVITY_PLATFORM", DEFAULT_PLATFORM)}`;
}

// ------------------------------ HTTP helpers -------------------------------
function corsHeaders(request, env) {
  // API dùng API Key nên mặc định mở "*". Nếu bạn đặt CORS_ORIGINS (danh sách
  // phân tách bằng dấu phẩy) thì chỉ các origin đó được phép — cần thiết khi
  // gọi kèm cookie phiên từ trình duyệt.
  const allowList = envStr(env, "CORS_ORIGINS", "");
  const origin = request ? request.headers.get("Origin") || "" : "";
  let allowOrigin = "*";
  if (allowList) {
    const list = allowList.split(",").map((s) => s.trim()).filter(Boolean);
    allowOrigin = list.includes(origin) ? origin : list[0] || "null";
  } else if (origin && request) {
    try {
      if (new URL(request.url).origin === origin) allowOrigin = origin;
    } catch (_) { /* ignore */ }
  }
  const headers = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-API-Key, X-Request-Id, Anthropic-Version, Anthropic-Beta, Anthropic-Dangerous-Direct-Browser-Access, OpenAI-Beta, X-Stainless-Lang",
    "Access-Control-Expose-Headers":
      "x-gateway-version, x-gateway-model, x-gateway-requested-model, x-gateway-account, x-gateway-attempts, x-gateway-downgraded, x-request-id, retry-after",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
  if (allowOrigin !== "*") headers["Access-Control-Allow-Credentials"] = "true";
  return headers;
}
function handleCors(request, env) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
function jsonResponse(data, status, request, env, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request, env),
      ...(extraHeaders || {})
    }
  });
}
function textResponse(text, status, request, env, extraHeaders) {
  return new Response(text, {
    status: status || 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...corsHeaders(request, env),
      ...(extraHeaders || {})
    }
  });
}
function htmlResponse(html, request, env, status) {
  return new Response(html, {
    status: status || 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...corsHeaders(request, env)
    }
  });
}

// Lỗi theo định dạng OpenAI
function openAiError(message, status, type, code, request, env, extraHeaders) {
  return jsonResponse({
    error: { message, type: type || "invalid_request_error", code: code != null ? code : status || 400, param: null }
  }, status || 400, request, env, extraHeaders);
}
function unauthorizedResponse(request, env) {
  return openAiError(
    "Truy cập bị từ chối! API Key không chính xác hoặc bị thiếu. Vui lòng cung cấp khóa bí mật qua header 'Authorization: Bearer <API_KEY>'.",
    401, "invalid_request_error", "invalid_api_key", request, env
  );
}
// Lỗi theo định dạng Anthropic (cho /v1/messages)
function anthropicError(message, status, type, request, env, extraHeaders) {
  return jsonResponse({
    type: "error",
    error: { type: type || "invalid_request_error", message }
  }, status || 400, request, env, extraHeaders);
}

// ------------------------------ ID / mã hoá ---------------------------------
function newId(prefix) {
  const uuid = (globalThis.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix || ""}${uuid}`;
}
function bytesToHex(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}
async function sha256Hex(text) {
  const data = new TextEncoder().encode(String(text));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(digest);
}
async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(String(secret)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(String(message)));
  return bytesToHex(sig);
}
// So sánh hằng thời gian: chuỗi bằng nhau thì tốn cùng số phép toán bất kể vị
// trí sai khác đầu tiên (chống dò key qua timing).
function timingSafeEqualStrings(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length === 0 || b.length === 0) return a === b;
  const maxLen = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    diff |= (a.charCodeAt(i % a.length) || 0) ^ (b.charCodeAt(i % b.length) || 0);
  }
  return diff === 0;
}
function decodeJwtPayload(jwt) {
  if (!jwt || typeof jwt !== "string") return null;
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // atob của V8 vốn chấp nhận base64url thiếu padding, nhưng cứ thêm cho chắc
    // (và để tương thích với runtime thắt chặt hơn / token không chuẩn).
    while (b64.length % 4 !== 0) b64 += "=";
    const json = atob(b64);
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}
function decodeJwtEmail(jwt) {
  const payload = decodeJwtPayload(jwt);
  if (!payload) return null;
  return payload.email || payload.sub || null;
}
function maskKey(key) {
  if (!key) return "••••••••";
  if (key.length <= 12) return key.slice(0, 4) + "••••" + key.slice(-2);
  return key.slice(0, 9) + "••••••••••••••••" + key.slice(-4);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function nowSec() {
  return Math.floor(Date.now() / 1000);
}
// Lấy IP client (Cloudflare luôn set CF-Connecting-IP).
function clientIp(request) {
  return (request.headers.get("CF-Connecting-IP")
    || (request.headers.get("X-Forwarded-For") || "").split(",")[0].trim()
    || "unknown");
}
// Đọc JSON body có giới hạn kích thước để tránh payload rác làm chết Worker.
async function readJsonBody(request, maxBytes) {
  const limit = maxBytes || 26214400; // 25 MB (ảnh base64 rất nặng)
  const declared = parseInt(request.headers.get("Content-Length") || "0", 10);
  if (Number.isFinite(declared) && declared > limit) {
    const err = new Error(`Body quá lớn (${declared} bytes > ${limit}).`);
    err.status = 413;
    throw err;
  }
  const raw = await request.text();
  if (raw.length > limit) {
    const err = new Error(`Body quá lớn (${raw.length} > ${limit}).`);
    err.status = 413;
    throw err;
  }
  if (!raw.trim()) return null;
  return JSON.parse(raw);
}
function upstreamHeaders(env, accessToken, extra) {
  return {
    "Authorization": `Bearer ${accessToken}`,
    "User-Agent": userAgentFor(env),
    "X-Client-Name": CONFIG.clientName,
    "X-Client-Version": clientVersion(env),
    "Content-Type": "application/json",
    ...(extra || {})
  };
}
function timeoutSignal(ms) {
  try {
    if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) return AbortSignal.timeout(ms);
  } catch (_) { /* ignore */ }
  return undefined;
}
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timeout ${ms}ms: ${label || "operation"}`)), ms);
    })
  ]);
}

// ------------------------------ Ước lượng token ------------------------------
// Tiếng Việt / CJK "đắt" hơn tiếng Anh rất nhiều: 1 ký tự tiếng Việt ≈ 0.5-0.7
// token, trong khi tiếng Anh ≈ 0.25 token/ký tự. Bản cũ chia cứng cho 3.5 nên
// hạ thấp số token thật => cắt ngữ cảnh muộn và vượt limit upstream.
var TOKEN_SAMPLE_LIMIT = 4000;
function estimateTokensForText(text) {
  if (!text) return 0;
  const s = String(text);
  const len = s.length;
  if (len === 0) return 0;
  if (len <= TOKEN_SAMPLE_LIMIT) {
    let ascii = 0, wide = 0;
    for (let i = 0; i < len; i++) {
      if (s.charCodeAt(i) < 128) ascii++; else wide++;
    }
    return Math.ceil(ascii / 3.8 + wide / 1.6) + 1;
  }
  // Chuỗi dài: lấy mẫu cách đều thay vì quét từng ký tự. Vòng lặp từng ký tự trên
  // một prompt 100k ký tự tốn vài ms CPU — mà Workers Free chỉ có 10ms CPU/request
  // (vượt là Error 1102), nên đây là tối ưu bắt buộc để chạy ổn định ở gói Free.
  const step = Math.ceil(len / TOKEN_SAMPLE_LIMIT);
  let ascii = 0, wide = 0, sampled = 0;
  for (let i = 0; i < len; i += step) {
    if (s.charCodeAt(i) < 128) ascii++; else wide++;
    sampled++;
  }
  const asciiRatio = ascii / sampled;
  const wideRatio = wide / sampled;
  return Math.ceil(len * (asciiRatio / 3.8 + wideRatio / 1.6)) + 1;
}
function estimateMessageTokens(msg) {
  if (!msg) return 0;
  let tokens = 4; // khung message
  if (typeof msg.content === "string") {
    tokens += estimateTokensForText(msg.content);
  } else if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (typeof part === "string") {
        tokens += estimateTokensForText(part);
      } else if (part && typeof part === "object") {
        if (part.text) tokens += estimateTokensForText(part.text);
        if (part.image_url || part.type === "image_url" || part.type === "image" || part.inlineData || part.inline_data) tokens += 1100;
        if (part.input_audio || part.audio_url || part.type === "input_audio") tokens += 600;
        if (part.video_url || part.type === "video_url") tokens += 1800;
        if (part.type === "document" || part.source?.media_type === "application/pdf") tokens += 1600;
        if (part.type === "thinking") tokens += estimateTokensForText(part.thinking || "");
        if (part.type === "tool_result") tokens += estimateToolResultTokens(part);
      }
    }
  } else if (msg.content && typeof msg.content === "object") {
    try {
      tokens += estimateTokensForText(JSON.stringify(msg.content));
    } catch (_) {
      tokens += 50;
    }
  }
  if (Array.isArray(msg.tool_calls)) {
    for (const tc of msg.tool_calls) {
      tokens += 12;
      if (tc.function?.arguments) tokens += estimateTokensForText(String(tc.function.arguments));
    }
  }
  // Tin nhắn kiểu Anthropic: content là mảng block
  if (Array.isArray(msg.content)) {
    for (const block of msg.content) {
      if (block && block.type === "tool_use") {
        tokens += 12 + estimateTokensForText(JSON.stringify(block.input || {}));
      }
    }
  }
  return tokens;
}
function estimateToolResultTokens(part) {
  const c = part.content;
  if (typeof c === "string") return estimateTokensForText(c);
  if (Array.isArray(c)) {
    let t = 0;
    for (const x of c) {
      if (typeof x === "string") t += estimateTokensForText(x);
      else if (x && x.type === "text") t += estimateTokensForText(x.text || "");
      else if (x && (x.type === "image" || x.type === "image_url")) t += 1100;
    }
    return t;
  }
  return 20;
}
// Đếm token cho 1 request theo định dạng bất kỳ (dùng cho count_tokens).
function estimateRequestTokens(messages, system, tools) {
  let total = 0;
  if (system) {
    if (typeof system === "string") total += estimateTokensForText(system);
    else if (Array.isArray(system)) {
      for (const b of system) total += estimateTokensForText(typeof b === "string" ? b : b?.text || "");
    }
  }
  for (const m of messages || []) total += estimateMessageTokens(m);
  if (Array.isArray(tools) && tools.length) {
    try {
      total += Math.ceil(estimateTokensForText(JSON.stringify(tools)) * 0.9);
    } catch (_) { /* ignore */ }
  }
  return Math.max(total, 1);
}

// ------------------------------ Định dạng hiển thị ---------------------------
function formatCountdown(ms) {
  if (typeof ms !== "number" || ms <= 0 || ms === Infinity || Number.isNaN(ms)) {
    return "Đầy (100%)";
  }
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${totalSec}s`;
}
function formatDateTime(value) {
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
  } catch (_) {
    return "";
  }
}

// ------------------------------ Thống kê & log ------------------------------
var stats = {
  startedAt: Date.now(),
  requests: 0,
  ok: 0,
  errors: 0,
  clientErrors: 0,
  failovers: 0,
  upstreamErrors: 0,
  quotaHits: 0,
  cooldowns: 0,
  promptTokens: 0,
  completionTokens: 0,
  latencyMs: 0,
  byEndpoint: {},
  byModel: {},
  byAccount: {}
};
var requestLog = [];
function bumpCounter(map, key, by) {
  map[key] = (map[key] || 0) + (by || 1);
}
function recordStat(patch) {
  try {
    if (!patch) return;
    stats.requests++;
    if (patch.status >= 200 && patch.status < 300) stats.ok++;
    else if (patch.status >= 500) stats.errors++;
    else if (patch.status >= 400) stats.clientErrors++;
    if (patch.latencyMs) stats.latencyMs += patch.latencyMs;
    if (patch.promptTokens) stats.promptTokens += patch.promptTokens;
    if (patch.completionTokens) stats.completionTokens += patch.completionTokens;
    if (patch.endpoint) bumpCounter(stats.byEndpoint, patch.endpoint);
    if (patch.model) bumpCounter(stats.byModel, patch.model);
    if (patch.account) bumpCounter(stats.byAccount, patch.account);
    if (patch.failovers) stats.failovers += patch.failovers;
    if (patch.upstreamError) stats.upstreamErrors++;
    if (patch.quotaHit) stats.quotaHits++;
    if (patch.cooldown) stats.cooldowns++;
  } catch (_) { /* không để thống kê làm hỏng request */ }
}
function logEvent(env, entry) {
  try {
    const size = envInt(env, "LOG_BUFFER_SIZE", 120, 10, 500);
    const row = { t: Date.now(), ...entry };
    requestLog.push(row);
    if (requestLog.length > size) requestLog.splice(0, requestLog.length - size);
    if (entry && entry.level === "error") {
      memoryCache.lastUpstreamError = { at: row.t, message: entry.message || entry.error || "", path: entry.path || "" };
    }
  } catch (_) { /* ignore */ }
  // Cloudflare log vẫn giữ để `wrangler tail` xem được.
  if (entry && entry.level === "error") console.error("[Gateway]", JSON.stringify(entry));
  else if (entry && entry.level === "warn") console.warn("[Gateway]", JSON.stringify(entry));
  else console.log("[Gateway]", JSON.stringify(entry));
}
function statsSnapshot() {
  const avgLatency = stats.requests > 0 ? Math.round(stats.latencyMs / stats.requests) : 0;
  return {
    startedAt: stats.startedAt,
    uptimeSec: Math.floor((Date.now() - stats.startedAt) / 1000),
    requests: stats.requests,
    ok: stats.ok,
    errors: stats.errors,
    clientErrors: stats.clientErrors,
    failovers: stats.failovers,
    upstreamErrors: stats.upstreamErrors,
    quotaHits: stats.quotaHits,
    cooldowns: stats.cooldowns,
    promptTokens: stats.promptTokens,
    completionTokens: stats.completionTokens,
    avgLatencyMs: avgLatency,
    byEndpoint: { ...stats.byEndpoint },
    byModel: { ...stats.byModel },
    byAccount: { ...stats.byAccount },
    isolated: true
  };
}
// Gộp số liệu của isolate hiện tại vào KV (để dashboard thấy số liệu tổng hợp
// nhiều isolate). KV giới hạn 1000 write/ngày nên mặc định chỉ ghi mỗi 5 phút.
function maybeFlushStats(env, ctx) {
  try {
    if (!env || !env.ANTIGRAVITY_KV) return;
    if (!envBool(env, "ENABLE_STATS", true)) return;
    const flushMs = envInt(env, "STATS_FLUSH_MS", 300000, 60000, 3600000);
    const now = Date.now();
    if (now - (memoryCache.statsFlushedAt || 0) < flushMs) return;
    memoryCache.statsFlushedAt = now;
    const job = (async () => {
      try {
        const prev = await env.ANTIGRAVITY_KV.get("stats:agg", { type: "json" }).catch(() => null) || {};
        const cur = statsSnapshot();
        const merged = {
          version: GATEWAY_VERSION,
          updatedAt: now,
          isolateSince: prev.isolateSince || cur.startedAt,
          requests: (prev.requests || 0) + cur.requests,
          ok: (prev.ok || 0) + cur.ok,
          errors: (prev.errors || 0) + cur.errors,
          failovers: (prev.failovers || 0) + cur.failovers,
          upstreamErrors: (prev.upstreamErrors || 0) + cur.upstreamErrors,
          quotaHits: (prev.quotaHits || 0) + cur.quotaHits,
          promptTokens: (prev.promptTokens || 0) + cur.promptTokens,
          completionTokens: (prev.completionTokens || 0) + cur.completionTokens
        };
        await safeKvPut(env.ANTIGRAVITY_KV, "stats:agg", JSON.stringify(merged));
      } catch (_) { /* ignore */ }
    })();
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(job);
  } catch (_) { /* ignore */ }
}

/* ======================== 20-auth.js ======================== */
/* ============================================================================
 *  PHẦN 3/12 — Xác thực: API Key, session cookie ký HMAC, chống brute-force
 * ============================================================================
 */

async function getAllowedApiKeys(env) {
  // Key vừa xoay qua /api/key/update thắng trong 5 phút (env.API_KEY là binding
  // do operator quản lý, Worker không xoá được, nên ưu tiên bản KV vừa ghi).
  if (memoryCache.allowedKeysOverride && Date.now() - (memoryCache.allowedKeysOverrideAt || 0) < 300000) {
    return memoryCache.allowedKeysOverride.slice();
  }
  const keys = [];
  // Hỗ trợ nhiều key: API_KEYS="k1,k2" hoặc API_KEY="k1,k2".
  const pushKeys = (raw) => {
    String(raw || "").split(",").map((s) => s.trim()).filter(Boolean).forEach((k) => {
      if (!keys.includes(k)) keys.push(k);
    });
  };
  pushKeys(env.API_KEYS);
  pushKeys(env.API_KEY);

  const now = Date.now();
  if (memoryCache.cachedApiKey && now - memoryCache.apiKeyLoadedAt < 30000) {
    if (!keys.includes(memoryCache.cachedApiKey)) keys.push(memoryCache.cachedApiKey);
  } else if (env.ANTIGRAVITY_KV) {
    try {
      const customKey = await env.ANTIGRAVITY_KV.get("custom_api_key");
      if (customKey && customKey.trim()) {
        const trimmed = customKey.trim();
        memoryCache.cachedApiKey = trimmed;
        memoryCache.apiKeyLoadedAt = now;
        if (!keys.includes(trimmed)) keys.push(trimmed);
      }
    } catch (_) { /* KV lỗi => chỉ dùng env key */ }
  }
  return keys;
}

async function getRequiredApiKey(env) {
  const keys = await getAllowedApiKeys(env);
  return keys[0] || "";
}

// ------------------------------ Session cookie ------------------------------
// Bản cũ nhét nguyên API Key vào cookie (gateway_key). Bản mới chỉ lưu chữ ký
// HMAC(key, "v1.<exp>.<nonce>") — cookie KHÔNG chứa key, không thể dùng lại để
// gọi API nếu bị đánh cắp qua XSS/log, và tự vô hiệu khi xoay key.
var SESSION_COOKIE = "ag_session";

async function buildSessionCookie(apiKey) {
  const exp = nowSec() + SESSION_TTL_SEC;
  const rnd = new Uint8Array(12);
  crypto.getRandomValues(rnd);
  const nonce = bytesToHex(rnd);
  const msg = `v1.${exp}.${nonce}`;
  const sig = await hmacSha256Hex(apiKey, msg);
  return {
    value: `${msg}.${sig}`,
    header: `${SESSION_COOKIE}=${msg}.${sig}; Path=/; Max-Age=${SESSION_TTL_SEC}; SameSite=Strict; HttpOnly; Secure`
  };
}
function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict; HttpOnly; Secure`;
}
// Xoá CẢ cookie phiên mới lẫn cookie cũ (gateway_key) — nếu chỉ xoá 1 cái thì
// cookie cũ còn sót lại vẫn được authenticate() chấp nhận, logout không có tác dụng.
function authCookieHeaders(sessionHeader) {
  const headers = new Headers();
  if (sessionHeader) headers.append("Set-Cookie", sessionHeader);
  headers.append("Set-Cookie", clearSessionCookieHeader());
  headers.append("Set-Cookie", "gateway_key=; Path=/; Max-Age=0; SameSite=Strict; HttpOnly; Secure");
  return headers;
}
function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
// Xác thực cookie phiên: chữ ký phải khớp với MỘT trong các key đang hoạt động
// => xoay key là mọi session cũ tự hết hiệu lực.
async function verifySessionCookie(cookieValue, allowedKeys) {
  if (!cookieValue || typeof cookieValue !== "string") return false;
  const parts = cookieValue.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const exp = parseInt(parts[1], 10);
  const nonce = parts[2];
  const sig = parts[3];
  if (!Number.isFinite(exp) || exp < nowSec()) return false;
  if (!/^[0-9a-f]{8,64}$/i.test(nonce) || !/^[0-9a-f]{8,128}$/i.test(sig)) return false;

  const cacheKey = `${parts[3]}`;
  const cached = memoryCache.sessions.get(cacheKey);
  if (cached && cached.exp === exp && Date.now() - cached.at < SESSION_CACHE_MS) {
    return cached.ok;
  }
  const msg = `v1.${exp}.${nonce}`;
  let ok = false;
  for (const key of allowedKeys) {
    const expect = await hmacSha256Hex(key, msg);
    if (timingSafeEqualStrings(expect, sig)) { ok = true; break; }
  }
  memoryCache.sessions.set(cacheKey, { ok, exp, at: Date.now() });
  if (memoryCache.sessions.size > 512) {
    const firstKey = memoryCache.sessions.keys().next().value;
    if (firstKey) memoryCache.sessions.delete(firstKey);
  }
  return ok;
}

// ------------------------------ Rate limit ----------------------------------
function checkWindowLimit(map, bucketKey, max, windowMs) {
  const now = Date.now();
  const rec = map.get(bucketKey);
  if (!rec || now - rec.windowStart > windowMs) {
    map.set(bucketKey, { windowStart: now, count: 1 });
    if (map.size > 2048) {
      for (const [k, v] of map) if (now - v.windowStart > windowMs) map.delete(k);
    }
    return { allowed: true, remaining: max - 1 };
  }
  rec.count++;
  if (rec.count > max) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((rec.windowStart + windowMs - now) / 1000)) };
  }
  return { allowed: true, remaining: max - rec.count };
}
function rateLimitAuth(key) {
  const rec = memoryCache.authFailures.get(key);
  const now = Date.now();
  if (!rec || now - rec.first > AUTH_FAILURE_WINDOW_MS) return true;
  return rec.count < AUTH_MAX_FAILURES;
}
function rateLimitIp(ip) {
  const rec = memoryCache.ipFailures.get(ip);
  const now = Date.now();
  if (!rec || now - rec.first > IP_FAILURE_WINDOW_MS) return true;
  return rec.count < IP_MAX_FAILURES;
}
function recordAuthFailure(key, ip) {
  const now = Date.now();
  const rec = memoryCache.authFailures.get(key);
  if (!rec || now - rec.first > AUTH_FAILURE_WINDOW_MS) {
    memoryCache.authFailures.set(key, { first: now, count: 1 });
  } else {
    rec.count++;
  }
  if (memoryCache.authFailures.size > 512) {
    for (const [k, v] of memoryCache.authFailures) if (now - v.first > AUTH_FAILURE_WINDOW_MS) memoryCache.authFailures.delete(k);
  }
  if (ip) {
    const irec = memoryCache.ipFailures.get(ip);
    if (!irec || now - irec.first > IP_FAILURE_WINDOW_MS) memoryCache.ipFailures.set(ip, { first: now, count: 1 });
    else irec.count++;
  }
}
// Giới hạn số request/phút cho TOÀN BỘ API (mặc định tắt — bật bằng RATE_LIMIT_RPM).
function checkApiRateLimit(env, presentedKey) {
  const rpm = envInt(env, "RATE_LIMIT_RPM", 0, 0, 100000);
  if (!rpm) return { allowed: true };
  return checkWindowLimit(memoryCache.rateBuckets, presentedKey || "anon", rpm, RATE_LIMIT_WINDOW_MS);
}

// ------------------------------ Xác thực request -----------------------------
// Trả về null nếu không hợp lệ, hoặc { key, method } khi hợp lệ.
async function authenticate(request, env) {
  const allowedKeys = await getAllowedApiKeys(env);
  // Fail CLOSED: chưa cấu hình key => từ chối hết (tránh pool thành public API).
  if (allowedKeys.length === 0) {
    console.error("[Auth] Chưa cấu hình API Key nào (env.API_KEY / env.API_KEYS / KV custom_api_key). Từ chối truy cập.");
    return null;
  }
  const authHeader = request.headers.get("Authorization") || "";
  const bearerKey = authHeader.replace(/^Bearer\s+/i, "").trim();
  const xApiKey = (request.headers.get("X-API-Key") || "").trim();
  const presentedKey = bearerKey || xApiKey;
  const ip = clientIp(request);

  if (presentedKey) {
    if (!rateLimitAuth(presentedKey) || !rateLimitIp(ip)) return null;
    const matched = allowedKeys.find((k) => timingSafeEqualStrings(k, presentedKey));
    if (!matched) {
      recordAuthFailure(presentedKey, ip);
      return null;
    }
    return { key: presentedKey, method: bearerKey ? "bearer" : "x-api-key" };
  }

  // Không có header: thử session cookie (chỉ dành cho dashboard/trình duyệt).
  const cookieValue = getCookie(request, SESSION_COOKIE);
  if (cookieValue) {
    if (!rateLimitIp(ip)) return null;
    const ok = await verifySessionCookie(cookieValue, allowedKeys);
    if (ok) return { key: "", method: "session" };
    recordAuthFailure("session:" + (cookieValue.split(".")[3] || "x").slice(0, 16), ip);
    return null;
  }

  // Tương thích ngược: cookie cũ (gateway_key) chứa thẳng API Key.
  const legacyCookie = (getCookie(request, "gateway_key") || "").trim();
  if (legacyCookie) {
    const matched = allowedKeys.find((k) => timingSafeEqualStrings(k, legacyCookie));
    if (matched) return { key: matched, method: "legacy-cookie" };
  }
  return null;
}
// Kiểm tra CSRF cho các request ghi dữ liệu xác thực bằng cookie (browser).
function isCsrfSafe(request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  const origin = request.headers.get("Origin");
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  // Một số runtime (Node/undici, test harness) không expose header Host -> lấy từ URL.
  let host = request.headers.get("Host") || "";
  if (!host) {
    try { host = new URL(request.url).host; } catch (_) { host = ""; }
  }
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;
  if (!origin) return true; // CLI/SDK không gửi Origin
  try {
    return new URL(origin).host === host;
  } catch (_) {
    return false;
  }
}
function resetAuthState() {
  memoryCache.authFailures.clear();
  memoryCache.ipFailures.clear();
  memoryCache.sessions.clear();
}

/* ======================== 30-storage.js ======================== */
/* ============================================================================
 *  PHẦN 4/12 — Lưu trữ KV: tài khoản, cooldown, token, quota
 * ============================================================================
 *  Bản cũ lưu CẢ pool trong 1 key `accounts` => mọi thao tác là read-modify-write
 *  và hai isolate ghi song song sẽ ghi đè nhau (cooldown bị mất, token mới bị
 *  ghi đè bằng token cũ, tài khoản vừa thêm bị xoá...).
 *  Bản mới: mỗi tài khoản 1 key `acct:<id>` + key chỉ mục `accounts:index`.
 *  Ghi cooldown / refresh token chỉ chạm đúng bản ghi của nó.
 * ============================================================================
 */

var KV_ACCOUNTS_INDEX = "accounts:index";
var KV_LEGACY_ACCOUNTS = "accounts";

async function safeKvPut(kv, key, value, options) {
  if (!kv || !key || value === undefined) return false;
  try {
    if (options) await kv.put(key, value, options);
    else await kv.put(key, value);
    return true;
  } catch (err) {
    console.warn(`[KV Warning] Bỏ qua lỗi ghi KV '${key}' (có thể do chạm quota 1000 write/ngày):`, err?.message);
    return false;
  }
}

// Khoá ghi theo từng tài khoản: tránh 2 luồng trong cùng isolate ghi đè nhau.
async function withAccountLock(accountId, fn) {
  const prev = memoryCache.accountLocks.get(accountId) || Promise.resolve();
  const run = prev.then(fn, fn);
  const guard = run.catch(() => {});
  memoryCache.accountLocks.set(accountId, guard);
  try {
    return await run;
  } finally {
    if (memoryCache.accountLocks.get(accountId) === guard) memoryCache.accountLocks.delete(accountId);
  }
}

function sanitizeAccountRecord(acc) {
  if (!acc || typeof acc !== "object") return null;
  const id = String(acc.id || "").trim();
  if (!id) return null;
  const out = {
    id,
    email: String(acc.email || id),
    projectId: acc.projectId || "aicode-consumers",
    createdAt: acc.createdAt || Date.now()
  };
  if (acc.accessToken) out.accessToken = acc.accessToken;
  if (acc.refreshToken) out.refreshToken = acc.refreshToken;
  if (Number.isFinite(acc.expiresAt)) out.expiresAt = acc.expiresAt;
  if (acc.isRateLimited) out.isRateLimited = true;
  if (Number.isFinite(acc.rateLimitExpiresAt)) out.rateLimitExpiresAt = acc.rateLimitExpiresAt;
  if (acc.cooldownReason) out.cooldownReason = acc.cooldownReason;
  if (acc.disabled) out.disabled = true;
  if (acc.note) out.note = String(acc.note).slice(0, 200);
  if (Number.isFinite(acc.updatedAt)) out.updatedAt = acc.updatedAt;
  return out;
}

async function readAccountRecord(env, id) {
  if (!env.ANTIGRAVITY_KV) return null;
  const rec = await env.ANTIGRAVITY_KV.get(`acct:${id}`, { type: "json" }).catch(() => null);
  return sanitizeAccountRecord(rec);
}
async function writeAccountRecord(env, account) {
  const record = sanitizeAccountRecord(account);
  if (!record) return false;
  const ok = await safeKvPut(env.ANTIGRAVITY_KV, `acct:${record.id}`, JSON.stringify(record));
  return ok;
}
async function writeAccountsIndex(env, accounts) {
  const index = (accounts || []).map((a) => ({ id: a.id, email: a.email, createdAt: a.createdAt || 0 }));
  const ok = await safeKvPut(env.ANTIGRAVITY_KV, KV_ACCOUNTS_INDEX, JSON.stringify(index));
  return ok;
}

// Di trú dữ liệu từ key `accounts` (định dạng cũ) sang bản ghi riêng từng acc.
async function migrateLegacyAccounts(env, legacy) {
  if (!env.ANTIGRAVITY_KV || !Array.isArray(legacy) || legacy.length === 0) return [];
  const out = [];
  for (const raw of legacy) {
    const acc = sanitizeAccountRecord(raw && raw.id ? raw : {
      id: raw?.id || `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email: raw?.email || decodeJwtEmail(raw?.idToken) || "Primary Account",
      projectId: raw?.projectId || "aicode-consumers",
      accessToken: raw?.accessToken,
      refreshToken: raw?.refreshToken,
      expiresAt: raw?.expiresAt || 0,
      createdAt: raw?.createdAt || Date.now(),
      isRateLimited: raw?.isRateLimited,
      rateLimitExpiresAt: raw?.rateLimitExpiresAt
    });
    if (!acc) continue;
    out.push(acc);
    await writeAccountRecord(env, acc);
  }
  if (out.length) {
    await writeAccountsIndex(env, out);
    await safeKvPut(env.ANTIGRAVITY_KV, "accounts:legacy_backup", JSON.stringify({ at: Date.now(), count: out.length, items: legacy }));
    console.log(`[Migration] Đã chuyển ${out.length} tài khoản sang định dạng acct:<id>.`);
  }
  return out;
}

async function getAccountsList(env, force) {
  const now = Date.now();
  if (!force && memoryCache.accounts && now - memoryCache.accountsLoadedAt < ACCOUNTS_CACHE_MS) {
    return memoryCache.accounts;
  }
  let accounts = [];
  if (env.ANTIGRAVITY_KV) {
    let index = await env.ANTIGRAVITY_KV.get(KV_ACCOUNTS_INDEX, { type: "json" }).catch(() => null);
    if (!Array.isArray(index)) {
      // Chưa có chỉ mục mới -> thử di trú từ dữ liệu cũ.
      const legacy = await env.ANTIGRAVITY_KV.get(KV_LEGACY_ACCOUNTS, { type: "json" }).catch(() => null);
      if (Array.isArray(legacy) && legacy.length > 0) {
        accounts = await migrateLegacyAccounts(env, legacy);
        index = accounts.map((a) => ({ id: a.id, email: a.email, createdAt: a.createdAt }));
      } else {
        const oldCreds = await env.ANTIGRAVITY_KV.get("credentials", { type: "json" }).catch(() => null);
        if (oldCreds && oldCreds.refreshToken) {
          const email = decodeJwtEmail(oldCreds.idToken) || oldCreds.email || "Primary Account";
          accounts = [sanitizeAccountRecord({
            id: "acc_default",
            email,
            projectId: oldCreds.projectId || "aicode-consumers",
            accessToken: oldCreds.accessToken,
            refreshToken: oldCreds.refreshToken,
            expiresAt: oldCreds.expiresAt || 0,
            createdAt: Date.now()
          })];
          await writeAccountRecord(env, accounts[0]);
          await writeAccountsIndex(env, accounts);
        } else {
          accounts = [];
        }
      }
    } else {
      const records = await Promise.all(index.map((entry) => readAccountRecord(env, entry?.id).catch(() => null)));
      accounts = records.filter(Boolean);
      // Bản ghi hỏng/biến mất: đồng bộ lại chỉ mục cho khớp thực tế.
      const validIds = new Set(accounts.map((a) => a.id));
      if (accounts.length !== index.length) {
        const pruned = index.filter((e) => validIds.has(e?.id));
        if (pruned.length !== index.length) {
          await writeAccountsIndex(env, pruned.map((e) => ({ id: e.id, email: e.email, createdAt: e.createdAt })));
        }
      }
    }
  }
  accounts.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  memoryCache.accounts = accounts;
  memoryCache.accountsLoadedAt = Date.now();
  return accounts;
}
function invalidateAccountsCache() {
  memoryCache.accountsLoadedAt = 0;
}

// Ghi bản ghi tài khoản + cập nhật chỉ mục nếu là tài khoản mới.
async function saveAccount(env, account) {
  const record = sanitizeAccountRecord(account);
  if (!record) throw new Error("Bản ghi tài khoản không hợp lệ.");
  account.updatedAt = Date.now();
  record.updatedAt = account.updatedAt;
  const ok = await writeAccountRecord(env, record);
  if (!ok) throw new Error("Ghi KV thất bại: tài khoản chưa được lưu.");
  const list = await getAccountsList(env).catch(() => []);
  if (!list.some((a) => a.id === record.id)) {
    list.push(account);
    await writeAccountsIndex(env, list);
  }
  return true;
}
// Cập nhật 1 phần bản ghi (đọc lại từ KV trước khi ghi để không mất dữ liệu do
// isolate khác vừa ghi) — dùng cho cooldown / token.
async function patchAccount(env, account, patch) {
  return withAccountLock(account.id, async () => {
    const disk = (await readAccountRecord(env, account.id)) || sanitizeAccountRecord(account);
    if (!disk) return false;
    const merged = { ...disk, ...patch, updatedAt: Date.now() };
    const ok = await writeAccountRecord(env, merged);
    if (ok) {
      Object.assign(account, merged);
      account.updatedAt = merged.updatedAt;
    }
    return ok;
  });
}
async function removeAccount(env, id) {
  if (!env.ANTIGRAVITY_KV) throw new Error("Chưa cấu hình ANTIGRAVITY_KV!");
  await env.ANTIGRAVITY_KV.delete(`acct:${id}`);
  const list = (await getAccountsList(env)).filter((a) => a.id !== id);
  await writeAccountsIndex(env, list);
  memoryCache.accounts = list;
  memoryCache.usageCache.delete(id);
  memoryCache.usageApiCache.delete(id);
  return list;
}

// ------------------------------ Cooldown ------------------------------------
// Cooldown lưu trong KV (sống sót qua isolate bị thu hồi) + trong RAM để đọc nhanh.
async function markAccountCooldown(env, account, ms, reason) {
  const now = Date.now();
  const until = now + ms;
  const cached = memoryCache.usageCache.get(account.id) || {};
  memoryCache.usageCache.set(account.id, {
    ...cached,
    isRateLimited: true,
    rateLimitExpiresAt: until,
    cooldownReason: reason || cached.cooldownReason || "rate_limit"
  });
  account.isRateLimited = true;
  account.rateLimitExpiresAt = until;
  account.cooldownReason = reason || "rate_limit";
  if (!env?.ANTIGRAVITY_KV) return true;
  const ok = await patchAccount(env, account, {
    isRateLimited: true,
    rateLimitExpiresAt: until,
    cooldownReason: reason || "rate_limit"
  }).catch(() => false);
  if (!ok) console.warn(`[KV Warning] Không ghi được cooldown cho ${account.email} (RAM vẫn áp dụng).`);
  return ok;
}
async function clearAccountCooldown(env, account) {
  delete account.isRateLimited;
  delete account.rateLimitExpiresAt;
  delete account.cooldownReason;
  const cached = memoryCache.usageCache.get(account.id) || {};
  memoryCache.usageCache.set(account.id, { ...cached, isRateLimited: false, rateLimitExpiresAt: 0 });
  if (env?.ANTIGRAVITY_KV) {
    await patchAccount(env, account, {
      isRateLimited: false, rateLimitExpiresAt: 0, cooldownReason: ""
    }).catch(() => false);
  }
  return true;
}
function isAccountCoolingDown(account, now) {
  const ts = account?.rateLimitExpiresAt;
  if (!account?.isRateLimited || !ts) return false;
  return ts > (now || Date.now());
}

// ------------------------------ Token OAuth ---------------------------------
async function getValidTokenForAccount(env, account, forceRefresh) {
  const now = Date.now();
  if (!forceRefresh && account.accessToken && now < (account.expiresAt || 0) - 180000) {
    return { accessToken: account.accessToken, projectId: account.projectId || "aicode-consumers" };
  }
  const lockKey = `token_${account.id}`;
  const existing = memoryCache.refreshLocks.get(lockKey);
  if (existing && !forceRefresh) return await existing;

  const promise = (async () => {
    try {
      if (!account.refreshToken) {
        const err = new Error(`Tài khoản ${account.email} không có refresh token — cần liên kết lại tài khoản.`);
        err.code = "no_refresh_token";
        throw err;
      }
      const res = await fetch(CONFIG.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: account.refreshToken,
          client_id: CONFIG.clientId,
          client_secret: CONFIG.clientSecret
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.access_token) {
        const detail = data.error_description || data.error || `HTTP ${res.status}`;
        const err = new Error(`Refresh token lỗi cho ${account.email}: ${detail}`);
        err.status = res.status;
        err.code = data.error || "refresh_failed";
        throw err;
      }
      const expiresIn = Number.isFinite(data.expires_in) ? data.expires_in : 3600;
      account.accessToken = data.access_token;
      account.expiresAt = Date.now() + Math.max(expiresIn - 300, 60) * 1000;
      if (data.refresh_token) account.refreshToken = data.refresh_token;
      // Ghi xuống KV: chỉ chạm bản ghi của tài khoản này (không ghi cả pool).
      await patchAccount(env, account, {
        accessToken: account.accessToken,
        expiresAt: account.expiresAt,
        ...(data.refresh_token ? { refreshToken: data.refresh_token } : {})
      }).catch((err) => {
        console.warn(`[Token] Không lưu được token mới cho ${account.email}:`, err?.message);
        return false;
      });
      return { accessToken: account.accessToken, projectId: account.projectId || "aicode-consumers" };
    } finally {
      memoryCache.refreshLocks.delete(lockKey);
    }
  })();
  memoryCache.refreshLocks.set(lockKey, promise);
  return await promise;
}

// ------------------------------ Quota ---------------------------------------
function classifyBucketWindow(bucket) {
  const window = String(bucket?.window || "").toLowerCase();
  const id = String(bucket?.bucketId || bucket?.id || "").toLowerCase();
  const hay = `${window} ${id}`;
  if (/5h|five|5-hour|5_hour/.test(hay)) return "fiveHour";
  if (/week/.test(hay)) return "weekly";
  if (/day|24h/.test(hay)) return "daily";
  if (/hour|1h/.test(hay)) return "hourly";
  return "other";
}
// Chuẩn hoá dữ liệu quota upstream thành cấu trúc dùng chung cho balancer + UI.
function parseQuotaData(account, data) {
  const result = {
    accountId: account.id,
    email: account.email,
    fetchedAt: Date.now(),
    groups: [],
    gemini: { fiveHour: null, weekly: null },
    claude: { fiveHour: null, weekly: null },
    lowestRemaining: 100,
    nextResetMs: null
  };
  if (Array.isArray(data?.groups)) {
    for (const group of data.groups) {
      const displayName = group.displayName || group.name || "Nhóm không tên";
      const name = displayName.toLowerCase();
      const groupOut = { name: displayName, buckets: [] };
      for (const bucket of group.buckets || []) {
        const remainingFraction = typeof bucket.remainingFraction === "number" ? bucket.remainingFraction : null;
        const remainingPercentage = remainingFraction == null ? null : Math.round(remainingFraction * 1000) / 10;
        const resetTime = bucket.resetTime || "";
        let resetMs = null;
        if (resetTime) {
          const ts = new Date(resetTime).getTime();
          if (!Number.isNaN(ts)) resetMs = Math.max(0, ts - Date.now());
        }
        const b = {
          id: bucket.bucketId || bucket.id || "",
          window: classifyBucketWindow(bucket),
          windowLabel: bucket.window || "",
          resetTime,
          resetMs,
          remainingFraction,
          remainingPercentage,
          description: bucket.description || "",
          used: remainingFraction == null ? null : Math.round((1 - remainingFraction) * 1000) / 10
        };
        groupOut.buckets.push(b);
        if (remainingPercentage != null && remainingPercentage < result.lowestRemaining) {
          result.lowestRemaining = remainingPercentage;
        }
        if (resetMs != null && (result.nextResetMs == null || resetMs < result.nextResetMs)) {
          result.nextResetMs = resetMs;
        }
      }
      result.groups.push(groupOut);

      // Tương thích bản cũ: gemini / claude(+gpt) buckets.
      const isGemini = name.includes("gemini");
      const isClaude = name.includes("claude") || name.includes("gpt");
      if (isGemini || isClaude) {
        const target = isGemini ? result.gemini : result.claude;
        for (const b of groupOut.buckets) {
          if (b.window === "fiveHour") target.fiveHour = b;
          else if (b.window === "weekly") target.weekly = b;
        }
      }
    }
  }
  return result;
}

async function fetchQuotaSummary(env, account) {
  const { accessToken, projectId } = await getValidTokenForAccount(env, account);
  const res = await fetch(CONFIG.quotaSummaryUrl, {
    method: "POST",
    headers: upstreamHeaders(env, accessToken),
    body: JSON.stringify(projectId ? { project: projectId } : {}),
    signal: timeoutSignal(envInt(env, "UPSTREAM_TIMEOUT_MS", 120000, 5000, 600000))
  });
  if (!res.ok) {
    const err = new Error(`Quota upstream trả về HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return await res.json();
}

// Stale-while-revalidate: trả cache ngay, cập nhật nền khi hết hạn.
async function getAccountQuota(env, account, force, ctx) {
  const now = Date.now();
  const cached = memoryCache.usageCache.get(account.id);
  if (!force && cached?.data) {
    if (now >= (cached.expiresAt || 0) && ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(refreshAccountQuotaBackground(env, account));
    }
    return cached.data;
  }
  if (!force) {
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(refreshAccountQuotaBackground(env, account));
    return emptyQuota(account);
  }
  try {
    const data = await fetchQuotaSummary(env, account);
    const result = parseQuotaData(account, data);
    const existing = memoryCache.usageCache.get(account.id) || {};
    memoryCache.usageCache.set(account.id, { ...existing, data: result, expiresAt: now + QUOTA_CACHE_MS, error: null });
    return result;
  } catch (err) {
    const existing = memoryCache.usageCache.get(account.id) || {};
    memoryCache.usageCache.set(account.id, { ...existing, error: err?.message || String(err) });
    return { ...emptyQuota(account), error: err?.message || String(err) };
  }
}
function emptyQuota(account) {
  return {
    accountId: account.id,
    email: account.email,
    groups: [],
    gemini: { fiveHour: null, weekly: null },
    claude: { fiveHour: null, weekly: null },
    lowestRemaining: 100,
    nextResetMs: null
  };
}
async function refreshAccountQuotaBackground(env, account) {
  const lockKey = "quota_" + account.id;
  if (memoryCache.refreshLocks.has(lockKey)) return await memoryCache.refreshLocks.get(lockKey);
  const existing = memoryCache.usageCache.get(account.id) || {};
  // Đánh dấu "đang cập nhật" 30s để không bắn trùng nhiều lần.
  memoryCache.usageCache.set(account.id, { ...existing, expiresAt: Date.now() + 30000 });
  const p = (async () => {
    try {
      const data = await fetchQuotaSummary(env, account);
      const result = parseQuotaData(account, data);
      const current = memoryCache.usageCache.get(account.id) || {};
      memoryCache.usageCache.set(account.id, { ...current, data: result, expiresAt: Date.now() + QUOTA_CACHE_MS, error: null });
      return result;
    } catch (err) {
      const current = memoryCache.usageCache.get(account.id) || {};
      memoryCache.usageCache.set(account.id, { ...current, error: err?.message || String(err) });
      console.warn(`[Quota SWR] Không cập nhật được quota cho ${account.email}:`, err?.message);
      return null;
    } finally {
      memoryCache.refreshLocks.delete(lockKey);
    }
  })();
  memoryCache.refreshLocks.set(lockKey, p);
  return await p;
}

/* ======================== 40-models.js ======================== */
/* ============================================================================
 *  PHẦN 5/12 — Danh mục model: lọc, đồng bộ, bí danh & định tuyến
 * ============================================================================
 */

function modelFilterConfig(env) {
  return {
    excludeRegex: envStr(env, "MODEL_EXCLUDE_REGEX", "lite|extra-low|image|preview|pro-low"),
    includeClaudeGpt: envBool(env, "MODEL_INCLUDE_CLAUDE_GPT", true)
  };
}

function filterLatestModels(models, env) {
  if (!Array.isArray(models) || models.length === 0) return DEFAULT_FALLBACK_MODELS;
  const cfg = modelFilterConfig(env);
  let excludeRe = null;
  try {
    excludeRe = new RegExp(cfg.excludeRegex, "i");
  } catch (_) {
    excludeRe = /lite|extra-low|image|preview|pro-low/i;
  }
  const candidates = models.filter((m) => {
    const id = String(m?.id || "").toLowerCase();
    if (!id) return false;
    if (id.startsWith("tab_") || id.includes("autocomplete")) return false;
    if (id.endsWith("-tiered")) return false;
    if (excludeRe.test(id)) return false;
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
    if (/claude|gpt-oss|gemini-pro-agent/i.test(id)) return cfg.includeClaudeGpt;
    const mFlash = m.id.match(/gemini-(\d+\.?\d*)-flash/i);
    if (mFlash) return parseFloat(mFlash[1]) >= maxFlashVer;
    const mPro = m.id.match(/gemini-(\d+\.?\d*)-pro/i);
    if (mPro) return parseFloat(mPro[1]) >= maxProVer;
    return false;
  }).map((m) => ({ id: m.id, upstream: m.upstream || m.id }));

  // Bí danh tiện dụng cho client đã hard-code tên model.
  if (result.some((m) => m.id === "gemini-3.8-flash-high") && !result.some((m) => m.id === "gemini-3.8-flash")) {
    result.push({ id: "gemini-3.8-flash", upstream: "gemini-3.8-flash-tiered" });
  }
  if (result.some((m) => m.id === "gpt-oss-120b-medium") && !result.some((m) => m.id === "gpt-oss-120b")) {
    result.push({ id: "gpt-oss-120b", upstream: "gpt-oss-120b-medium" });
  }
  const priority = (id) => {
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
  };
  result.sort((a, b) => priority(a.id) - priority(b.id));
  return result.length > 0 ? result : DEFAULT_FALLBACK_MODELS;
}

async function fetchUpstreamModels(env) {
  const accounts = await getAccountsList(env);
  if (accounts.length === 0) {
    memoryCache.modelsLastError = "pool rỗng";
    return null;
  }
  // Thử lần lượt vài tài khoản: tài khoản đầu có thể đang cooldown/quota hết.
  const ordered = getRankedAccounts(env, accounts, "gemini-3.8-flash-high", null);
  const tried = new Set();
  for (const account of ordered.slice(0, 3)) {
    if (tried.has(account.id)) continue;
    tried.add(account.id);
    try {
      const { accessToken, projectId } = await getValidTokenForAccount(env, account);
      const res = await fetch(CONFIG.fetchModelsUrl, {
        method: "POST",
        headers: upstreamHeaders(env, accessToken),
        body: JSON.stringify(projectId ? { project: projectId } : {}),
        signal: timeoutSignal(envInt(env, "UPSTREAM_TIMEOUT_MS", 120000, 5000, 600000))
      });
      if (!res.ok) {
        memoryCache.modelsLastError = `HTTP ${res.status} (${account.email})`;
        continue;
      }
      const data = await res.json();
      const discovered = [];
      if (data.models && typeof data.models === "object") {
        for (const [key, info] of Object.entries(data.models)) {
          if (info && info.isInternal) continue;
          discovered.push({ id: key, upstream: key });
        }
      }
      const modelMap = new Map();
      for (const m of DEFAULT_FALLBACK_MODELS) modelMap.set(m.id, m);
      for (const m of discovered) modelMap.set(m.id, m);
      memoryCache.modelsLastError = null;
      return { merged: Array.from(modelMap.values()), discoveredCount: discovered.length };
    } catch (err) {
      memoryCache.modelsLastError = err?.message || String(err);
    }
  }
  return null;
}

async function refreshModelsCache(env) {
  const fetched = await fetchUpstreamModels(env);
  if (!fetched) return null;
  const now = Date.now();
  const filtered = filterLatestModels(fetched.merged, env);
  const expiresAt = now + MODELS_CACHE_MS;
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
    await safeKvPut(env.ANTIGRAVITY_KV, "cached_models", JSON.stringify({ expiresAt, models: filtered, syncedAt: now }));
    await safeKvPut(env.ANTIGRAVITY_KV, "models:last_sync", JSON.stringify({
      syncedAt: now, count: filtered.length, discovered: fetched.discoveredCount, added, removed
    }));
  }
  if (added.length > 0) console.log(`[Models Sync] Phát hiện model mới: ${added.join(", ")}`);
  if (removed.length > 0) console.warn(`[Models Sync] Model không còn trên upstream: ${removed.join(", ")}`);
  return { models: filtered, added, removed, syncedAt: now };
}

async function getDynamicModels(env, forceRefresh) {
  const now = Date.now();
  if (!forceRefresh && memoryCache.models && now < memoryCache.modelsExpiresAt) return memoryCache.models;
  if (!forceRefresh && env.ANTIGRAVITY_KV) {
    const cached = await env.ANTIGRAVITY_KV.get("cached_models", { type: "json" }).catch(() => null);
    if (cached && now < (cached.expiresAt || 0) && Array.isArray(cached.models)) {
      const filtered = filterLatestModels(cached.models, env);
      memoryCache.models = filtered;
      memoryCache.modelsExpiresAt = cached.expiresAt;
      return filtered;
    }
  }
  const refreshed = await refreshModelsCache(env);
  if (refreshed) return refreshed.models;
  return memoryCache.models || DEFAULT_FALLBACK_MODELS;
}

// ------------------------------ Bí danh & định tuyến -------------------------
function modelAliasTable(env) {
  let extra = {};
  const raw = envStr(env, "MODEL_ALIASES", "");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") extra = parsed;
    } catch (err) {
      console.warn("[Models] env.MODEL_ALIASES không phải JSON hợp lệ, bỏ qua:", err?.message);
    }
  }
  return { ...MODEL_ALIASES, ...extra };
}
function normalizeModelName(name) {
  return String(name || "").toLowerCase().trim()
    .replace(/^(google|antigravity|openai|anthropic|custom|models)\//i, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-latest$/, "")
    .replace(/@.*$/, "");
}
function stripModelSuffix(name) {
  return name.replace(/-(thinking|reasoning|preview|exp|experimental|0[0-9]{3}|20[0-9]{2}-[0-9]{2}-[0-9]{2})$/i, "");
}
// Trả về { requested, upstream, matched, alias }
function resolveModelTarget(requestedModel, modelList, env) {
  const requested = String(requestedModel || "").trim();
  if (!requested) return { requested: "gemini-3.8-flash-high", upstream: "gemini-3.8-flash-high", matched: false };
  const list = Array.isArray(modelList) ? modelList : [];
  const norm = normalizeModelName(requested);
  const bare = stripModelSuffix(norm);

  // 1) Khớp chính xác id trong danh sách động
  const exact = list.find((m) => String(m?.id || "").toLowerCase() === requested.toLowerCase());
  if (exact) return { requested, upstream: exact.upstream || exact.id, matched: true };

  // 2) Khớp sau khi chuẩn hoá (bỏ prefix, gạch dưới, hậu tố ngày)
  const loose = list.find((m) => {
    const mid = normalizeModelName(m?.id);
    return mid === norm || stripModelSuffix(mid) === bare;
  });
  if (loose) return { requested, upstream: loose.upstream || loose.id, matched: true };

  // 3) Bảng bí danh
  const aliases = modelAliasTable(env);
  const aliasHit = aliases[norm] || aliases[bare];
  if (aliasHit) {
    const inList = list.find((m) => normalizeModelName(m?.id) === normalizeModelName(aliasHit));
    return {
      requested,
      upstream: inList ? (inList.upstream || inList.id) : aliasHit,
      matched: !!inList,
      alias: aliasHit
    };
  }

  // 4) Suy luận theo họ model
  const rules = [
    [/gemini.*3\.?8.*flash.*high/, "gemini-3.8-flash-high"],
    [/gemini.*3\.?8.*flash.*(low|extra)/, "gemini-3.8-flash-low"],
    [/gemini.*3\.?8.*flash.*medium/, "gemini-3.8-flash-medium"],
    [/gemini.*3\.?8.*flash.*think/, "gemini-3.8-flash-high"],
    [/gemini.*3\.?8.*flash/, "gemini-3.8-flash-high"],
    [/gemini.*flash.*think/, "gemini-3.8-flash-high"],
    [/gemini.*flash/, "gemini-3.8-flash-high"],
    [/gemini.*pro.*agent/, "gemini-pro-agent"],
    [/gemini.*pro/, "gemini-3.1-pro-high"],
    [/gemini.*(3|2)\.?[0-9]*/, "gemini-3.8-flash-high"],
    [/gemini/, "gemini-3.8-flash-high"],
    [/claude.*opus/, "claude-opus-4-6-thinking"],
    [/opus/, "claude-opus-4-6-thinking"],
    [/claude.*sonnet/, "claude-sonnet-4-6"],
    [/sonnet/, "claude-sonnet-4-6"],
    [/claude.*haiku/, "gemini-3.8-flash-low"],
    [/haiku/, "gemini-3.8-flash-low"],
    [/claude/, "claude-sonnet-4-6"],
    [/gpt-oss|oss-120b|openai\/gpt-oss/, "gpt-oss-120b-medium"],
    [/gpt|^o[1-4]/, "gemini-3.8-flash-high"]
  ];
  for (const [re, target] of rules) {
    if (re.test(norm)) return { requested, upstream: target, matched: false, inferred: true };
  }
  return { requested, upstream: norm, matched: false, unknown: true };
}

function familyOf(upstream) {
  const u = String(upstream || "").toLowerCase();
  if (u.includes("opus")) return "opus";
  if (u.includes("sonnet")) return "sonnet";
  if (u.includes("gpt-oss")) return "oss";
  if (u.includes("pro-agent")) return "agent";
  if (u.includes("pro")) return "pro";
  if (u.includes("flash")) return "flash";
  return "other";
}
function isClaudeFamily(upstream) {
  const u = String(upstream || "").toLowerCase();
  return u.includes("claude") || u.includes("gpt-oss") || u.includes("gpt");
}
// Chuỗi model dự phòng khi model chính bị 400/không khả dụng.
function getCandidateModels(env, primary) {
  const raw = envStr(env, "FALLBACK_CHAIN", "");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        const list = parsed.filter((x) => typeof x === "string");
        if (!list.includes(primary)) list.unshift(primary);
        return [...new Set(list)];
      }
    } catch (err) {
      console.warn("[Models] env.FALLBACK_CHAIN không phải JSON hợp lệ, dùng mặc định:", err?.message);
    }
  }
  const family = familyOf(primary);
  const chains = {
    flash: ["gemini-3.8-flash-tiered", "gemini-3.8-flash-medium", "gemini-3.8-flash-low", "gemini-3.1-pro-high"],
    pro: ["gemini-pro-agent", "gemini-3.8-flash-tiered", "gemini-3.8-flash-high"],
    agent: ["gemini-3.1-pro-high", "gemini-3.8-flash-tiered", "gemini-3.8-flash-high"],
    sonnet: ["claude-opus-4-6-thinking", "gemini-3.1-pro-high", "gemini-3.8-flash-tiered", "gemini-3.8-flash-high"],
    opus: ["claude-sonnet-4-6", "gemini-3.1-pro-high", "gemini-3.8-flash-tiered", "gemini-3.8-flash-high"],
    oss: ["gemini-3.8-flash-tiered", "gemini-3.8-flash-high"],
    other: ["gemini-3.8-flash-tiered", "gemini-3.8-flash-high"]
  };
  return [...new Set([primary, ...(chains[family] || chains.other)])];
}

/* ======================== 50-translate.js ======================== */
/* ============================================================================
 *  PHẦN 6/12 — Chuyển đổi yêu cầu (OpenAI / Anthropic / Responses -> Gemini)
 * ============================================================================
 */

// ------------------------------ Giới hạn ngữ cảnh ----------------------------
function resolveContextLimit(env) {
  const raw = envInt(env, "MAX_CONTEXT_TOKENS", FIXED_CONTEXT_LIMIT, 4096, 4000000);
  return raw;
}
function resolveMaxContextMessages(env) {
  return envInt(env, "MAX_CONTEXT_MESSAGES", DEFAULT_MAX_CONTEXT_MESSAGES, 8, 2000);
}
// Map các knob sampling của OpenAI sang generationConfig, có kẹp giá trị để
// request sai range trả 400 rõ ràng ở đây thay vì lỗi proto khó hiểu từ Google.
function resolveSamplingConfig(body) {
  const cfg = {};
  const temp = Number(body?.temperature);
  cfg.temperature = Number.isFinite(temp) ? Math.min(Math.max(temp, 0), 2) : 0.7;
  const topP = Number(body?.top_p);
  if (Number.isFinite(topP) && topP > 0 && topP <= 1) cfg.topP = topP;
  const topK = Number(body?.top_k);
  if (Number.isFinite(topK) && topK > 0) cfg.topK = Math.floor(topK);
  const stops = Array.isArray(body?.stop)
    ? body.stop.slice(0, 5).map((s) => String(s)).filter((s) => s.length > 0)
    : (typeof body?.stop === "string" && body.stop.length > 0 ? [body.stop] : []);
  if (stops.length > 0) cfg.stopSequences = stops;
  // presence_penalty / frequency_penalty / logit_bias / seed: upstream không có
  // trường tương ứng (penaltyConfig bị từ chối) nên bỏ qua thay vì gửi bừa.
  return cfg;
}
function resolveMaxOutputTokens(body, env) {
  const cap = envInt(env, "MAX_OUTPUT_TOKENS", SAFE_OUTPUT_TOKEN_CAP, MIN_OUTPUT_TOKEN_FLOOR, SAFE_OUTPUT_TOKEN_CAP);
  const requested = Number(body?.max_completion_tokens || body?.max_tokens || body?.max_output_tokens);
  if (!Number.isFinite(requested) || requested <= 0) return Math.min(DEFAULT_MAX_OUTPUT_TOKENS, cap);
  // Các model "high"/thinking tiêu tốn ngân sách cho phần suy luận trước, nên
  // maxOutputTokens quá nhỏ sẽ trả finish_reason "stop" với nội dung rỗng.
  return Math.min(Math.max(Math.floor(requested), MIN_OUTPUT_TOKEN_FLOOR), cap);
}
// reasoning_effort (OpenAI) / thinking.budget_tokens (Anthropic) -> thinkingConfig
function resolveThinkingConfig(body, upstreamModel) {
  const model = String(upstreamModel || "").toLowerCase();
  if (!model.includes("gemini")) return null; // Claude/GPT-oss upstream không nhận thinkingConfig
  let budget = 0;
  const effort = String(body?.reasoning_effort || "").toLowerCase();
  if (effort === "low" || effort === "minimal") budget = 2048;
  else if (effort === "medium") budget = 8192;
  else if (effort === "high") budget = 24576;
  const anthropicBudget = Number(body?.thinking?.budget_tokens);
  if (Number.isFinite(anthropicBudget) && anthropicBudget > 0) budget = Math.min(anthropicBudget, 32768);
  if (!budget) return null;
  return { thinkingBudget: Math.floor(budget), includeThoughts: true };
}

// ------------------------------ Schema tools --------------------------------
var GEMINI_SCHEMA_KEYS = new Set([
  "type", "format", "description", "nullable", "enum", "items", "properties",
  "required", "minimum", "maximum", "minItems", "maxItems", "pattern", "example", "title"
]);
function sanitizeToolParameters(schema, depth) {
  const level = depth || 0;
  if (!schema || typeof schema !== "object" || Array.isArray(schema) || level > 8) {
    return { type: "object", properties: {} };
  }
  // anyOf/oneOf: Google chỉ nhận 1 schema phẳng -> chọn biến thể khả dụng nhất,
  // ưu tiên biến thể không phải null.
  let src = schema;
  const variants = Array.isArray(schema.anyOf) ? schema.anyOf : (Array.isArray(schema.oneOf) ? schema.oneOf : null);
  if (variants && variants.length && !schema.type) {
    const nonNull = variants.filter((v) => v && typeof v === "object" && String(v.type || "").toLowerCase() !== "null");
    if (nonNull.length === 1) {
      src = { ...nonNull[0], description: schema.description || nonNull[0].description };
      if (nonNull.length < variants.length) src.nullable = true;
    } else if (nonNull.length > 1) {
      const allObjects = nonNull.every((v) => v.properties || v.type === "object");
      if (allObjects) {
        const mergedProps = {};
        const mergedRequired = new Set();
        for (const v of nonNull) {
          Object.assign(mergedProps, v.properties || {});
          (v.required || []).forEach((k) => mergedRequired.add(k));
        }
        src = {
          type: "object",
          properties: mergedProps,
          required: [...mergedRequired],
          description: schema.description
        };
      } else {
        src = nonNull[0];
      }
    }
  }
  const out = {};
  for (const [key, value] of Object.entries(src)) {
    if (!GEMINI_SCHEMA_KEYS.has(key)) continue; // loại key lạ -> tránh 400 unknown field
    out[key] = value;
  }
  // type dạng mảng (JSON Schema 2020): ["string","null"] -> type + nullable
  if (Array.isArray(out.type)) {
    const types = out.type.map((t) => String(t));
    if (types.includes("null")) {
      out.nullable = true;
      const nonNull = types.find((t) => t !== "null");
      out.type = nonNull || "string";
    } else {
      out.type = types[0] || "string";
    }
  }
  if (out.enum && Array.isArray(out.enum)) {
    if (out.enum.includes(null)) {
      out.nullable = true;
      out.enum = out.enum.filter((v) => v !== null);
    }
    if (out.enum.length === 0) delete out.enum;
  }
  if (out.type === "object" || out.properties) {
    out.type = "object";
    const props = (out.properties && typeof out.properties === "object") ? out.properties : {};
    const cleaned = {};
    for (const [key, val] of Object.entries(props)) {
      cleaned[key] = sanitizeToolParameters(val, level + 1);
    }
    out.properties = cleaned;
    if (Array.isArray(out.required)) {
      const valid = new Set(Object.keys(cleaned));
      out.required = out.required.filter((k) => valid.has(k));
      if (out.required.length === 0) delete out.required;
    }
  } else if (out.type === "array") {
    out.items = sanitizeToolParameters(out.items || { type: "string" }, level + 1);
  } else if (!out.type) {
    out.type = "string";
  }
  return out;
}
function buildFunctionDeclarations(tools) {
  const decls = [];
  for (const tool of tools || []) {
    const fn = tool.function || tool;
    const rawName = String(fn.name || "tool");
    const cleanName = rawName.replace(/_ide$/, "");
    decls.push({
      name: `${cleanName}_ide`,
      description: fn.description || "",
      parameters: sanitizeToolParameters(fn.parameters)
    });
  }
  return decls;
}
function buildToolConfig(toolChoice, tools) {
  if (!toolChoice || !Array.isArray(tools) || tools.length === 0) return null;
  const modeMap = { auto: "AUTO", none: "NONE", required: "ANY", any: "ANY" };
  let mode = null;
  let allowed = null;
  if (typeof toolChoice === "string") {
    mode = modeMap[toolChoice.toLowerCase()] || null;
  } else if (typeof toolChoice === "object" && toolChoice !== null) {
    const type = String(toolChoice.type || "").toLowerCase();
    if (type === "function" || type === "tool") {
      const name = toolChoice.function?.name || toolChoice.name;
      if (name) {
        mode = "ANY";
        allowed = [`${String(name).replace(/_ide$/, "")}_ide`];
      }
    } else if (modeMap[type]) {
      mode = modeMap[type];
    }
  }
  if (!mode) return null;
  const cfg = { mode };
  if (allowed) cfg.allowedFunctionNames = allowed;
  return { functionCallingConfig: cfg };
}

// ------------------------------ Prune ngữ cảnh -------------------------------
function estimateNormPartTokens(part) {
  let t = 0;
  if (!part) return 0;
  if (part.text) t += estimateTokensForText(part.text);
  if (part.inlineData || part.inline_data) {
    const mime = String(part.inlineData?.mimeType || part.inline_data?.mime_type || "");
    if (mime.startsWith("image/")) t += 1100;
    else if (mime.startsWith("audio/")) t += 600;
    else if (mime.startsWith("video/")) t += 1800;
    else if (mime === "application/pdf") t += 1600;
    else t += 800;
  }
  return t;
}
function estimateNormMsgTokens(msg) {
  if (!msg) return 0;
  let tokens = 4;
  for (const p of msg.parts || []) tokens += estimateNormPartTokens(p);
  for (const tc of msg.toolCalls || []) {
    tokens += 12 + estimateTokensForText(typeof tc.args === "string" ? tc.args : JSON.stringify(tc.args || {}));
  }
  if (msg.role === "tool") tokens += 20 + estimateTokensForText(
    typeof msg.result === "string" ? msg.result : JSON.stringify(msg.result ?? {})
  );
  return tokens;
}
function pruneNormalizedMessages(systemTexts, messages, maxTokens, maxMessages) {
  const sysTokens = (systemTexts || []).reduce((sum, t) => sum + estimateTokensForText(t) + 4, 0);
  if (!Array.isArray(messages) || messages.length === 0) {
    return { messages: [], promptTokens: Math.max(sysTokens, 1), droppedMessages: 0 };
  }
  let kept = messages.slice();
  let dropped = 0;
  if (kept.length > maxMessages) {
    dropped += kept.length - maxMessages;
    kept = kept.slice(-maxMessages);
  }
  // Nhóm assistant(toolCalls) + các tool message theo sau thành 1 khối nguyên tử
  const blocks = [];
  let i = 0;
  while (i < kept.length) {
    const msg = kept[i];
    if (msg.role === "assistant" && Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0) {
      const blockMsgs = [msg];
      let blockTok = estimateNormMsgTokens(msg);
      i++;
      while (i < kept.length && kept[i].role === "tool") {
        blockMsgs.push(kept[i]);
        blockTok += estimateNormMsgTokens(kept[i]);
        i++;
      }
      blocks.push({ messages: blockMsgs, tokens: blockTok });
    } else {
      blocks.push({ messages: [msg], tokens: estimateNormMsgTokens(msg) });
      i++;
    }
  }
  const totalTokens = blocks.reduce((sum, b) => sum + b.tokens, 0);
  if (sysTokens + totalTokens <= maxTokens) {
    // Cắt bớt đầu nếu vượt số message (giữ mốc bắt đầu bằng user)
    while (kept.length > 0 && kept[0].role !== "user") {
      dropped++;
      kept.shift();
    }
    return { messages: kept, promptTokens: Math.max(sysTokens + totalTokens, 1), droppedMessages: dropped };
  }
  const available = Math.max(maxTokens - sysTokens - 500, 2000);
  const keptBlocks = [];
  let acc = 0;
  for (let b = blocks.length - 1; b >= 0; b--) {
    if (acc + blocks[b].tokens <= available || keptBlocks.length === 0) {
      keptBlocks.push(blocks[b]);
      acc += blocks[b].tokens;
    } else break;
  }
  keptBlocks.reverse();
  let out = [];
  for (const block of keptBlocks) out.push(...block.messages);
  // Không được bắt đầu bằng assistant/tool (model sẽ nhìn thấy tool result mồ côi)
  while (out.length > 0 && out[0].role !== "user") {
    dropped++;
    out.shift();
  }
  if (out.length === 0 && blocks.length > 0) {
    out = [...blocks[blocks.length - 1].messages];
  }
  const estimated = out.reduce((sum, m) => sum + estimateNormMsgTokens(m), 0);
  return { messages: out, promptTokens: Math.max(sysTokens + estimated, 1), droppedMessages: dropped };
}

// ------------------------------ Part helpers --------------------------------
function parseDataUri(uri) {
  if (typeof uri !== "string" || !uri.startsWith("data:")) return null;
  const match = uri.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) return null;
  const mimeType = match[1] || "application/octet-stream";
  const payload = match[3] || "";
  if (match[2]) return { inlineData: { mimeType, data: payload } };
  // data URI không base64: mã hoá lại (ít gặp nhưng hợp lệ)
  try {
    const decoded = decodeURIComponent(payload);
    let bin = "";
    for (let i = 0; i < decoded.length; i++) bin += String.fromCharCode(decoded.charCodeAt(i) & 0xff);
    return { inlineData: { mimeType, data: btoa(bin) } };
  } catch (_) {
    return null;
  }
}
function skippedImagePlaceholder(url) {
  return {
    text: `[Hình ảnh bị bỏ qua: gateway chỉ nhận ảnh dạng data URI base64, không tải được URL ${String(url || "").slice(0, 120)}]`
  };
}
function extractContentParts(content) {
  if (typeof content === "string") return content ? [{ text: content }] : [{ text: " " }];
  if (content == null || content === "") return [{ text: " " }];
  if (!Array.isArray(content)) {
    if (typeof content === "object") return [{ text: content.text || JSON.stringify(content) }];
    return [{ text: String(content) }];
  }
  const parts = [];
  for (const item of content) {
    if (typeof item === "string") { parts.push({ text: item }); continue; }
    if (!item || typeof item !== "object") continue;
    const type = String(item.type || "");
    if (type === "text" || type === "input_text" || type === "output_text") {
      if (item.text) parts.push({ text: item.text });
    } else if (type === "image_url" && item.image_url) {
      const url = typeof item.image_url === "string" ? item.image_url : item.image_url.url;
      const parsed = parseDataUri(url);
      if (parsed) parts.push(parsed);
      else if (url) parts.push(skippedImagePlaceholder(url));
    } else if (type === "image" && item.source) {
      if (item.source.type === "base64" && item.source.data) {
        parts.push({ inlineData: { mimeType: item.source.media_type || "image/jpeg", data: item.source.data } });
      } else if (item.source.type === "url" && item.source.url) {
        const parsed = parseDataUri(item.source.url);
        if (parsed) parts.push(parsed);
        else parts.push(skippedImagePlaceholder(item.source.url));
      }
    } else if (type === "document" && item.source) {
      if (item.source.type === "base64" && item.source.data) {
        parts.push({ inlineData: { mimeType: item.source.media_type || "application/pdf", data: item.source.data } });
      } else if (item.source.type === "text") {
        parts.push({ text: item.source.data || "" });
      } else if (item.source.type === "url" && item.source.url) {
        const parsed = parseDataUri(item.source.url);
        if (parsed) parts.push(parsed);
        else parts.push({ text: `[Tài liệu bị bỏ qua: ${String(item.source.url).slice(0, 120)}]` });
      }
    } else if (type === "input_audio" && item.input_audio) {
      if (item.input_audio.data) {
        parts.push({ inlineData: { mimeType: `audio/${item.input_audio.format || "wav"}`, data: item.input_audio.data } });
      }
    } else if (type === "audio_url" && item.audio_url) {
      const url = typeof item.audio_url === "string" ? item.audio_url : item.audio_url.url;
      const parsed = parseDataUri(url);
      if (parsed) parts.push(parsed);
    } else if (type === "video_url" && item.video_url) {
      const url = typeof item.video_url === "string" ? item.video_url : item.video_url.url;
      const parsed = parseDataUri(url);
      if (parsed) parts.push(parsed);
    } else if (type === "tool_result") {
      // Anthropic tool_result nằm trong message user; xử lý ở tầng normalize.
      continue;
    } else if (item.inlineData?.data && item.inlineData?.mimeType) {
      parts.push({ inlineData: item.inlineData });
    } else if (item.inline_data?.data && item.inline_data?.mime_type) {
      parts.push({ inlineData: { mimeType: item.inline_data.mime_type, data: item.inline_data.data } });
    } else if (item.url && typeof item.url === "string") {
      const parsed = parseDataUri(item.url);
      if (parsed) parts.push(parsed);
      else parts.push(skippedImagePlaceholder(item.url));
    } else if (item.text) {
      parts.push({ text: item.text });
    }
  }
  return parts.length > 0 ? parts : [{ text: " " }];
}

// ------------------------------ Normalize: OpenAI ----------------------------
// Kết quả: { system: string[], messages: normMsg[], tools, gen, toolChoice, stream, includeUsage, meta }
function normalizeOpenAiBody(body, env) {
  const system = [];
  const messages = [];
  for (const raw of body.messages || []) {
    if (!raw || typeof raw !== "object") continue;
    const role = String(raw.role || "user").toLowerCase();
    if (role === "system" || role === "developer") {
      for (const p of extractContentParts(raw.content)) {
        if (p.text) system.push(p.text.replace(/^x-anthropic-billing-header:[^\n]*\n?/gim, ""));
      }
      continue;
    }
    if (role === "assistant") {
      const parts = extractContentParts(raw.content).filter((p) => p.text && p.text.trim().length > 0);
      const toolCalls = [];
      if (Array.isArray(raw.tool_calls)) {
        for (const tc of raw.tool_calls) {
          const fn = tc.function || tc;
          toolCalls.push({
            id: tc.id || newId("call_").slice(0, 13),
            name: String(fn.name || "tool").replace(/_ide$/, ""),
            args: parseArgsObject(fn.arguments),
            rawArgs: typeof fn.arguments === "string" ? fn.arguments : undefined,
            signature: extractSignatureFromToolCall(tc) || raw.thought_signature || raw.thoughtSignature
          });
        }
      }
      messages.push({ role: "assistant", parts, toolCalls });
      continue;
    }
    if (role === "tool" || role === "function") {
      messages.push({
        role: "tool",
        toolCallId: raw.tool_call_id || raw.id,
        toolName: raw.name || raw.tool_name,
        result: parseToolResult(raw.content)
      });
      continue;
    }
    messages.push({ role: "user", parts: extractContentParts(raw.content) });
  }
  const tools = normalizeToolList(body.tools);
  return {
    system,
    messages,
    tools,
    gen: { sampling: resolveSamplingConfig(body), maxOutputTokens: resolveMaxOutputTokens(body, env), responseFormat: normalizeResponseFormat(body.response_format) },
    toolChoice: body.tool_choice,
    stream: body.stream === true,
    includeUsage: !!(body.stream_options && body.stream_options.include_usage),
    parallel: body.parallel_tool_calls,
    meta: { source: "openai", raw: body }
  };
}
function extractSignatureFromToolCall(tc) {
  // Một số client (fork của Cline/Roo) echo lại thoughtSignature trong tool_call.
  return tc?.thought_signature || tc?.thoughtSignature || tc?.function?.thought_signature || tc?.function?.thoughtSignature || null;
}
function normalizeToolList(tools) {
  if (!Array.isArray(tools)) return [];
  const out = [];
  for (const t of tools) {
    if (!t) continue;
    const fn = t.function || t;
    if (typeof fn !== "object") continue;
    const type = String(t.type || fn.type || "function").toLowerCase();
    if (type && type !== "function" && type !== "custom") continue;
    const name = fn.name || t.name;
    if (!name) continue;
    out.push({ name: String(name), description: fn.description || "", parameters: fn.parameters || fn.input_schema || { type: "object", properties: {} } });
  }
  return out;
}
function parseArgsObject(args) {
  if (args == null) return {};
  if (typeof args === "object") return args;
  const s = String(args).trim();
  if (!s) return {};
  try {
    const parsed = JSON.parse(s);
    if (parsed && typeof parsed === "object") return parsed;
    return { value: parsed };
  } catch (_) {
    return { _raw: s };
  }
}
function parseToolResult(content) {
  if (content == null) return { output: "" };
  if (typeof content === "object") {
    if (Array.isArray(content)) {
      const parts = extractContentParts(content);
      const texts = parts.filter((p) => p.text).map((p) => p.text);
      const media = parts.filter((p) => p.inlineData);
      if (media.length === 0) return { output: texts.join("\n") };
      // functionResponse của Google không nhận ảnh -> mô tả lại bằng text.
      return { output: `${texts.join("\n")}${texts.length ? "\n" : ""}[${media.length} tệp đính kèm không hiển thị được trong functionResponse]` };
    }
    return content;
  }
  const s = String(content);
  const trimmed = s.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_) { /* fallthrough */ }
  }
  return { output: s };
}
function normalizeResponseFormat(rf) {
  if (!rf || typeof rf !== "object") return null;
  const type = String(rf.type || "");
  if (type === "json_object") return { mimeType: "application/json" };
  if (type === "json_schema" && rf.json_schema) {
    const schema = rf.json_schema.schema || rf.json_schema;
    return { mimeType: "application/json", schema: sanitizeToolParameters(schema) };
  }
  return null;
}

// ------------------------------ Normalize: Anthropic -------------------------
function normalizeAnthropicBody(body, env) {
  const system = [];
  if (typeof body.system === "string") system.push(body.system);
  else if (Array.isArray(body.system)) {
    for (const b of body.system) {
      if (typeof b === "string") system.push(b);
      else if (b && b.type === "text" && b.text) system.push(b.text);
    }
  }
  const messages = [];
  for (const raw of body.messages || []) {
    if (!raw || typeof raw !== "object") continue;
    const role = String(raw.role || "user").toLowerCase();
    if (typeof raw.content === "string") {
      messages.push({ role: role === "assistant" ? "assistant" : "user", parts: extractContentParts(raw.content), toolCalls: [] });
      continue;
    }
    const blocks = Array.isArray(raw.content) ? raw.content : [];
    if (role === "assistant") {
      const parts = [];
      const toolCalls = [];
      for (const b of blocks) {
        if (!b) continue;
        if (b.type === "text" && b.text) parts.push({ text: b.text });
        else if (b.type === "thinking" || b.type === "redacted_thinking") {
          // Giữ chữ ký suy luận để tái sử dụng đúng thoughtSignature của Google.
          if (b.thinking) parts.push({ text: b.thinking, signature: b.signature || null, isThought: true });
        } else if (b.type === "tool_use") {
          toolCalls.push({
            id: b.id || newId("toolu_").slice(0, 18),
            name: String(b.name || "tool").replace(/_ide$/, ""),
            args: b.input && typeof b.input === "object" ? b.input : {},
            signature: b.signature || null
          });
        }
      }
      messages.push({ role: "assistant", parts, toolCalls });
      continue;
    }
    // user: các tool_result phải đứng ngay sau tool_use tương ứng
    const userParts = [];
    const toolResults = [];
    for (const b of blocks) {
      if (!b) continue;
      if (b.type === "tool_result") {
        toolResults.push({
          role: "tool",
          toolCallId: b.tool_use_id,
          toolName: b.tool_name,
          result: parseToolResult(b.content ?? b.output ?? ""),
          isError: !!b.is_error
        });
      } else if (b.type === "text" && b.text) {
        userParts.push({ text: b.text });
      } else if (b.type === "image" || b.type === "document") {
        const extracted = extractContentParts([b]);
        userParts.push(...extracted);
      } else if (b.type === "tool_use") {
        // hiếm: tool_use trong message user
        userParts.push({ text: JSON.stringify(b) });
      }
    }
    for (const tr of toolResults) messages.push(tr);
    if (userParts.length > 0) messages.push({ role: "user", parts: userParts });
    else if (toolResults.length === 0) messages.push({ role: "user", parts: [{ text: " " }] });
  }
  const tools = normalizeToolList((body.tools || []).map((t) => ({ type: "function", function: { ...t, parameters: t.input_schema || t.parameters } })));
  const gen = {
    sampling: resolveSamplingConfig(body),
    maxOutputTokens: resolveMaxOutputTokens({ max_tokens: body.max_tokens }, env),
    responseFormat: null
  };
  if (Array.isArray(body.stop_sequences) && body.stop_sequences.length) {
    gen.sampling.stopSequences = body.stop_sequences.slice(0, 5).map(String);
  }
  return {
    system,
    messages,
    tools,
    gen,
    toolChoice: body.tool_choice,
    stream: body.stream === true,
    includeUsage: true,
    meta: { source: "anthropic", raw: body, thinking: body.thinking }
  };
}

// ------------------------------ Normalize: Responses API ---------------------
function normalizeResponsesBody(body, env) {
  const system = [];
  if (typeof body.instructions === "string" && body.instructions) system.push(body.instructions);
  const messages = [];
  const input = body.input;
  if (typeof input === "string") {
    messages.push({ role: "user", parts: [{ text: input }] });
  } else if (Array.isArray(input)) {
    const pendingCalls = [];
    for (const item of input) {
      if (!item) continue;
      if (typeof item === "string") { messages.push({ role: "user", parts: [{ text: item }] }); continue; }
      const type = String(item.type || "");
      if (type === "function_call") {
        pendingCalls.push({
          id: item.call_id || item.id || newId("call_").slice(0, 13),
          name: String(item.name || "tool").replace(/_ide$/, ""),
          args: parseArgsObject(item.arguments),
          signature: item.thought_signature || null
        });
        continue;
      }
      if (type === "function_call_output") {
        messages.push({
          role: "tool",
          toolCallId: item.call_id || item.id,
          toolName: item.name,
          result: parseToolResult(item.output)
        });
        continue;
      }
      if (type === "reasoning") {
        const summary = Array.isArray(item.summary) ? item.summary.map((s) => s.text).filter(Boolean).join("\n") : "";
        if (summary) messages.push({ role: "assistant", parts: [{ text: summary, isThought: true, signature: item.signature || null }], toolCalls: [] });
        continue;
      }
      const role = String(item.role || "user").toLowerCase();
      if (role === "system" || role === "developer") {
        for (const p of extractContentParts(item.content)) if (p.text) system.push(p.text);
        continue;
      }
      if (role === "assistant") {
        const parts = extractContentParts(item.content).filter((p) => p.text);
        const toolCalls = pendingCalls.splice(0, pendingCalls.length);
        messages.push({ role: "assistant", parts, toolCalls });
        continue;
      }
      messages.push({ role: "user", parts: extractContentParts(item.content) });
    }
    if (pendingCalls.length) messages.push({ role: "assistant", parts: [], toolCalls: pendingCalls });
  }
  const tools = normalizeToolList((body.tools || []).map((t) => (t && t.type === "function" ? { type: "function", function: t } : t)));
  const rf = body.text?.format;
  const responseFormat = rf ? normalizeResponseFormat({ type: rf.type === "json_schema" ? "json_schema" : rf.type, json_schema: rf.schema ? { schema: rf.schema } : undefined }) : null;
  return {
    system,
    messages,
    tools,
    gen: {
      sampling: resolveSamplingConfig(body),
      maxOutputTokens: resolveMaxOutputTokens({ max_output_tokens: body.max_output_tokens }, env),
      responseFormat
    },
    toolChoice: body.tool_choice,
    stream: body.stream === true,
    includeUsage: true,
    meta: { source: "responses", raw: body }
  };
}

// ------------------------------ Gemini payload -------------------------------
async function resolveFallbackSignature(env) {
  let sig = memoryCache.latestSignature;
  if (!sig && env && env.ANTIGRAVITY_KV) {
    try {
      const fetched = await env.ANTIGRAVITY_KV.get("sig:latest");
      if (fetched) {
        memoryCache.latestSignature = fetched;
        sig = fetched;
      }
    } catch (_) { /* ignore */ }
  }
  if (!sig) {
    const custom = envStr(env, "FALLBACK_THOUGHT_SIGNATURE", "");
    sig = custom || DEFAULT_FALLBACK_THOUGHT_SIGNATURE;
    memoryCache.latestSignature = sig;
  }
  return sig;
}
function withSignature(part, sig) {
  if (!sig) return part;
  part.thoughtSignature = sig;
  part.thought_signature = sig;
  return part;
}
// Chuyển messages đã chuẩn hoá -> contents/systemInstruction của Google.
function buildGeminiContents(normalized, fallbackSig) {
  const { messages, tools, system } = normalized;
  const declaredFnNames = new Set((tools || []).map((t) => `${String(t.name).replace(/_ide$/, "")}_ide`));
  const toolNameMap = new Map();
  for (const msg of messages) {
    if (msg.role === "assistant" && Array.isArray(msg.toolCalls)) {
      for (const tc of msg.toolCalls) if (tc.id && tc.name) toolNameMap.set(tc.id, tc.name);
    }
  }
  const systemInstruction = system && system.length
    ? { parts: system.map((t) => ({ text: t })).length ? system.map((t) => ({ text: t })) : [{ text: " " }] }
    : undefined;

  const contents = [];
  const appendPart = (role, part) => {
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts.push(part);
    else contents.push({ role, parts: [part] });
  };

  for (const msg of messages) {
    if (msg.role === "user") {
      for (const p of msg.parts) appendPart("user", p);
    } else if (msg.role === "assistant") {
      const parts = [];
      for (const p of msg.parts) {
        if (p.isThought && p.signature) {
          parts.push(withSignature({ text: p.text }, p.signature));
        } else if (p.text) {
          parts.push({ text: p.text });
        } else {
          parts.push(p);
        }
      }
      for (const tc of msg.toolCalls || []) {
        const callPart = {
          functionCall: { id: tc.id, name: `${String(tc.name || "tool").replace(/_ide$/, "")}_ide`, args: tc.args || {} }
        };
        const sig = tc.signature
          || memoryCache.signatures.get(tc.id)
          || msg.toolSignature
          || fallbackSig
          || DEFAULT_FALLBACK_THOUGHT_SIGNATURE;
        withSignature(callPart, sig);
        parts.push(callPart);
      }
      if (parts.length === 0) parts.push({ text: " " });
      for (const p of parts) appendPart("model", p);
    } else if (msg.role === "tool") {
      let toolName = msg.toolName;
      if (!toolName && msg.toolCallId) toolName = toolNameMap.get(msg.toolCallId);
      if (!toolName) toolName = "tool";
      // Google 400 nếu functionResponse mang tên khác functionCall mà nó trả lời.
      // Tên trong khung call là tên model thực sự thấy => luôn thắng.
      const callFnName = msg.toolCallId ? toolNameMap.get(msg.toolCallId) : null;
      if (callFnName) toolName = callFnName;
      else if (declaredFnNames.size > 0 && !declaredFnNames.has(`${toolName}_ide`)) {
        toolName = [...declaredFnNames][0].slice(0, -"_ide".length);
      }
      const funcResp = {
        name: `${String(toolName).replace(/_ide$/, "")}_ide`,
        response: msg.isError
          ? { error: typeof msg.result === "object" ? JSON.stringify(msg.result) : String(msg.result ?? "") }
          : (msg.result ?? { output: "" })
      };
      if (msg.toolCallId) funcResp.id = msg.toolCallId;
      appendPart("user", { functionResponse: funcResp });
    }
  }

  if (contents.length === 0) contents.push({ role: "user", parts: [{ text: "Hello" }] });
  if (contents[0].role === "model") contents.unshift({ role: "user", parts: [{ text: "Hello" }] });

  // 1) functionResponse mồ côi (không có functionCall đứng trước) -> chuyển thành text
  for (let c = 0; c < contents.length; c++) {
    const item = contents[c];
    if (item.role !== "user" || !Array.isArray(item.parts)) continue;
    const prev = c > 0 ? contents[c - 1] : null;
    const prevHasFc = prev && prev.role === "model" && Array.isArray(prev.parts) && prev.parts.some((p) => p.functionCall);
    if (prevHasFc) continue;
    for (let pIdx = 0; pIdx < item.parts.length; pIdx++) {
      const part = item.parts[pIdx];
      if (part.functionResponse) {
        const fnName = part.functionResponse.name || "tool";
        const data = part.functionResponse.response;
        const text = typeof data === "object" ? JSON.stringify(data) : String(data ?? "");
        item.parts[pIdx] = { text: `[Tool Result ${fnName}]: ${text}` };
      }
    }
  }

  // 2) functionCall không được trả lời -> thêm functionResponse báo lỗi
  for (let c = 0; c < contents.length; c++) {
    const item = contents[c];
    if (item.role !== "model" || !Array.isArray(item.parts)) continue;
    const fcParts = item.parts.filter((p) => p.functionCall);
    if (fcParts.length === 0) continue;
    for (const p of fcParts) {
      if (!p.thoughtSignature && !p.thought_signature) withSignature(p, DEFAULT_FALLBACK_THOUGHT_SIGNATURE);
    }
    const next = contents[c + 1];
    const answered = next && next.role === "user" && Array.isArray(next.parts) && next.parts.some((p) => p.functionResponse);
    if (!answered) {
      const missing = fcParts.map((fc) => ({
        functionResponse: {
          name: fc.functionCall.name,
          id: fc.functionCall.id,
          response: { error: "tool result missing: the previous tool call was not executed" }
        }
      }));
      if (next && next.role === "user") next.parts.unshift(...missing);
      else { contents.splice(c + 1, 0, { role: "user", parts: missing }); c++; }
    }
  }

  // 3) Gộp các turn cùng role liền nhau
  const merged = [];
  for (const item of contents) {
    const last = merged[merged.length - 1];
    if (last && last.role === item.role) last.parts.push(...item.parts);
    else merged.push(item);
  }
  // 4) Google yêu cầu turn cuối là user (model không được trả lời chính nó)
  if (merged.length > 0 && merged[merged.length - 1].role === "model") {
    merged.push({ role: "user", parts: [{ text: "Please proceed." }] });
  }
  return { contents: merged, systemInstruction, toolNameMap, declaredFnNames };
}

// Gộp tất cả thành payload gửi upstream.
function buildGeminiPayload(normalized, built, upstreamModel, env, extra) {
  const generationConfig = {
    ...normalized.gen.sampling,
    maxOutputTokens: normalized.gen.maxOutputTokens
  };
  if (normalized.gen.responseFormat) {
    generationConfig.responseMimeType = normalized.gen.responseFormat.mimeType;
    if (normalized.gen.responseFormat.schema) generationConfig.responseSchema = normalized.gen.responseFormat.schema;
  }
  const thinking = resolveThinkingConfig(normalized.meta?.raw || {}, upstreamModel);
  if (thinking) generationConfig.thinkingConfig = thinking;
  const toolConfig = buildToolConfig(normalized.toolChoice, normalized.tools);
  const decls = buildFunctionDeclarations(normalized.tools);
  const projectId = extra?.projectId || "aicode-consumers";
  return {
    project: projectId,
    model: upstreamModel,
    userAgent: CONFIG.clientName,
    requestType: "agent",
    requestId: `agent/${newId("")}/${Date.now()}/${newId("")}/1`,
    request: {
      contents: built.contents,
      ...(built.systemInstruction ? { systemInstruction: built.systemInstruction } : {}),
      ...(decls.length ? { tools: [{ functionDeclarations: decls }] } : {}),
      ...(toolConfig ? { toolConfig } : {}),
      generationConfig,
      sessionId: extra?.sessionId || `session-${Date.now()}`
    }
  };
}

/* ======================== 60-upstream.js ======================== */
/* ============================================================================
 *  PHẦN 7/12 — Điều phối tài khoản (SWRR), gọi upstream, failover, đọc SSE
 * ============================================================================
 */

// ------------------------------ SWRR / cân bằng tải --------------------------
function calculateAccountBalanceMetrics(acc, upstreamModel, now) {
  const ts = now || Date.now();
  const cached = memoryCache.usageCache.get(acc.id);
  const isClaude = isClaudeFamily(upstreamModel);
  const coolingUntil = Math.max(
    Number.isFinite(acc.rateLimitExpiresAt) ? acc.rateLimitExpiresAt : 0,
    Number.isFinite(cached?.rateLimitExpiresAt) ? cached.rateLimitExpiresAt : 0
  );
  if ((acc.isRateLimited || cached?.isRateLimited) && coolingUntil > ts) {
    const remSec = Math.ceil((coolingUntil - ts) / 1000);
    return {
      tier: 5,
      tierLabel: "Tạm dừng",
      tierColor: "#ef4444",
      score: -100,
      effectiveWeight: 0,
      dispatchMode: "⛔ Tạm khóa (Cooldown)",
      dispatchColor: "#ef4444",
      fiveHour: 0, weekly: 0,
      fiveHourResetMs: Infinity, weeklyResetMs: Infinity,
      fiveHourCountdown: "--", weeklyCountdown: "--",
      coolingDown: true,
      cooldownRemainingMs: coolingUntil - ts,
      reason: `Cooldown (${remSec}s)`
    };
  }
  let fiveHourRem = 100, weeklyRem = 100;
  let fiveHourResetMs = Infinity, weeklyResetMs = Infinity;
  let hasData = false;
  if (cached?.data) {
    const bucketGroup = isClaude ? cached.data.claude : cached.data.gemini;
    if (bucketGroup && (bucketGroup.fiveHour || bucketGroup.weekly)) hasData = true;
    if (typeof bucketGroup?.fiveHour?.remainingPercentage === "number") {
      fiveHourRem = Math.max(0, Math.min(100, bucketGroup.fiveHour.remainingPercentage));
    }
    if (typeof bucketGroup?.weekly?.remainingPercentage === "number") {
      weeklyRem = Math.max(0, Math.min(100, bucketGroup.weekly.remainingPercentage));
    }
    if (bucketGroup?.fiveHour?.resetTime) {
      const resetTs = new Date(bucketGroup.fiveHour.resetTime).getTime();
      if (!Number.isNaN(resetTs) && resetTs > ts) fiveHourResetMs = resetTs - ts;
    }
    if (bucketGroup?.weekly?.resetTime) {
      const resetTs = new Date(bucketGroup.weekly.resetTime).getTime();
      if (!Number.isNaN(resetTs) && resetTs > ts) weeklyResetMs = resetTs - ts;
    }
  }
  const fiveHourCountdown = formatCountdown(fiveHourResetMs);
  const weeklyCountdown = formatCountdown(weeklyResetMs);
  if (fiveHourRem <= 0 || weeklyRem <= 0) {
    return {
      tier: 4, tierLabel: "Hết Quota", tierColor: "#dc2626",
      score: -999, effectiveWeight: 0,
      dispatchMode: "🔴 Cạn kiệt Quota", dispatchColor: "#dc2626",
      fiveHour: fiveHourRem, weekly: weeklyRem,
      fiveHourResetMs, weeklyResetMs, fiveHourCountdown, weeklyCountdown,
      hasData, reason: fiveHourRem <= 0 ? "Hết 5h" : "Hết tuần"
    };
  }
  let tier = 1, tierLabel = "Dồi dào", tierColor = "#10b981";
  if (fiveHourRem < 15 || weeklyRem < 15) { tier = 3; tierLabel = "Cảnh báo cạn"; tierColor = "#f59e0b"; }
  else if (fiveHourRem < 35 || weeklyRem < 30) { tier = 2; tierLabel = "Tiết kiệm"; tierColor = "#38bdf8"; }

  let compositeScore = fiveHourRem * 0.4 + weeklyRem * 0.6;
  let dispatchMode = "⚖️ Cân bằng SWRR";
  let dispatchColor = "#10b981";
  const RESET_SURGE_WINDOW = 45 * 60 * 1000;
  if (fiveHourResetMs <= RESET_SURGE_WINDOW && fiveHourRem >= 15) {
    // Quota 5h sắp reset -> dùng mạnh tay để không bỏ phí hạn ngạch.
    const urgencyFactor = 1 - fiveHourResetMs / RESET_SURGE_WINDOW;
    const surgeBonus = Math.round(25 * urgencyFactor);
    compositeScore += surgeBonus;
    dispatchMode = `⚡ Tận dụng Reset (+${surgeBonus})`;
    dispatchColor = "#a855f7";
  } else {
    const WEEKLY_CYCLE_MS = 7 * 24 * 3600 * 1000;
    if (weeklyResetMs > 0 && weeklyResetMs < WEEKLY_CYCLE_MS) {
      const expectedWeeklyRem = (weeklyResetMs / WEEKLY_CYCLE_MS) * 100;
      if (weeklyRem < expectedWeeklyRem - 15) {
        // Đốt quota tuần nhanh hơn nhịp reset -> giảm trọng số để bảo toàn.
        const penalty = Math.min(30, Math.round((expectedWeeklyRem - weeklyRem) * 0.5));
        compositeScore = Math.max(5, compositeScore - penalty);
        dispatchMode = `🛡️ Bảo tồn Tuần (-${penalty})`;
        dispatchColor = "#0284c7";
      }
    }
  }
  if (dispatchMode === "⚖️ Cân bằng SWRR" && (fiveHourRem < 20 || weeklyRem < 20)) {
    dispatchMode = "⚠️ Tiết kiệm Quota";
    dispatchColor = "#f59e0b";
  }
  const finalScore = Math.round(compositeScore * 10) / 10;
  return {
    tier, tierLabel, tierColor,
    score: finalScore,
    effectiveWeight: Math.max(1, Math.round(finalScore)),
    dispatchMode, dispatchColor,
    fiveHour: fiveHourRem, weekly: weeklyRem,
    fiveHourResetMs, weeklyResetMs, fiveHourCountdown, weeklyCountdown,
    hasData, reason: "Sẵn sàng"
  };
}
function getRankedAccounts(env, accounts, upstreamModel, ctx) {
  if (!Array.isArray(accounts) || accounts.length <= 1) return accounts || [];
  const now = Date.now();
  const evaluated = accounts.map((acc, index) => {
    const cached = memoryCache.usageCache.get(acc.id);
    if (!cached || now >= (cached.expiresAt || 0)) {
      if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(refreshAccountQuotaBackground(env, acc));
    }
    return { account: acc, index, ...calculateAccountBalanceMetrics(acc, upstreamModel, now) };
  });
  const eligible = evaluated.filter((e) => e.tier <= 3 && e.effectiveWeight > 0);
  const ineligible = evaluated.filter((e) => e.tier > 3 || e.effectiveWeight <= 0);
  ineligible.sort((a, b) => (a.tier !== b.tier ? a.tier - b.tier : b.score - a.score));
  if (eligible.length === 0) {
    evaluated.sort((a, b) => b.score - a.score);
    return evaluated.map((e) => e.account);
  }
  if (eligible.length === 1) return [eligible[0].account, ...ineligible.map((e) => e.account)];

  // Smooth Weighted Round Robin: chọn account có trọng số ảo lớn nhất, trừ tổng
  // trọng số, phần còn lại xếp theo thứ tự cho các lần failover tiếp theo.
  memoryCache.rrCounter = ((memoryCache.rrCounter || 0) + 1) % eligible.length;
  const rotated = [...eligible.slice(memoryCache.rrCounter), ...eligible.slice(0, memoryCache.rrCounter)];
  const totalWeight = rotated.reduce((sum, e) => sum + e.effectiveWeight, 0);
  for (const e of rotated) {
    memoryCache.swrrState.set(e.account.id, (memoryCache.swrrState.get(e.account.id) || 0) + e.effectiveWeight);
  }
  let selected = rotated[0];
  let maxWeight = memoryCache.swrrState.get(selected.account.id) ?? -Infinity;
  for (let i = 1; i < rotated.length; i++) {
    const w = memoryCache.swrrState.get(rotated[i].account.id) ?? -Infinity;
    if (w > maxWeight) { maxWeight = w; selected = rotated[i]; }
  }
  memoryCache.swrrState.set(selected.account.id, maxWeight - totalWeight);
  const others = rotated.filter((e) => e.account.id !== selected.account.id);
  others.sort((a, b) => {
    const wa = memoryCache.swrrState.get(a.account.id) || 0;
    const wb = memoryCache.swrrState.get(b.account.id) || 0;
    return wb !== wa ? wb - wa : b.score - a.score;
  });
  return [selected.account, ...others.map((e) => e.account), ...ineligible.map((e) => e.account)];
}

// ------------------------------ Ghi nhớ thoughtSignature ---------------------
function rememberSignature(env, ctx, callId, sig) {
  if (!sig) return;
  if (callId) {
    memoryCache.signatures.set(callId, sig);
    if (memoryCache.signatures.size > 500) {
      const firstKey = memoryCache.signatures.keys().next().value;
      if (firstKey) memoryCache.signatures.delete(firstKey);
    }
  }
  memoryCache.latestSignature = sig;
  const now = Date.now();
  // Chỉ ghi KV khi chữ ký đổi và đã qua khoảng chờ — KV free tier chỉ có
  // 1000 write/ngày, ghi mỗi 30 giây sẽ đốt sạch quota chỉ với việc lưu chữ ký.
  const sigWriteInterval = env ? envInt(env, "SIG_KV_INTERVAL_MS", 300000, 60000, 3600000) : 300000;
  if (env?.ANTIGRAVITY_KV && sig !== memoryCache.lastKvSig && now - memoryCache.lastKvSigTime > sigWriteInterval) {
    memoryCache.lastKvSig = sig;
    memoryCache.lastKvSigTime = now;
    const p = safeKvPut(env.ANTIGRAVITY_KV, "sig:latest", sig, { expirationTtl: SIG_KV_TTL_SEC });
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(p);
  }
}

// ------------------------------ Đọc SSE upstream ------------------------------
function createChunkQueue() {
  const items = [];
  const waiters = [];
  let closed = false;
  let error = null;
  return {
    push(item) {
      if (closed) return;
      const w = waiters.shift();
      if (w) w({ value: item, done: false });
      else items.push(item);
    },
    fail(err) { error = err; closed = true; while (waiters.length) waiters.shift()({ error }); },
    close() { closed = true; while (waiters.length) waiters.shift()({ done: true }); },
    async next() {
      if (error) throw error;
      if (items.length) return { value: items.shift(), done: false };
      if (closed) return { done: true };
      return await new Promise((resolve) => waiters.push(resolve));
    }
  };
}
var HB = { __heartbeat: true };
// Async iterator trên stream SSE của Google: trả về object JSON đã parse, có
// heartbeat để client/edge không cắt kết nối khi model "suy nghĩ" lâu.
async function* iterateUpstreamEvents(upstreamRes, heartbeatMs, idleMs, maxTotalMs, startedAt) {
  if (!upstreamRes || !upstreamRes.body) return;
  const reader = upstreamRes.body.getReader();
  const decoder = new TextDecoder();
  const queue = createChunkQueue();
  const idle = idleMs || 0;
  const total = maxTotalMs || 0;
  const began = startedAt || Date.now();
  // Nhịp tim phải nhỏ hơn ngưỡng idle, nếu không watchdog tự bắn oan.
  let hbMs = heartbeatMs || 15000;
  if (idle > 0) hbMs = Math.min(hbMs, Math.max(2000, Math.floor(idle / 3)));
  let lastEventAt = Date.now();
  let buffer = "";
  const pump = (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line || !line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload[0] !== "{") continue;
          try { queue.push(JSON.parse(payload)); } catch (_) { /* bỏ dòng hỏng */ }
        }
      }
    } catch (err) {
      queue.fail(err);
      return;
    }
    queue.close();
  })();
  let pending = null;
  try {
    while (true) {
      if (!pending) pending = queue.next().then((r) => { pending = null; return r; }, (e) => { pending = null; throw e; });
      const result = await Promise.race([pending, sleep(hbMs).then(() => HB)]);
      if (result === HB) {
        // Upstream "câm" (Google treo kết nối) hoặc treo quá lâu: cắt và báo lỗi
        // để client nhận error + [DONE], thay vì chờ vô hạn như trước.
        if (idle > 0 && Date.now() - lastEventAt > idle) {
          throw new Error(`Upstream không gửi dữ liệu trong ${Math.round((Date.now() - lastEventAt) / 1000)}s (STREAM_IDLE_TIMEOUT_MS=${idle}). Đã cắt kết nối.`);
        }
        if (total > 0 && Date.now() - began > total) {
          throw new Error(`Vượt trần thời gian ${Math.round(total / 1000)}s cho một request (MAX_REQUEST_MS). Đã cắt kết nối.`);
        }
        yield HB;
        continue;
      }
      if (result.done) break;
      lastEventAt = Date.now();
      yield result.value;
    }
  } finally {
    try { await reader.cancel(); } catch (_) { /* ignore */ }
    pump.catch(() => {});
  }
}
function extractResponseObject(payload) {
  const resp = payload?.response || payload || {};
  const candidate = resp.candidates?.[0] || payload?.candidates?.[0] || null;
  return { resp, candidate, feedback: resp.promptFeedback || null, usage: resp.usageMetadata || payload?.usageMetadata || null };
}
function partSignature(p) {
  return (p && (p.thoughtSignature || p.thought_signature)) || null;
}
function isThoughtPart(p) {
  return !!(p && (p.thought === true || p.thoughtSummary === true || (p.thought === "true")));
}
// Thu thập nội dung từ parts (dùng cho non-stream + cho adapter).
function collectParts(parts, ctxSink) {
  const text = [];
  const thoughts = [];
  const toolCalls = [];
  let lastSig = null;
  for (const part of parts || []) {
    if (!part) continue;
    const sig = partSignature(part);
    if (sig) lastSig = sig;
    if (part.text) {
      if (isThoughtPart(part)) thoughts.push({ text: part.text, signature: sig });
      else text.push({ text: part.text, signature: sig });
    }
    if (part.functionCall) {
      const realName = String(part.functionCall.name || "tool").replace(/_ide$/, "");
      const callId = part.functionCall.id || newId("call_").slice(0, 13);
      const args = part.functionCall.args && typeof part.functionCall.args === "object" ? part.functionCall.args : {};
      const callSig = sig || lastSig;
      if (callSig && ctxSink) ctxSink(callId, callSig);
      toolCalls.push({ id: callId, name: realName, args, arguments: JSON.stringify(args), signature: callSig });
    }
  }
  return { text, thoughts, toolCalls, lastSignature: lastSig };
}
function collectNonStreamResult(agData, ctxSink) {
  const { resp, candidate, feedback, usage } = extractResponseObject(agData);
  const parts = candidate?.content?.parts || [];
  const collected = collectParts(parts, ctxSink);
  const finishReason = String(candidate?.finishReason || candidate?.finish_reason || "").toUpperCase();
  return {
    text: collected.text.map((t) => t.text).join(""),
    thoughts: collected.thoughts,
    toolCalls: collected.toolCalls,
    finishReason,
    blockReason: feedback?.blockReason || null,
    blockMessage: feedback?.blockReasonMessage || null,
    usage,
    candidate,
    response: resp
  };
}
function mapFinishReason(finishReason, hasToolCalls) {
  if (hasToolCalls) return "tool_calls";
  const fr = String(finishReason || "").toUpperCase();
  if (fr === "MAX_TOKENS") return "length";
  if (fr === "SAFETY" || fr === "BLOCKLIST" || fr === "PROHIBITED_CONTENT" || fr === "SPII") return "content_filter";
  if (fr === "RECITATION") return "content_filter";
  if (fr === "MALFORMED_FUNCTION_CALL") return "tool_calls";
  return "stop";
}

// ------------------------------ Gọi upstream + failover ----------------------
function parseUpstreamErrorText(text) {
  let msg = String(text || "");
  try {
    const parsed = JSON.parse(text);
    if (parsed?.error?.message) msg = parsed.error.message;
    else if (typeof parsed?.error === "string") msg = parsed.error;
  } catch (_) { /* giữ nguyên text */ }
  return msg;
}
// Thực thi 1 request lên upstream với failover nhiều tầng:
//   model chính -> model dự phòng -> tài khoản kế tiếp -> backoff toàn cục & thử lại.
// Trả về { upstreamRes, account, model, attempts } hoặc { error: Response }.
async function executeUpstream(env, ctx, plan) {
  const accounts = plan.accounts;
  const candidateModels = plan.candidateModels;
  const requestedModel = plan.requestedModel;
  const stream = plan.stream;
  const action = stream ? "streamGenerateContent?alt=sse" : "generateContent";
  const upstreamUrl = `${CONFIG.chatDailyEndpoint}/v1internal:${action}`;
  const maxPasses = envInt(env, "FAILOVER_PASSES", 2, 1, 4);
  // Cloudflare Workers giới hạn số subrequest/request (50 với gói Free, 1000 với
  // Paid). Không chặn trần thì 10 tài khoản × 6 model × 2 vòng = 120 fetch ->
  // request chết giữa đường vì "Too many subrequests". Mỗi lần thử = 1 fetch.
  const maxAttempts = envInt(env, "MAX_ATTEMPTS", 12, 1, 200);
  const backoffMs = envInt(env, "FAILOVER_BACKOFF_MS", 1500, 0, 30000);
  const cooldown429 = envInt(env, "COOLDOWN_429_MS", 30000, 1000, 3600000);
  const cooldown403 = envInt(env, "COOLDOWN_403_MS", 3600000, 60000, 86400000);
  const cooldown401 = envInt(env, "COOLDOWN_401_MS", 86400000, 60000, 2592000000);

  let lastErrorText = "";
  let lastStatus = 503;
  let attempts = 0;
  let exhausted = false;

  for (let pass = 0; pass < maxPasses && !exhausted; pass++) {
    if (pass > 0) {
      console.warn(`[Global-Backoff] Toàn bộ ${accounts.length} tài khoản × ${candidateModels.length} model đều bận. Chờ ${backoffMs}ms rồi thử lại...`);
      await sleep(backoffMs + Math.floor(Math.random() * 250));
    }
    for (const currentModel of candidateModels) {
      if (exhausted) break;
      const ordered = getRankedAccounts(env, accounts, currentModel, ctx);
      for (const account of ordered) {
        if (attempts >= maxAttempts) {
          console.warn(`[Limits] Đã chạm trần ${maxAttempts} lần thử (MAX_ATTEMPTS) — dừng failover để không vượt hạn mức subrequest của Workers.`);
          exhausted = true;
          break;
        }
        attempts++;
        try {
          const { accessToken, projectId } = await getValidTokenForAccount(env, account);
          const payload = plan.buildPayload(account, projectId, currentModel);
          // LƯU Ý: AbortSignal.timeout(upTimeout) áp cho CẢ body stream — câu trả
          // lời dài hơn upTimeout sẽ bị cắt giữa dòng (client không nhận [DONE]).
          // Nên chỉ đặt timeout cho pha KẾT NỐI; phần đọc stream do watchdog idle
          // (STREAM_IDLE_TIMEOUT_MS) và trần MAX_REQUEST_MS lo.
          const connectMs = envInt(env, "UPSTREAM_CONNECT_TIMEOUT_MS", 60000, 1000, 600000);
          const doFetch = async (token) => {
            const controller = new AbortController();
            const timer = setTimeout(() => {
              try { controller.abort(new Error(`Không nhận được phản hồi upstream sau ${connectMs}ms`)); } catch (_) { /* ignore */ }
            }, connectMs);
            try {
              return await fetch(upstreamUrl, {
                method: "POST",
                headers: upstreamHeaders(env, token),
                body: JSON.stringify(payload),
                signal: controller.signal
              });
            } finally {
              clearTimeout(timer);
            }
          };
          let res = await doFetch(accessToken);

          // 401: token có thể vừa hết hạn -> force refresh rồi thử lại 1 lần.
          if (res.status === 401) {
            console.warn(`[Auto-Heal] Upstream 401 cho ${account.email}. Force refresh token...`);
            try {
              const refreshed = await getValidTokenForAccount(env, account, true);
              res = await doFetch(refreshed.accessToken);
            } catch (rfErr) {
              console.warn(`[Auto-Heal] Force refresh thất bại cho ${account.email}:`, rfErr?.message);
            }
          }

          if (res.status === 400) {
            const errText = await res.text();
            const errMsg = parseUpstreamErrorText(errText);
            if (/thought_signature|thoughtSignature/i.test(errText)) {
              console.warn("[Auto-Heal] 400 missing thought_signature — vá chữ ký rồi gửi lại...");
              plan.repairSignatures();
              res = await doFetch(accessToken);
            } else if (/not found|not supported|unsupported|is not available|does not exist/i.test(errMsg)) {
              console.warn(`[Auto-Failover] Model ${currentModel} bị từ chối (${errMsg}). Sang model kế tiếp...`);
              lastStatus = 400; lastErrorText = errMsg;
              recordStat({ upstreamError: true });
              break; // sang model kế tiếp
            } else {
              return { error: openAiError(errMsg, 400, "invalid_request_error", 400, plan.request, env) };
            }
          }
          // 400 phát sinh sau khi vá chữ ký
          if (res.status === 400) {
            const errText = await res.text();
            const errMsg = parseUpstreamErrorText(errText);
            if (/not found|not supported|unsupported|is not available|does not exist/i.test(errMsg)) {
              lastStatus = 400; lastErrorText = errMsg;
              recordStat({ upstreamError: true });
              break;
            }
            return { error: openAiError(errMsg, 400, "invalid_request_error", 400, plan.request, env) };
          }
          if ([500, 502, 503, 504].includes(res.status)) {
            lastStatus = res.status;
            lastErrorText = await res.text().catch(() => "");
            console.warn(`[Instant-Failover] Upstream ${res.status} cho ${account.email} (${currentModel}). Chuyển ngay...`);
            recordStat({ upstreamError: true, failovers: 1 });
            continue;
          }
          if (res.status === 429) {
            lastStatus = 429;
            lastErrorText = await res.text().catch(() => "");
            const retryAfter = parseInt(res.headers.get("Retry-After") || "0", 10);
            const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : cooldown429;
            console.warn(`[Auto-Failover] ${account.email} bị 429 (${currentModel}). Cooldown ${Math.round(waitMs / 1000)}s.`);
            ctx?.waitUntil ? ctx.waitUntil(markAccountCooldown(env, account, waitMs, "429")) : await markAccountCooldown(env, account, waitMs, "429");
            recordStat({ quotaHit: true, cooldown: true, failovers: 1 });
            continue;
          }
          if (res.status === 403) {
            lastStatus = 403;
            lastErrorText = await res.text().catch(() => "");
            console.warn(`[Auto-Failover] ${account.email} bị 403 (không có quyền). Loại khỏi pool ${Math.round(cooldown403 / 3600000)}h.`);
            ctx?.waitUntil ? ctx.waitUntil(markAccountCooldown(env, account, cooldown403, "403")) : await markAccountCooldown(env, account, cooldown403, "403");
            recordStat({ cooldown: true, failovers: 1 });
            continue;
          }
          if (res.status === 401) {
            // 401 sống sót sau khi refresh => refresh token hỏng, cần liên kết lại.
            account.accessToken = undefined;
            account.expiresAt = 0;
            account.refreshToken = undefined;
            lastStatus = 401;
            lastErrorText = await res.text().catch(() => "");
            console.warn(`[Auto-Failover] ${account.email} 401 sau refresh — refresh token hỏng. Cần liên kết lại.`);
            ctx?.waitUntil
              ? ctx.waitUntil(patchAccount(env, account, { accessToken: "", refreshToken: "", expiresAt: 0, isRateLimited: true, rateLimitExpiresAt: Date.now() + cooldown401, cooldownReason: "401" }))
              : await patchAccount(env, account, { accessToken: "", refreshToken: "", expiresAt: 0, isRateLimited: true, rateLimitExpiresAt: Date.now() + cooldown401, cooldownReason: "401" });
            recordStat({ cooldown: true, failovers: 1 });
            continue;
          }
          if (!res.ok) {
            lastStatus = res.status;
            lastErrorText = await res.text().catch(() => "");
            console.warn(`[Auto-Failover] ${account.email} upstream ${res.status}: ${lastErrorText.slice(0, 300)}`);
            recordStat({ upstreamError: true, failovers: 1 });
            continue;
          }
          return { upstreamRes: res, account, model: currentModel, attempts };
        } catch (err) {
          lastErrorText = err?.message || String(err);
          lastStatus = err?.status || 500;
          console.warn(`[Auto-Failover] Lỗi kết nối tài khoản ${account.email}: ${lastErrorText}`);
          recordStat({ upstreamError: true, failovers: 1 });
          continue;
        }
      }
    }
  }
  memoryCache.lastUpstreamError = { at: Date.now(), message: lastErrorText, status: lastStatus };
  return {
    error: openAiError(
      `Toàn bộ ${accounts.length} tài khoản trong Antigravity Pool đều không phản hồi thành công (mã cuối: ${lastStatus}, đã thử ${attempts} lần${exhausted ? ", chạm trần MAX_ATTEMPTS" : ""}). Chi tiết: ${String(lastErrorText).slice(0, 500)}`,
      lastStatus || 503, "upstream_error", lastStatus || 503, plan.request, env,
      { "retry-after": "5" }
    )
  };
}

/* ======================== 70-openai.js ======================== */
/* ============================================================================
 *  PHẦN 8/12 — Endpoint OpenAI: /v1/chat/completions, /v1/completions, /v1/models
 * ============================================================================
 */

// Nhiều client không gửi stream đúng kiểu boolean: "stream": "true", stream: 1,
// hoặc chỉ set header Accept: text/event-stream. Bản cũ dùng `body.stream === true`
// nên những client này nhận JSON thường trong khi chúng chờ SSE -> treo vô hạn.
function wantsStream(request, body) {
  const v = body ? body.stream : undefined;
  if (v === true || v === 1) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
    if (s === "false" || s === "0" || s === "no" || s === "off" || s === "") return false;
  }
  if (v === false || v === 0) return false;
  const accept = (request && request.headers.get("Accept")) || "";
  return /text\/event-stream/i.test(accept);
}
function maskEmail(email) {
  const e = String(email || "");
  const at = e.indexOf("@");
  if (at <= 0) return "•••";
  return `${e.slice(0, 1)}***${e.slice(at)}`;
}
function gatewayHeaders(result, requestedModel, extra) {
  return {
    "x-gateway-version": GATEWAY_VERSION,
    "x-gateway-model": result?.model || "",
    "x-gateway-requested-model": requestedModel || "",
    "x-gateway-account": maskEmail(result?.account?.email),
    "x-gateway-attempts": String(result?.attempts || 1),
    "x-gateway-downgraded": result?.model && requestedModel && result.model !== requestedModel ? "true" : "false",
    ...(extra || {})
  };
}
function sseChannel(writer) {
  const encoder = new TextEncoder();
  let closed = false;
  return {
    async event(obj) {
      if (closed) return;
      await writer.write(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
    },
    async comment(text) {
      if (closed) return;
      await writer.write(encoder.encode(`: ${text || "keep-alive"}\n\n`));
    },
    async raw(str) {
      if (closed) return;
      await writer.write(encoder.encode(str));
    },
    async close() {
      if (closed) return;
      closed = true;
      try { await writer.close(); } catch (_) { /* ignore */ }
    }
  };
}
function startKeepAlive(channel, ms, note) {
  // Gửi comment SSE định kỳ để client/proxy biết kết nối còn sống trong lúc
  // gateway đang failover giữa các tài khoản/model (khoảng "im lặng" trước đây
  // khiến app phía client báo "waiting for provider response" rồi treo).
  let stopped = false;
  const timer = setInterval(() => {
    if (stopped) return;
    try {
      const job = channel.comment(note || "keep-alive");
      if (job && typeof job.catch === "function") job.catch(() => { stopped = true; });
    } catch (_) {
      stopped = true;
    }
  }, ms);
  if (timer && typeof timer.unref === "function") timer.unref();
  return () => { stopped = true; clearInterval(timer); };
}
// Mở SSE với client NGAY LẬP TỨC (trước khi biết tài khoản/model nào phục vụ).
// Trước đây response chỉ được trả sau khi executeUpstream() xong: nếu phải
// failover qua nhiều tài khoản + backoff, client không nhận byte nào trong hàng
// chục giây và tự treo ở trạng thái "waiting for provider response (streaming)".
function openSseStream(request, env, extraHeaders) {
  const stream = new TransformStream();
  const channel = sseChannel(stream.writable.getWriter());
  const response = new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      ...corsHeaders(request, env),
      ...(extraHeaders || {})
    }
  });
  return { response, channel };
}
function chatChunk(responseId, model, delta, finishReason, extra) {
  return {
    id: responseId,
    object: "chat.completion.chunk",
    created: nowSec(),
    model,
    choices: [{ index: 0, delta: delta || {}, finish_reason: finishReason ?? null, logprobs: null }],
    ...(extra || {})
  };
}

// Chuẩn bị pipeline chung cho chat/completions.
async function prepareChatPlan(request, env, ctx, body) {
  const accounts = await getAccountsList(env);
  const models = await getDynamicModels(env);
  const target = resolveModelTarget(body.model, models, env);
  const normalized = normalizeOpenAiBody(body, env);
  const fallbackSig = await resolveFallbackSignature(env);
  const contextLimit = resolveContextLimit(env);
  const pruned = pruneNormalizedMessages(normalized.system, normalized.messages, contextLimit, resolveMaxContextMessages(env));
  normalized.messages = pruned.messages;
  const built = buildGeminiContents(normalized, fallbackSig);
  const candidateModels = getCandidateModels(env, target.upstream);
  const plan = {
    accounts,
    request,
    env,
    requestedModel: target.requested,
    candidateModels,
    stream: normalized.stream,
    buildPayload: (account, projectId, model) => buildGeminiPayload(normalized, built, model, env, { projectId }),
    repairSignatures: () => {
      for (const item of built.contents) {
        if (item.role !== "model" || !Array.isArray(item.parts)) continue;
        for (const p of item.parts) {
          if (p.functionCall) withSignature(p, DEFAULT_FALLBACK_THOUGHT_SIGNATURE);
        }
      }
    }
  };
  return { plan, normalized, target, promptTokens: pruned.promptTokens, droppedMessages: pruned.droppedMessages };
}

async function handleChatCompletions(request, env, ctx) {
  if (!env.ANTIGRAVITY_KV) console.warn("[Gateway] Chưa cấu hình ANTIGRAVITY_KV — không thể lưu tài khoản/cooldown.");
  const accounts = await getAccountsList(env);
  if (accounts.length === 0) {
    return openAiError(
      "Chưa có tài khoản nào được kết nối vào Antigravity Pool! Vui lòng truy cập Dashboard để kết nối tài khoản Google.",
      503, "upstream_error", "no_accounts_configured", request, env
    );
  }
  let body;
  try {
    body = await readJsonBody(request, envInt(env, "MAX_BODY_BYTES", 26214400, 65536, 104857600));
  } catch (err) {
    return openAiError(`Body yêu cầu không phải JSON hợp lệ: ${err?.message || err}`, err?.status || 400, "invalid_request_error", err?.status || 400, request, env);
  }
  if (!body || typeof body !== "object") {
    return openAiError("Body yêu cầu không phải JSON hợp lệ.", 400, "invalid_request_error", 400, request, env);
  }
  if (!Array.isArray(body.messages)) {
    return openAiError("Thiếu trường 'messages' (phải là mảng).", 400, "invalid_request_error", "missing_messages", request, env);
  }

  const startedAt = Date.now();
  const { plan, normalized, target, promptTokens } = await prepareChatPlan(request, env, ctx, body);
  const isStreamRequest = wantsStream(request, body);
  normalized.stream = isStreamRequest;
  plan.stream = isStreamRequest;

  // Request không xin stream: giữ hành vi cũ (lỗi trả về đúng HTTP status).
  if (!isStreamRequest) {
    const result = await executeUpstream(env, ctx, plan);
    if (result.error) {
      recordStat({ status: result.error.status, endpoint: "/v1/chat/completions", model: target.upstream, latencyMs: Date.now() - startedAt });
      return result.error;
    }
    const headers = gatewayHeaders(result, body.model);
    let agData;
    try {
      agData = await withTimeout(result.upstreamRes.json(), envInt(env, "UPSTREAM_TIMEOUT_MS", 120000, 5000, 600000), "đọc JSON upstream");
    } catch (err) {
      recordStat({ status: 502, endpoint: "/v1/chat/completions", upstreamError: true });
      return openAiError(`Không đọc được phản hồi upstream: ${err?.message || err}`, 502, "upstream_error", 502, request, env);
    }
    const collected = collectNonStreamResult(agData, (callId, sig) => rememberSignature(env, ctx, callId, sig));
    if (collected.blockReason) {
      recordStat({ status: 200, endpoint: "/v1/chat/completions", model: result.model, account: result.account.id, latencyMs: Date.now() - startedAt });
      return jsonResponse({
        id: newId("chatcmpl-"),
        object: "chat.completion",
        created: nowSec(),
        model: result.model,
        choices: [{
          index: 0,
          message: { role: "assistant", content: `[Bị chặn bởi bộ lọc an toàn: ${collected.blockReason}${collected.blockMessage ? " — " + collected.blockMessage : ""}]` },
          finish_reason: "content_filter"
        }],
        usage: { prompt_tokens: promptTokens, completion_tokens: 0, total_tokens: promptTokens }
      }, 200, request, env, headers);
    }
    const message = {
      role: "assistant",
      content: collected.toolCalls.length > 0 ? null : (collected.text || null)
    };
    if (collected.toolCalls.length > 0) {
      message.tool_calls = collected.toolCalls.map((tc) => ({
        id: tc.id, type: "function",
        function: { name: tc.name, arguments: tc.arguments }
      }));
    }
    const thoughtText = collected.thoughts.map((t) => t.text).join("");
    if (thoughtText) message.reasoning_content = thoughtText;
    const upUsage = collected.usage || {};
    const completionTokens = upUsage.candidatesTokenCount
      ?? Math.max(1, Math.round(estimateTokensForText(collected.text + thoughtText) + collected.toolCalls.reduce((s, tc) => s + 10 + estimateTokensForText(tc.arguments), 0)));
    const usage = {
      prompt_tokens: upUsage.promptTokenCount || promptTokens,
      completion_tokens: completionTokens,
      total_tokens: upUsage.totalTokenCount || ((upUsage.promptTokenCount || promptTokens) + completionTokens)
    };
    if (upUsage.thoughtsTokenCount) usage.completion_tokens_details = { reasoning_tokens: upUsage.thoughtsTokenCount };
    recordStat({
      status: 200, endpoint: "/v1/chat/completions", model: result.model, account: result.account.id,
      latencyMs: Date.now() - startedAt, promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens,
      failovers: result.attempts > 1 ? result.attempts - 1 : 0
    });
    logEvent(env, {
      level: "info", path: "/v1/chat/completions", model: result.model, account: maskEmail(result.account.email),
      status: 200, ms: Date.now() - startedAt, tokens: usage.total_tokens, stream: false
    });
    return jsonResponse({
      id: newId("chatcmpl-"),
      object: "chat.completion",
      created: nowSec(),
      model: result.model,
      choices: [{
        index: 0,
        message,
        finish_reason: mapFinishReason(collected.finishReason, collected.toolCalls.length > 0)
      }],
      usage
    }, 200, request, env, headers);
  }

  // ------------------------------ Streaming ------------------------------
  // Mở SSE với client NGAY, rồi mới chọn tài khoản/gọi upstream. Trong lúc chờ
  // (failover, backoff, xoay token) vẫn gửi comment SSE mỗi CONNECT_HEARTBEAT_MS
  // để app không rơi vào trạng thái "waiting for provider response" rồi treo.
  const responseId = newId("chatcmpl-");
  const heartbeatMs = envInt(env, "HEARTBEAT_MS", 15000, 0, 60000);
  const idleMs = envInt(env, "STREAM_IDLE_TIMEOUT_MS", 90000, 0, 1800000);
  const maxRequestMs = envInt(env, "MAX_REQUEST_MS", 900000, 0, 3600000);
  const connectHbMs = envInt(env, "CONNECT_HEARTBEAT_MS", 8000, 2000, 60000);
  const heuristicThoughts = envBool(env, "THOUGHT_AFTER_TOOLCALL", true);
  // Mặc định vẫn gửi usage ở chunk cuối (giống bản cũ, nhiều client đọc số liệu này);
  // đặt STREAM_ALWAYS_USAGE=false nếu muốn theo đúng spec (chỉ gửi khi client xin).
  const includeUsage = normalized.includeUsage || envBool(env, "STREAM_ALWAYS_USAGE", true);

  const { response: sseResponse, channel } = openSseStream(request, env, {
    "x-gateway-version": GATEWAY_VERSION,
    "x-gateway-requested-model": body.model || ""
  });

  ctx.waitUntil((async () => {
    let servedModel = target.upstream;
    let result = null;
    let stopKeepAlive = null;
    let hasToolCalls = false;
    let toolCallIndex = 0;
    let completionTokens = 0;
    let finishReasonSeen = "";
    let firstEventAt = 0;
    try {
      stopKeepAlive = startKeepAlive(channel, connectHbMs, "gateway: đang chọn tài khoản...");
      await channel.comment(`gateway v${GATEWAY_VERSION} • đang kết nối upstream`);
      result = await executeUpstream(env, ctx, plan);
      if (stopKeepAlive) { stopKeepAlive(); stopKeepAlive = null; }

      if (!result || result.error) {
        const payload = result && result.error ? await result.error.json().catch(() => null) : null;
        const errObj = payload?.error || { message: "Toàn bộ tài khoản trong pool đều không phản hồi.", type: "upstream_error", code: 503 };
        recordStat({ status: errObj.code || 503, endpoint: "/v1/chat/completions", model: target.upstream, latencyMs: Date.now() - startedAt, upstreamError: true });
        logEvent(env, { level: "error", path: "/v1/chat/completions", message: errObj.message, model: target.upstream, stream: true });
        await channel.event({ error: errObj });
        await channel.raw("data: [DONE]\n\n");
        return;
      }

      servedModel = result.model;
      const gwMeta = {
        model: servedModel,
        account: maskEmail(result.account.email),
        attempts: result.attempts
      };
      firstEventAt = Date.now();
      await channel.event({
        ...chatChunk(responseId, servedModel, { role: "assistant", content: "" }, null),
        x_gateway: gwMeta
      });

      for await (const ev of iterateUpstreamEvents(result.upstreamRes, heartbeatMs, idleMs, maxRequestMs, firstEventAt)) {
        if (ev === HB || ev?.__heartbeat) { await channel.comment("keep-alive"); continue; }
        const { candidate, feedback } = extractResponseObject(ev);
        if (feedback?.blockReason) finishReasonSeen = "SAFETY";
        if (!candidate) continue;
        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          const sig = partSignature(part);
          if (sig) memoryCache.latestSignature = sig;
          if (part.text) {
            const thought = isThoughtPart(part) || (heuristicThoughts && hasToolCalls && !!sig);
            completionTokens += Math.ceil(estimateTokensForText(part.text) * 0.8);
            await channel.event(chatChunk(responseId, servedModel, thought
              ? { reasoning_content: part.text }
              : { content: part.text }, null));
          }
          if (part.functionCall) {
            hasToolCalls = true;
            const realName = String(part.functionCall.name || "tool").replace(/_ide$/, "");
            const callId = part.functionCall.id || newId("call_").slice(0, 13);
            const argsStr = JSON.stringify(part.functionCall.args || {});
            completionTokens += 10 + Math.ceil(estimateTokensForText(argsStr) * 0.8);
            rememberSignature(env, ctx, callId, sig || memoryCache.latestSignature);
            await channel.event(chatChunk(responseId, servedModel, {
              tool_calls: [{
                index: toolCallIndex++,
                id: callId,
                type: "function",
                function: { name: realName, arguments: argsStr }
              }]
            }, null));
          }
        }
        if (candidate.finishReason) finishReasonSeen = String(candidate.finishReason).toUpperCase();
      }
      const finalFinish = mapFinishReason(finishReasonSeen, hasToolCalls);
      const usagePayload = includeUsage
        ? {
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: Math.max(completionTokens, 1),
            total_tokens: promptTokens + Math.max(completionTokens, 1)
          }
        }
        : {};
      await channel.event(chatChunk(responseId, servedModel, {}, finalFinish, usagePayload));
      await channel.raw("data: [DONE]\n\n");
      recordStat({
        status: 200, endpoint: "/v1/chat/completions", model: servedModel, account: result.account.id,
        latencyMs: Date.now() - startedAt, promptTokens, completionTokens: Math.max(completionTokens, 1),
        failovers: result.attempts > 1 ? result.attempts - 1 : 0
      });
      logEvent(env, {
        level: "info", path: "/v1/chat/completions", model: servedModel, account: maskEmail(result.account.email),
        status: 200, ms: Date.now() - startedAt, tokens: promptTokens + completionTokens, stream: true,
        ttfbMs: firstEventAt ? firstEventAt - startedAt : null, attempts: result.attempts
      });
    } catch (err) {
      // Mọi lỗi trong lúc stream đều phải kết thúc bằng error + [DONE]; nếu không,
      // client sẽ chờ mãi ở trạng thái "waiting for provider response (streaming)".
      console.error("[Stream Error]", err);
      recordStat({ status: 500, endpoint: "/v1/chat/completions", upstreamError: true });
      logEvent(env, { level: "error", path: "/v1/chat/completions", message: err?.message || String(err), model: servedModel });
      try {
        await channel.event({
          error: { message: err?.message || String(err), type: "upstream_error", code: 500 }
        });
        await channel.raw("data: [DONE]\n\n");
      } catch (_) { /* ignore */ }
    } finally {
      if (stopKeepAlive) stopKeepAlive();
      await channel.close();
    }
  })());

  return sseResponse;
}

// ------------------------------ /v1/completions (legacy) ---------------------
async function handleLegacyCompletions(request, env, ctx) {
  let body;
  try {
    body = await readJsonBody(request, envInt(env, "MAX_BODY_BYTES", 26214400, 65536, 104857600));
  } catch (err) {
    return openAiError(`Body yêu cầu không phải JSON hợp lệ: ${err?.message || err}`, 400, "invalid_request_error", 400, request, env);
  }
  if (!body || typeof body !== "object") return openAiError("Body JSON không hợp lệ.", 400, "invalid_request_error", 400, request, env);
  let prompt = body.prompt;
  if (Array.isArray(prompt)) prompt = prompt.filter((x) => typeof x === "string").join("\n");
  if (typeof prompt !== "string" || !prompt) {
    return openAiError("Trường 'prompt' là bắt buộc (chuỗi).", 400, "invalid_request_error", "missing_prompt", request, env);
  }
  const chatBody = {
    ...body,
    messages: [{ role: "user", content: prompt }],
    stream: false,
    max_tokens: body.max_tokens
  };
  const legacyHeaders = new Headers(request.headers);
  legacyHeaders.delete("content-length"); // body mới khác kích thước body cũ
  legacyHeaders.set("Content-Type", "application/json");
  const response = await handleChatCompletions(new Request(request.url, {
    method: "POST",
    headers: legacyHeaders,
    body: JSON.stringify(chatBody)
  }), env, ctx);
  if (!response.ok) return response;
  const data = await response.json();
  const choice = data.choices?.[0] || {};
  return jsonResponse({
    id: newId("cmpl-"),
    object: "text_completion",
    created: data.created || nowSec(),
    model: data.model,
    choices: [{ text: choice.message?.content || "", index: 0, logprobs: null, finish_reason: choice.finish_reason || "stop" }],
    usage: data.usage
  }, 200, request, env, {
    "x-gateway-model": data.model || "",
    "x-gateway-version": GATEWAY_VERSION
  });
}

// ------------------------------ /v1/models ----------------------------------
async function handleListModels(request, env) {
  const dynamicModels = await getDynamicModels(env);
  const filtered = filterLatestModels(dynamicModels, env);
  const ctxLimit = resolveContextLimit(env);
  const models = filtered.map((m) => ({
    id: m.id,
    object: "model",
    created: 1700000000,
    owned_by: "google-antigravity",
    context_length: ctxLimit,
    context_window: ctxLimit,
    max_tokens: Math.min(ctxLimit, SAFE_OUTPUT_TOKEN_CAP)
  }));
  return jsonResponse({ object: "list", data: models }, 200, request, env);
}

// ------------------------------ Endpoint quản trị -----------------------------
async function handleGetUsage(request, env, ctx, accountId) {
  const accounts = await getAccountsList(env);
  if (accounts.length === 0) return jsonResponse({ success: false, error: "Chưa có tài khoản nào" }, 200, request, env);
  if (!accountId) return jsonResponse({ success: false, error: "Thiếu tham số accountId." }, 400, request, env);
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return jsonResponse({ success: false, error: "Không tìm thấy tài khoản" }, 404, request, env);
  const cached = memoryCache.usageApiCache.get(accountId);
  if (cached && Date.now() - cached.at < USAGE_API_CACHE_MS) {
    return jsonResponse({ success: true, usage: cached.payload, cached: true }, 200, request, env);
  }
  const usage = await getAccountQuota(env, acc, true, ctx);
  memoryCache.usageApiCache.set(accountId, { at: Date.now(), payload: usage });
  return jsonResponse({ success: true, usage }, 200, request, env);
}
async function handleGetBalanceStatus(request, env, upstreamModel) {
  const accounts = await getAccountsList(env);
  const model = upstreamModel || "gemini-3.8-flash-high";
  const now = Date.now();
  const list = accounts.map((acc, index) => ({
    id: acc.id,
    email: acc.email,
    index,
    ...calculateAccountBalanceMetrics(acc, model, now)
  }));
  const eligible = list.filter((e) => e.tier <= 3 && e.effectiveWeight > 0);
  const totalWeight = eligible.reduce((sum, e) => sum + e.effectiveWeight, 0);
  let nextActiveId = "";
  if (eligible.length > 0) {
    let maxVirtualWeight = -Infinity;
    for (const e of eligible) {
      const virtualWeight = (memoryCache.swrrState.get(e.id) || 0) + e.effectiveWeight;
      if (virtualWeight > maxVirtualWeight) { maxVirtualWeight = virtualWeight; nextActiveId = e.id; }
    }
  } else if (list.length > 0) {
    nextActiveId = list[0].id;
  }
  const result = list.map((item) => {
    const isEligible = item.tier <= 3 && item.effectiveWeight > 0;
    return {
      ...item,
      trafficShare: isEligible && totalWeight > 0 ? Math.round((item.effectiveWeight / totalWeight) * 1000) / 10 : 0,
      isNext: item.id === nextActiveId
    };
  });
  return jsonResponse({ success: true, nextAccountId: nextActiveId, model, totalWeight, accounts: result }, 200, request, env);
}
async function handleSyncModels(request, env) {
  try {
    const result = await refreshModelsCache(env);
    if (!result) {
      return jsonResponse({
        success: false,
        error: `Không lấy được danh sách models từ upstream (pool trống hoặc upstream lỗi${memoryCache.modelsLastError ? ": " + memoryCache.modelsLastError : ""}). Danh sách hiện tại giữ nguyên.`
      }, 502, request, env);
    }
    return jsonResponse({
      success: true,
      count: result.models.length,
      added: result.added,
      removed: result.removed,
      syncedAt: result.syncedAt,
      message: result.added.length > 0 ? `🆕 Phát hiện ${result.added.length} model mới: ${result.added.join(", ")}` : "Không có model mới.",
      models: result.models
    }, 200, request, env);
  } catch (err) {
    return jsonResponse({ success: false, error: err?.message || String(err) }, 500, request, env);
  }
}
async function handleGetStats(request, env) {
  const snapshot = statsSnapshot();
  let aggregate = null;
  if (env.ANTIGRAVITY_KV) {
    aggregate = await env.ANTIGRAVITY_KV.get("stats:agg", { type: "json" }).catch(() => null);
  }
  return jsonResponse({
    success: true,
    version: GATEWAY_VERSION,
    isolate: snapshot,
    aggregate,
    requestLog: requestLog.slice(-40),
    note: "Số liệu là của isolate hiện tại (Cloudflare chạy nhiều isolate); 'aggregate' là tổng đã gộp vào KV."
  }, 200, request, env);
}
async function handleGetLogs(request, env) {
  return jsonResponse({ success: true, logs: requestLog.slice(-envInt(env, "LOG_BUFFER_SIZE", 120, 10, 500)) }, 200, request, env);
}
async function handleHealth(request, env) {
  const accounts = await getAccountsList(env).catch(() => []);
  const cooling = accounts.filter((a) => isAccountCoolingDown(a, Date.now())).length;
  return jsonResponse({
    ok: true,
    version: GATEWAY_VERSION,
    kv: !!env.ANTIGRAVITY_KV,
    accounts: accounts.length,
    coolingDown: cooling,
    uptimeSec: Math.floor((Date.now() - stats.startedAt) / 1000),
    clientVersion: clientVersion(env),
    time: new Date().toISOString()
  }, 200, request, env);
}

/* ======================== 75-anthropic.js ======================== */
/* ============================================================================
 *  PHẦN 9/12 — Endpoint tương thích Anthropic: /v1/messages, count_tokens
 *  (Cho phép trỏ Claude Code / Anthropic SDK trực tiếp vào gateway này:
 *   ANTHROPIC_BASE_URL=https://<worker>/v1  ANTHROPIC_API_KEY=<API_KEY>)
 * ============================================================================
 */

async function anthEvent(channel, name, obj) {
  await channel.raw(`event: ${name}\ndata: ${JSON.stringify(obj)}\n\n`);
}
function anthropicStopReason(finishReason, hasToolCalls) {
  if (hasToolCalls) return "tool_use";
  const fr = String(finishReason || "").toUpperCase();
  if (fr === "MAX_TOKENS") return "max_tokens";
  if (fr === "SAFETY" || fr === "RECITATION" || fr === "PROHIBITED_CONTENT" || fr === "BLOCKLIST" || fr === "SPII") return "refusal";
  if (fr === "STOP" || !fr) return "end_turn";
  return "end_turn";
}
function anthropicUsage(promptTokens, completionTokens) {
  return {
    input_tokens: Math.max(promptTokens || 0, 0),
    output_tokens: Math.max(completionTokens || 0, 0),
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0
  };
}
function isMessagesPath(pathname) {
  return pathname === "/v1/messages" || pathname === "/messages" || pathname === "/v1/messages/";
}

async function handleAnthropicMessages(request, env, ctx) {
  const accounts = await getAccountsList(env);
  if (accounts.length === 0) {
    return anthropicError("Chưa có tài khoản nào được kết nối vào Antigravity Pool!", 503, "api_error", request, env);
  }
  let body;
  try {
    body = await readJsonBody(request, envInt(env, "MAX_BODY_BYTES", 26214400, 65536, 104857600));
  } catch (err) {
    return anthropicError(`Body yêu cầu không phải JSON hợp lệ: ${err?.message || err}`, err?.status || 400, "invalid_request_error", request, env);
  }
  if (!body || typeof body !== "object") return anthropicError("Body JSON không hợp lệ.", 400, "invalid_request_error", request, env);
  if (!Array.isArray(body.messages)) return anthropicError("Thiếu trường 'messages'.", 400, "invalid_request_error", request, env);
  if (!Number.isFinite(Number(body.max_tokens))) {
    return anthropicError("Thiếu trường bắt buộc 'max_tokens'.", 400, "invalid_request_error", request, env);
  }

  const startedAt = Date.now();
  const models = await getDynamicModels(env);
  const target = resolveModelTarget(body.model, models, env);
  const normalized = normalizeAnthropicBody(body, env);
  const fallbackSig = await resolveFallbackSignature(env);
  const pruned = pruneNormalizedMessages(normalized.system, normalized.messages, resolveContextLimit(env), resolveMaxContextMessages(env));
  normalized.messages = pruned.messages;
  const built = buildGeminiContents(normalized, fallbackSig);
  const plan = {
    accounts, request, env,
    requestedModel: target.requested,
    candidateModels: getCandidateModels(env, target.upstream),
    stream: normalized.stream,
    buildPayload: (account, projectId, model) => buildGeminiPayload(normalized, built, model, env, { projectId }),
    repairSignatures: () => {
      for (const item of built.contents) {
        if (item.role !== "model" || !Array.isArray(item.parts)) continue;
        for (const p of item.parts) if (p.functionCall) withSignature(p, DEFAULT_FALLBACK_THOUGHT_SIGNATURE);
      }
    }
  };
  const isStreamRequest = wantsStream(request, body);
  normalized.stream = isStreamRequest;
  plan.stream = isStreamRequest;

  // Không stream: giữ hành vi cũ (lỗi trả về HTTP status đúng chuẩn Anthropic).
  if (!isStreamRequest) {
    const result = await executeUpstream(env, ctx, plan);
    if (result.error) {
      recordStat({ status: result.error.status, endpoint: "/v1/messages", model: target.upstream, latencyMs: Date.now() - startedAt });
      // Đổi định dạng lỗi OpenAI -> Anthropic để SDK Anthropic parse được.
      const payload = await result.error.json().catch(() => ({}));
      return anthropicError(payload?.error?.message || "Upstream không phản hồi thành công.", result.error.status || 502, "api_error", request, env);
    }
    const headers = gatewayHeaders(result, body.model);
    let agData;
    try {
      agData = await withTimeout(result.upstreamRes.json(), envInt(env, "UPSTREAM_TIMEOUT_MS", 120000, 5000, 600000), "đọc JSON upstream");
    } catch (err) {
      return anthropicError(`Không đọc được phản hồi upstream: ${err?.message || err}`, 502, "api_error", request, env);
    }
    const collected = collectNonStreamResult(agData, (callId, sig) => rememberSignature(env, ctx, callId, sig));
    const content = [];
    for (const t of collected.thoughts) {
      content.push({ type: "thinking", thinking: t.text, ...(t.signature ? { signature: t.signature } : {}) });
    }
    if (collected.blockReason) {
      content.push({ type: "text", text: `[Bị chặn bởi bộ lọc an toàn: ${collected.blockReason}${collected.blockMessage ? " — " + collected.blockMessage : ""}]` });
    } else if (collected.text) {
      content.push({ type: "text", text: collected.text });
    }
    for (const tc of collected.toolCalls) {
      content.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.args });
    }
    if (content.length === 0) content.push({ type: "text", text: "" });
    const upUsage = collected.usage || {};
    const outTokens = upUsage.candidatesTokenCount || Math.max(1, estimateTokensForText(collected.text));
    recordStat({
      status: 200, endpoint: "/v1/messages", model: result.model, account: result.account.id,
      latencyMs: Date.now() - startedAt, promptTokens: pruned.promptTokens, completionTokens: outTokens
    });
    logEvent(env, { level: "info", path: "/v1/messages", model: result.model, account: maskEmail(result.account.email), status: 200, ms: Date.now() - startedAt, tokens: pruned.promptTokens + outTokens });
    return jsonResponse({
      id: newId("msg_").slice(0, 40),
      type: "message",
      role: "assistant",
      model: body.model || result.model,
      content,
      stop_reason: anthropicStopReason(collected.finishReason, collected.toolCalls.length > 0),
      stop_sequence: null,
      usage: anthropicUsage(upUsage.promptTokenCount || pruned.promptTokens, outTokens)
    }, 200, request, env, headers);
  }

  // ------------------------------ Streaming ------------------------------
  const messageId = newId("msg_").slice(0, 40);
  const heartbeatMs = envInt(env, "HEARTBEAT_MS", 15000, 0, 60000);
  const idleMs = envInt(env, "STREAM_IDLE_TIMEOUT_MS", 90000, 0, 1800000);
  const maxRequestMs = envInt(env, "MAX_REQUEST_MS", 900000, 0, 3600000);
  const heuristicThoughts = envBool(env, "THOUGHT_AFTER_TOOLCALL", true);
  const { response: sseResponse, channel } = openSseStream(request, env, { "x-gateway-version": GATEWAY_VERSION });

  ctx.waitUntil((async () => {
    let stopKeepAlive = startKeepAlive(channel, envInt(env, "CONNECT_HEARTBEAT_MS", 8000, 2000, 60000), "gateway: đang chọn tài khoản...");
    let upstream = null;
    try {
      await channel.comment(`gateway v${GATEWAY_VERSION} • đang kết nối upstream`);
      upstream = await executeUpstream(env, ctx, plan);
      if (stopKeepAlive) { stopKeepAlive(); stopKeepAlive = null; }
      if (!upstream || upstream.error) {
        const payload = upstream && upstream.error ? await upstream.error.json().catch(() => null) : null;
        recordStat({ status: 503, endpoint: "/v1/messages", model: target.upstream, upstreamError: true });
        await anthEvent(channel, "error", {
          type: "error",
          error: { type: "api_error", message: payload?.error?.message || "Toàn bộ tài khoản trong pool đều không phản hồi." }
        });
        return;
      }
    } catch (err) {
      if (stopKeepAlive) { stopKeepAlive(); stopKeepAlive = null; }
      try {
        await anthEvent(channel, "error", { type: "error", error: { type: "api_error", message: err?.message || String(err) } });
      } catch (_) { /* ignore */ }
      return;
    } finally {
      if (stopKeepAlive) stopKeepAlive();
    }
    const served = upstream.model;
    let index = -1;
    let openType = null;        // "text" | "thinking" | "tool_use"
    let hasToolCalls = false;
    let stopReason = "end_turn";
    let completionTokens = 0;
    const closeBlock = async () => {
      if (openType == null) return;
      await anthEvent(channel, "content_block_stop", { type: "content_block_stop", index });
      openType = null;
    };
    const openBlock = async (type, block) => {
      await closeBlock();
      index++;
      openType = type;
      await anthEvent(channel, "content_block_start", { type: "content_block_start", index, content_block: block });
    };
    try {
      await anthEvent(channel, "message_start", {
        type: "message_start",
        message: {
          id: messageId, type: "message", role: "assistant", model: body.model || served,
          content: [], stop_reason: null, stop_sequence: null,
          usage: anthropicUsage(pruned.promptTokens, 0)
        }
      });
      await anthEvent(channel, "ping", { type: "ping" });

      for await (const ev of iterateUpstreamEvents(upstream.upstreamRes, heartbeatMs, idleMs, maxRequestMs)) {
        if (ev === HB || ev?.__heartbeat) {
          await anthEvent(channel, "ping", { type: "ping" });
          continue;
        }
        const { candidate, feedback } = extractResponseObject(ev);
        if (feedback?.blockReason) stopReason = "refusal";
        if (!candidate) continue;
        for (const part of candidate.content?.parts || []) {
          const sig = partSignature(part);
          if (sig) memoryCache.latestSignature = sig;
          const thought = isThoughtPart(part) || (heuristicThoughts && hasToolCalls && !!sig);
          if (part.text) {
            completionTokens += Math.ceil(estimateTokensForText(part.text) * 0.8);
            if (thought) {
              if (openType !== "thinking") await openBlock("thinking", { type: "thinking", thinking: "" });
              await anthEvent(channel, "content_block_delta", { type: "content_block_delta", index, delta: { type: "thinking_delta", thinking: part.text } });
            } else {
              if (openType !== "text") await openBlock("text", { type: "text", text: "" });
              await anthEvent(channel, "content_block_delta", { type: "content_block_delta", index, delta: { type: "text_delta", text: part.text } });
            }
          }
          if (part.functionCall) {
            hasToolCalls = true;
            stopReason = "tool_use";
            const realName = String(part.functionCall.name || "tool").replace(/_ide$/, "");
            const callId = part.functionCall.id || newId("toolu_").slice(0, 18);
            const argsStr = JSON.stringify(part.functionCall.args || {});
            completionTokens += 10 + Math.ceil(estimateTokensForText(argsStr) * 0.8);
            rememberSignature(env, ctx, callId, sig || memoryCache.latestSignature);
            await openBlock("tool_use", { type: "tool_use", id: callId, name: realName, input: {} });
            await anthEvent(channel, "content_block_delta", { type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: argsStr } });
            await closeBlock();
          }
        }
        if (candidate.finishReason) {
          stopReason = anthropicStopReason(candidate.finishReason, hasToolCalls);
        }
      }
      await closeBlock();
      if (index < 0) {
        await openBlock("text", { type: "text", text: "" });
        await closeBlock();
      }
      await anthEvent(channel, "message_delta", {
        type: "message_delta",
        delta: { stop_reason: stopReason, stop_sequence: null },
        usage: { output_tokens: Math.max(completionTokens, 1) }
      });
      await anthEvent(channel, "message_stop", { type: "message_stop" });
      recordStat({
        status: 200, endpoint: "/v1/messages", model: served, account: upstream.account.id,
        latencyMs: Date.now() - startedAt, promptTokens: pruned.promptTokens, completionTokens: Math.max(completionTokens, 1)
      });
      logEvent(env, { level: "info", path: "/v1/messages", model: served, account: maskEmail(upstream.account.email), status: 200, ms: Date.now() - startedAt, stream: true });
    } catch (err) {
      console.error("[Messages Stream Error]", err);
      logEvent(env, { level: "error", path: "/v1/messages", message: err?.message || String(err) });
      try {
        await anthEvent(channel, "error", { type: "error", error: { type: "api_error", message: err?.message || String(err) } });
      } catch (_) { /* ignore */ }
    } finally {
      await channel.close();
    }
  })());

  return sseResponse;
}

async function handleCountTokens(request, env) {
  let body;
  try {
    body = await readJsonBody(request, 10485760);
  } catch (err) {
    return anthropicError(`Body JSON không hợp lệ: ${err?.message || err}`, 400, "invalid_request_error", request, env);
  }
  if (!body || typeof body !== "object") return anthropicError("Body JSON không hợp lệ.", 400, "invalid_request_error", request, env);
  const normalized = Array.isArray(body.messages) ? normalizeAnthropicBody({ ...body, max_tokens: body.max_tokens || 1024 }, env) : null;
  const tokens = normalized
    ? estimateRequestTokens(normalized.messages.map((m) => ({
      role: m.role,
      content: m.parts?.map((p) => p.text || (p.inlineData ? "[media]" : "")).join(" ") || (m.role === "tool" ? JSON.stringify(m.result || "") : ""),
      tool_calls: m.toolCalls?.length ? m.toolCalls.map((tc) => ({ function: { arguments: JSON.stringify(tc.args || {}) } })) : undefined
    })), normalized.system.join("\n"), normalized.tools)
    : estimateRequestTokens(body.messages || [], body.system, body.tools);
  return jsonResponse({ input_tokens: Math.max(tokens, 1) }, 200, request, env);
}

/* ======================== 80-responses.js ======================== */
/* ============================================================================
 *  PHẦN 10/12 — Endpoint OpenAI Responses API: POST /v1/responses
 * ============================================================================
 */

function responsesStatusFromFinish(finishReason, hasToolCalls) {
  const fr = String(finishReason || "").toUpperCase();
  if (fr === "MAX_TOKENS") return "incomplete";
  if (hasToolCalls) return "completed";
  return "completed";
}
function responsesIncompleteDetails(finishReason) {
  const fr = String(finishReason || "").toUpperCase();
  if (fr === "MAX_TOKENS") return { reason: "max_output_tokens" };
  if (fr === "SAFETY" || fr === "RECITATION" || fr === "PROHIBITED_CONTENT" || fr === "BLOCKLIST" || fr === "SPII") return { reason: "content_filter" };
  return null;
}

async function handleResponsesApi(request, env, ctx) {
  const accounts = await getAccountsList(env);
  if (accounts.length === 0) {
    return openAiError("Chưa có tài khoản nào được kết nối vào Antigravity Pool!", 503, "upstream_error", "no_accounts_configured", request, env);
  }
  let body;
  try {
    body = await readJsonBody(request, envInt(env, "MAX_BODY_BYTES", 26214400, 65536, 104857600));
  } catch (err) {
    return openAiError(`Body yêu cầu không phải JSON hợp lệ: ${err?.message || err}`, err?.status || 400, "invalid_request_error", err?.status || 400, request, env);
  }
  if (!body || typeof body !== "object") return openAiError("Body JSON không hợp lệ.", 400, "invalid_request_error", 400, request, env);
  if (body.input == null && body.previous_response_id == null) {
    return openAiError("Thiếu trường 'input'.", 400, "invalid_request_error", "missing_input", request, env);
  }
  if (body.previous_response_id) {
    // Gateway không lưu trạng thái hội thoại (stateless) — yêu cầu client gửi lại input.
    console.warn("[Responses] previous_response_id bị bỏ qua (gateway stateless).");
  }

  const startedAt = Date.now();
  const models = await getDynamicModels(env);
  const target = resolveModelTarget(body.model, models, env);
  const normalized = normalizeResponsesBody(body, env);
  const fallbackSig = await resolveFallbackSignature(env);
  const pruned = pruneNormalizedMessages(normalized.system, normalized.messages, resolveContextLimit(env), resolveMaxContextMessages(env));
  normalized.messages = pruned.messages;
  const built = buildGeminiContents(normalized, fallbackSig);
  const plan = {
    accounts, request, env,
    requestedModel: target.requested,
    candidateModels: getCandidateModels(env, target.upstream),
    stream: normalized.stream,
    buildPayload: (account, projectId, model) => buildGeminiPayload(normalized, built, model, env, { projectId }),
    repairSignatures: () => {
      for (const item of built.contents) {
        if (item.role !== "model" || !Array.isArray(item.parts)) continue;
        for (const p of item.parts) if (p.functionCall) withSignature(p, DEFAULT_FALLBACK_THOUGHT_SIGNATURE);
      }
    }
  };
  const isStreamRequest = wantsStream(request, body);
  normalized.stream = isStreamRequest;
  plan.stream = isStreamRequest;

  // Không stream: giữ hành vi cũ (lỗi trả về HTTP status đúng chuẩn OpenAI).
  if (!isStreamRequest) {
    const result = await executeUpstream(env, ctx, plan);
    if (result.error) {
      recordStat({ status: result.error.status, endpoint: "/v1/responses", model: target.upstream, latencyMs: Date.now() - startedAt });
      return result.error;
    }
    const headers = gatewayHeaders(result, body.model);
    const responseId = newId("resp_");
    let agData;
    try {
      agData = await withTimeout(result.upstreamRes.json(), envInt(env, "UPSTREAM_TIMEOUT_MS", 120000, 5000, 600000), "đọc JSON upstream");
    } catch (err) {
      return openAiError(`Không đọc được phản hồi upstream: ${err?.message || err}`, 502, "upstream_error", 502, request, env);
    }
    const collected = collectNonStreamResult(agData, (callId, sig) => rememberSignature(env, ctx, callId, sig));
    const output = [];
    const thoughtText = collected.thoughts.map((t) => t.text).join("");
    if (thoughtText) {
      output.push({
        type: "reasoning",
        id: newId("rs_").slice(0, 20),
        summary: [{ type: "summary_text", text: thoughtText }],
        ...(collected.thoughts.find((t) => t.signature)?.signature ? { signature: collected.thoughts.find((t) => t.signature).signature } : {})
      });
    }
    if (collected.blockReason) {
      output.push({
        type: "message", id: newId("msg_").slice(0, 20), status: "completed", role: "assistant",
        content: [{ type: "output_text", text: `[Bị chặn bởi bộ lọc an toàn: ${collected.blockReason}]`, annotations: [] }]
      });
    } else if (collected.text) {
      output.push({
        type: "message", id: newId("msg_").slice(0, 20), status: "completed", role: "assistant",
        content: [{ type: "output_text", text: collected.text, annotations: [] }]
      });
    }
    for (const tc of collected.toolCalls) {
      output.push({
        type: "function_call",
        id: newId("fc_").slice(0, 20),
        call_id: tc.id,
        name: tc.name,
        arguments: tc.arguments,
        status: "completed"
      });
    }
    const upUsage = collected.usage || {};
    const outTokens = upUsage.candidatesTokenCount || Math.max(1, estimateTokensForText(collected.text));
    const payload = {
      id: responseId,
      object: "response",
      created_at: nowSec(),
      status: responsesStatusFromFinish(collected.finishReason, collected.toolCalls.length > 0),
      model: result.model,
      output,
      output_text: collected.text || "",
      incomplete_details: responsesIncompleteDetails(collected.finishReason),
      usage: {
        input_tokens: upUsage.promptTokenCount || pruned.promptTokens,
        output_tokens: outTokens,
        total_tokens: (upUsage.promptTokenCount || pruned.promptTokens) + outTokens
      },
      parallel_tool_calls: normalized.parallel !== false,
      tool_choice: body.tool_choice || "auto",
      error: null,
      metadata: body.metadata || {}
    };
    recordStat({
      status: 200, endpoint: "/v1/responses", model: result.model, account: result.account.id,
      latencyMs: Date.now() - startedAt, promptTokens: payload.usage.input_tokens, completionTokens: outTokens
    });
    logEvent(env, { level: "info", path: "/v1/responses", model: result.model, account: maskEmail(result.account.email), status: 200, ms: Date.now() - startedAt, tokens: payload.usage.total_tokens });
    return jsonResponse(payload, 200, request, env, headers);
  }

  // ------------------------------ Streaming ------------------------------
  const heartbeatMs = envInt(env, "HEARTBEAT_MS", 15000, 0, 60000);
  const idleMs = envInt(env, "STREAM_IDLE_TIMEOUT_MS", 90000, 0, 1800000);
  const maxRequestMs = envInt(env, "MAX_REQUEST_MS", 900000, 0, 3600000);
  const heuristicThoughts = envBool(env, "THOUGHT_AFTER_TOOLCALL", true);
  const responseId = newId("resp_");
  const { response: sseResponse, channel } = openSseStream(request, env, { "x-gateway-version": GATEWAY_VERSION });
  let seq = 0;
  const emit = (obj) => channel.event({ ...obj, sequence_number: seq++ });

  ctx.waitUntil((async () => {
    let stopKeepAlive = startKeepAlive(channel, envInt(env, "CONNECT_HEARTBEAT_MS", 8000, 2000, 60000), "gateway: đang chọn tài khoản...");
    let upstream = null;
    try {
      await channel.comment(`gateway v${GATEWAY_VERSION} • đang kết nối upstream`);
      upstream = await executeUpstream(env, ctx, plan);
      if (stopKeepAlive) { stopKeepAlive(); stopKeepAlive = null; }
      if (!upstream || upstream.error) {
        const payload = upstream && upstream.error ? await upstream.error.json().catch(() => null) : null;
        recordStat({ status: 503, endpoint: "/v1/responses", model: target.upstream, upstreamError: true });
        await emit({ type: "error", code: "upstream_error", message: payload?.error?.message || "Toàn bộ tài khoản trong pool đều không phản hồi.", param: null });
        return;
      }
    } catch (err) {
      if (stopKeepAlive) { stopKeepAlive(); stopKeepAlive = null; }
      try { await emit({ type: "error", code: "upstream_error", message: err?.message || String(err), param: null }); } catch (_) { /* ignore */ }
      return;
    } finally {
      if (stopKeepAlive) stopKeepAlive();
    }
    const servedModel = upstream.model;
    const result = upstream;
    let hasToolCalls = false;
    let outputIndex = -1;
    let msgItemId = null;
    let msgText = "";
    let thoughtItemId = null;
    let thoughtText = "";
    let currentItemType = null; // "message" | "function_call" | "reasoning"
    let completionTokens = 0;
    let finishReason = "";

    const baseResponse = () => ({
      id: responseId, object: "response", created_at: nowSec(), model: servedModel,
      status: "in_progress", output: [], usage: null, error: null, incomplete_details: null
    });
    try {
      await emit({ type: "response.created", response: baseResponse() });
      await emit({ type: "response.in_progress", response: baseResponse() });

      const closeItem = async () => {
        if (currentItemType === "message" && msgItemId) {
          await emit({
            type: "response.output_item.done",
            output_index: outputIndex,
            item: { type: "message", id: msgItemId, status: "completed", role: "assistant", content: [{ type: "output_text", text: msgText, annotations: [] }] }
          });
        } else if (currentItemType === "reasoning" && thoughtItemId) {
          await emit({
            type: "response.output_item.done",
            output_index: outputIndex,
            item: { type: "reasoning", id: thoughtItemId, summary: [{ type: "summary_text", text: thoughtText }] }
          });
        }
        currentItemType = null;
      };
      const openMessage = async () => {
        await closeItem();
        outputIndex++;
        msgItemId = newId("msg_").slice(0, 20);
        msgText = "";
        currentItemType = "message";
        await emit({
          type: "response.output_item.added",
          output_index: outputIndex,
          item: { type: "message", id: msgItemId, status: "in_progress", role: "assistant", content: [] }
        });
        await emit({
          type: "response.content_part.added",
          item_id: msgItemId, output_index: outputIndex, content_index: 0,
          part: { type: "output_text", text: "", annotations: [] }
        });
      };
      const openReasoning = async () => {
        await closeItem();
        outputIndex++;
        thoughtItemId = newId("rs_").slice(0, 20);
        thoughtText = "";
        currentItemType = "reasoning";
        await emit({
          type: "response.output_item.added",
          output_index: outputIndex,
          item: { type: "reasoning", id: thoughtItemId, summary: [] }
        });
      };

      for await (const ev of iterateUpstreamEvents(result.upstreamRes, heartbeatMs, idleMs, maxRequestMs)) {
        if (ev === HB || ev?.__heartbeat) {
          await channel.comment("keep-alive");
          continue;
        }
        const { candidate, feedback } = extractResponseObject(ev);
        if (feedback?.blockReason) finishReason = "SAFETY";
        if (!candidate) continue;
        for (const part of candidate.content?.parts || []) {
          const sig = partSignature(part);
          if (sig) memoryCache.latestSignature = sig;
          const thought = isThoughtPart(part) || (heuristicThoughts && hasToolCalls && !!sig);
          if (part.text) {
            completionTokens += Math.ceil(estimateTokensForText(part.text) * 0.8);
            if (thought) {
              if (currentItemType !== "reasoning") await openReasoning();
              thoughtText += part.text;
              await emit({ type: "response.reasoning_summary_text.delta", item_id: thoughtItemId, output_index: outputIndex, summary_index: 0, delta: part.text });
            } else {
              if (currentItemType !== "message") await openMessage();
              msgText += part.text;
              await emit({
                type: "response.output_text.delta",
                item_id: msgItemId, output_index: outputIndex, content_index: 0, delta: part.text
              });
            }
          }
          if (part.functionCall) {
            hasToolCalls = true;
            const realName = String(part.functionCall.name || "tool").replace(/_ide$/, "");
            const callId = part.functionCall.id || newId("call_").slice(0, 13);
            const argsStr = JSON.stringify(part.functionCall.args || {});
            completionTokens += 10 + Math.ceil(estimateTokensForText(argsStr) * 0.8);
            rememberSignature(env, ctx, callId, sig || memoryCache.latestSignature);
            await closeItem();
            outputIndex++;
            currentItemType = "function_call";
            const fcItemId = newId("fc_").slice(0, 20);
            await emit({
              type: "response.output_item.added",
              output_index: outputIndex,
              item: { type: "function_call", id: fcItemId, call_id: callId, name: realName, arguments: "", status: "in_progress" }
            });
            await emit({
              type: "response.function_call_arguments.delta",
              item_id: fcItemId, output_index: outputIndex, delta: argsStr
            });
            await emit({
              type: "response.function_call_arguments.done",
              item_id: fcItemId, output_index: outputIndex, arguments: argsStr
            });
            await emit({
              type: "response.output_item.done",
              output_index: outputIndex,
              item: { type: "function_call", id: fcItemId, call_id: callId, name: realName, arguments: argsStr, status: "completed" }
            });
            currentItemType = null;
          }
        }
        if (candidate.finishReason) finishReason = String(candidate.finishReason).toUpperCase();
      }
      if (currentItemType === "message") {
        await emit({ type: "response.output_text.done", item_id: msgItemId, output_index: outputIndex, content_index: 0, text: msgText });
        await emit({ type: "response.content_part.done", item_id: msgItemId, output_index: outputIndex, content_index: 0, part: { type: "output_text", text: msgText, annotations: [] } });
      }
      await closeItem();
      const outputTokens = Math.max(completionTokens, 1);
      await emit({
        type: "response.completed",
        response: {
          ...baseResponse(),
          status: responsesStatusFromFinish(finishReason, hasToolCalls),
          incomplete_details: responsesIncompleteDetails(finishReason),
          output: [],
          output_text: msgText,
          usage: { input_tokens: pruned.promptTokens, output_tokens: outputTokens, total_tokens: pruned.promptTokens + outputTokens }
        }
      });
      recordStat({
        status: 200, endpoint: "/v1/responses", model: servedModel, account: result.account.id,
        latencyMs: Date.now() - startedAt, promptTokens: pruned.promptTokens, completionTokens: outputTokens
      });
      logEvent(env, { level: "info", path: "/v1/responses", model: servedModel, account: maskEmail(result.account.email), status: 200, ms: Date.now() - startedAt, stream: true });
    } catch (err) {
      console.error("[Responses Stream Error]", err);
      logEvent(env, { level: "error", path: "/v1/responses", message: err?.message || String(err) });
      try {
        await emit({ type: "error", code: "upstream_error", message: err?.message || String(err), param: null });
      } catch (_) { /* ignore */ }
    } finally {
      await channel.close();
    }
  })());

  return sseResponse;
}

/* ======================== 85-admin.js ======================== */
/* ============================================================================
 *  PHẦN 11/12 — API quản trị: đăng nhập, tài khoản, đổi key, liên kết Google
 * ============================================================================
 */

// Trả JSON kèm nhiều Set-Cookie: phải dùng đối tượng Headers (Object.fromEntries
// sẽ gộp 3 Set-Cookie thành 1 chuỗi hỏng -> trình duyệt không nhận cookie phiên).
function jsonWithCookie(payload, status, request, env, sessionHeader) {
  const headers = authCookieHeaders(sessionHeader);
  for (const [k, v] of Object.entries(corsHeaders(request, env))) headers.set(k, v);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { status, headers });
}

async function handleLogin(request, env) {
  let body;
  try {
    body = await readJsonBody(request, 4096);
  } catch (_) {
    body = null;
  }
  const key = String(body?.key || "").trim();
  const ip = clientIp(request);
  if (!rateLimitIp(ip)) {
    return jsonResponse({ success: false, error: "Quá nhiều lần thử sai. Vui lòng thử lại sau." }, 429, request, env, { "retry-after": "60" });
  }
  if (!key) {
    recordAuthFailure("empty", ip);
    return jsonResponse({ success: false, error: "Vui lòng nhập API Key." }, 400, request, env);
  }
  const allowedKeys = await getAllowedApiKeys(env);
  if (allowedKeys.length === 0) {
    return jsonResponse({ success: false, error: "Gateway chưa được cấu hình API Key (env.API_KEY / env.API_KEYS)." }, 503, request, env);
  }
  const ok = allowedKeys.some((k) => timingSafeEqualStrings(k, key));
  if (!ok) {
    recordAuthFailure(key, ip);
    return jsonResponse({ success: false, error: "API Key không chính xác!" }, 401, request, env);
  }
  const session = await buildSessionCookie(key);
  logEvent(env, { level: "info", path: "/api/auth/login", message: "Đăng nhập dashboard thành công", ip });
  // authCookieHeaders: đặt cookie phiên mới + xoá cookie cũ gateway_key
  return jsonWithCookie({ success: true, expiresInSec: SESSION_TTL_SEC }, 200, request, env, session.header);
}
function handleLogout(request, env) {
  const headers = authCookieHeaders(null);
  headers.set("Location", "/");
  for (const [k, v] of Object.entries(corsHeaders(request, env))) headers.set(k, v);
  return new Response(null, { status: 302, headers });
}

// ------------------------------ Liên kết tài khoản Google ---------------------
async function handleExchangeCode(request, env, ctx) {
  if (!env.ANTIGRAVITY_KV) {
    return jsonResponse({ success: false, error: "Chưa cấu hình ANTIGRAVITY_KV!" }, 500, request, env);
  }
  let body;
  try {
    body = await readJsonBody(request, 65536);
  } catch (err) {
    return jsonResponse({ success: false, error: `Body không hợp lệ: ${err?.message || err}` }, 400, request, env);
  }
  let code = String(body?.callbackUrl || body?.code || "").trim();
  if (!code) {
    return jsonResponse({ success: false, error: "Không tìm thấy mã code trong chuỗi đã nhập!" }, 400, request, env);
  }
  if (code.includes("code=") || code.startsWith("http")) {
    try {
      const url = new URL(code);
      code = url.searchParams.get("code") || code;
    } catch (_) {
      const match = code.match(/[?&]code=([^&\s]+)/);
      if (match) code = decodeURIComponent(match[1]);
    }
  }
  code = code.replace(/^code=/, "").trim();
  if (!code) {
    return jsonResponse({ success: false, error: "Không tìm thấy mã code trong chuỗi đã nhập!" }, 400, request, env);
  }

  // 1) Đổi authorization code lấy token
  const tokenRes = await fetch(CONFIG.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CONFIG.clientId,
      client_secret: CONFIG.clientSecret,
      code,
      redirect_uri: CONFIG.redirectUri
    }),
    signal: timeoutSignal(60000)
  });
  const tokens = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokens.access_token) {
    return jsonResponse({
      success: false,
      error: tokens.error_description || tokens.error || `Đổi code thất bại (HTTP ${tokenRes.status}). Code có thể đã hết hạn hoặc dùng rồi.`
    }, 400, request, env);
  }

  // 2) Lấy / tạo project trên Cloud Code
  const metadata = { ideType: 9, platform: 1, pluginType: 2 };
  let projectId = null;
  try {
    const loadRes = await fetch(CONFIG.loadCodeAssistUrl, {
      method: "POST",
      headers: upstreamHeaders(env, tokens.access_token),
      body: JSON.stringify({ metadata }),
      signal: timeoutSignal(60000)
    });
    const loadData = await loadRes.json().catch(() => ({}));
    if (!loadRes.ok) {
      console.warn("[Exchange] loadCodeAssist lỗi:", loadRes.status, JSON.stringify(loadData).slice(0, 300));
    }
    projectId = loadData.cloudaicompanionProject;
    if (projectId && typeof projectId === "object") projectId = projectId.id || projectId.name || null;
    if (!projectId) {
      const onboardRes = await fetch(CONFIG.onboardUserUrl, {
        method: "POST",
        headers: upstreamHeaders(env, tokens.access_token),
        body: JSON.stringify({ tierId: "legacy-tier", metadata }),
        signal: timeoutSignal(60000)
      });
      const onboardData = await onboardRes.json().catch(() => ({}));
      const respProj = onboardData.response?.cloudaicompanionProject;
      projectId = (respProj && typeof respProj === "object" ? respProj.id : respProj) || "default";
    }
  } catch (err) {
    console.warn("[Exchange] Không lấy được project, dùng 'default':", err?.message);
    projectId = projectId || "default";
  }

  // 3) Lưu tài khoản (dedupe theo email, giữ nguyên id cũ)
  const email = decodeJwtEmail(tokens.id_token) || `Tài khoản ${Date.now()}`;
  const accounts = await getAccountsList(env, true);
  const existingIdx = accounts.findIndex((a) => a.email === email);
  const existing = existingIdx !== -1 ? accounts[existingIdx] : null;
  let refreshToken = tokens.refresh_token || existing?.refreshToken || null;
  if (!refreshToken) {
    return jsonResponse({
      success: false,
      error: "Google không trả về refresh_token. Hãy xoá quyền truy cập cũ tại https://myaccount.google.com/permissions rồi thử đăng nhập lại (nút 'Đăng nhập Google' đã bật prompt=consent)."
    }, 400, request, env);
  }
  const accountItem = {
    id: existing?.id || `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    email,
    projectId: projectId || existing?.projectId || "aicode-consumers",
    accessToken: tokens.access_token,
    refreshToken,
    expiresAt: Date.now() + (Number(tokens.expires_in || 3600) - 300) * 1000,
    createdAt: existing?.createdAt || Date.now(),
    isRateLimited: false,
    rateLimitExpiresAt: 0
  };
  try {
    await saveAccount(env, accountItem);
  } catch (err) {
    return jsonResponse({ success: false, error: err?.message || "Không lưu được tài khoản vào KV." }, 500, request, env);
  }
  invalidateAccountsCache();
  await getDynamicModels(env, true).catch(() => null);
  logEvent(env, { level: "info", path: "/api/auth/exchange", message: `Đã liên kết tài khoản ${maskEmail(email)}` });
  // Không bao giờ trả token về trình duyệt.
  return jsonResponse({
    success: true,
    account: { id: accountItem.id, email: accountItem.email, projectId: accountItem.projectId },
    totalAccounts: (await getAccountsList(env, true)).length
  }, 200, request, env);
}

// ------------------------------ Tài khoản ------------------------------------
async function handleGetAccounts(request, env) {
  const accounts = await getAccountsList(env);
  const now = Date.now();
  const safeAccounts = accounts.map((a) => {
    const cached = memoryCache.usageCache.get(a.id);
    const cooling = isAccountCoolingDown(a, now);
    return {
      id: a.id,
      email: a.email,
      projectId: a.projectId,
      expiresAt: a.expiresAt || 0,
      isExpired: !!a.expiresAt && now > a.expiresAt,
      hasRefreshToken: !!a.refreshToken,
      isRateLimited: cooling,
      rateLimitExpiresAt: cooling ? (a.rateLimitExpiresAt || cached?.rateLimitExpiresAt || 0) : 0,
      cooldownReason: cooling ? (a.cooldownReason || cached?.cooldownReason || "") : "",
      quotaError: cached?.error || null,
      createdAt: a.createdAt || 0
    };
  });
  return jsonResponse({ success: true, accounts: safeAccounts, count: safeAccounts.length }, 200, request, env);
}
async function handleDeleteAccount(request, env, id) {
  if (!id) return jsonResponse({ success: false, error: "Thiếu id tài khoản." }, 400, request, env);
  try {
    const list = await removeAccount(env, id);
    logEvent(env, { level: "info", path: "/api/accounts", message: `Đã xoá tài khoản ${id}` });
    return jsonResponse({ success: true, remaining: list.length }, 200, request, env);
  } catch (err) {
    return jsonResponse({ success: false, error: err?.message || String(err) }, 500, request, env);
  }
}
async function handleResetCooldown(request, env, id) {
  const accounts = await getAccountsList(env, true);
  const acc = accounts.find((a) => a.id === id);
  if (!acc) return jsonResponse({ success: false, error: "Không tìm thấy tài khoản." }, 404, request, env);
  await clearAccountCooldown(env, acc);
  logEvent(env, { level: "info", path: "/api/accounts/reset", message: `Đã xoá cooldown cho ${maskEmail(acc.email)}` });
  return jsonResponse({ success: true, account: { id: acc.id, email: acc.email, isRateLimited: false } }, 200, request, env);
}
// Kiểm tra sức khỏe tài khoản: refresh token + gọi quota upstream.
async function handleTestAccount(request, env, id) {
  const accounts = await getAccountsList(env, true);
  const acc = accounts.find((a) => a.id === id);
  if (!acc) return jsonResponse({ success: false, error: "Không tìm thấy tài khoản." }, 404, request, env);
  const startedAt = Date.now();
  try {
    const { accessToken } = await getValidTokenForAccount(env, acc, true);
    if (!accessToken) throw new Error("Không lấy được access token.");
    const quota = await getAccountQuota(env, acc, true);
    const ok = !quota.error;
    logEvent(env, {
      level: ok ? "info" : "warn", path: "/api/accounts/test",
      message: `Test ${maskEmail(acc.email)}: ${ok ? "OK" : quota.error}`
    });
    return jsonResponse({
      success: ok,
      latencyMs: Date.now() - startedAt,
      account: { id: acc.id, email: acc.email, projectId: acc.projectId },
      quota: ok ? {
        groups: quota.groups,
        lowestRemaining: quota.lowestRemaining,
        nextResetMs: quota.nextResetMs
      } : null,
      error: quota.error || null
    }, 200, request, env);
  } catch (err) {
    return jsonResponse({ success: false, error: err?.message || String(err), latencyMs: Date.now() - startedAt }, 200, request, env);
  }
}
async function handleExportAccounts(request, env) {
  const accounts = await getAccountsList(env);
  return jsonResponse({
    success: true,
    warning: "Tệp này chứa refresh token — hãy lưu ở nơi an toàn và không chia sẻ.",
    exportedAt: new Date().toISOString(),
    version: GATEWAY_VERSION,
    accounts: accounts.map((a) => sanitizeAccountRecord(a))
  }, 200, request, env);
}
async function handleImportAccounts(request, env) {
  if (!env.ANTIGRAVITY_KV) return jsonResponse({ success: false, error: "Chưa cấu hình ANTIGRAVITY_KV!" }, 500, request, env);
  let body;
  try {
    body = await readJsonBody(request, 1048576);
  } catch (err) {
    return jsonResponse({ success: false, error: `Body không hợp lệ: ${err?.message || err}` }, 400, request, env);
  }
  const incoming = Array.isArray(body?.accounts) ? body.accounts : [];
  if (!incoming.length) return jsonResponse({ success: false, error: "Thiếu danh sách 'accounts'." }, 400, request, env);
  const existing = await getAccountsList(env, true);
  const byEmail = new Map(existing.map((a) => [a.email, a]));
  let added = 0, updated = 0;
  for (const raw of incoming) {
    const email = String(raw?.email || "").trim();
    const token = String(raw?.refreshToken || "").trim();
    if (!email || !token) continue;
    const cur = byEmail.get(email);
    const item = {
      id: cur?.id || raw.id || `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email,
      projectId: raw.projectId || cur?.projectId || "aicode-consumers",
      accessToken: raw.accessToken || cur?.accessToken || "",
      refreshToken: token,
      expiresAt: Number.isFinite(raw.expiresAt) ? raw.expiresAt : (cur?.expiresAt || 0),
      createdAt: cur?.createdAt || raw.createdAt || Date.now(),
      isRateLimited: false,
      rateLimitExpiresAt: 0
    };
    try {
      await saveAccount(env, item);
      if (cur) updated++; else added++;
      byEmail.set(email, item);
    } catch (_) { /* bỏ qua bản ghi lỗi */ }
  }
  invalidateAccountsCache();
  const list = await getAccountsList(env, true);
  return jsonResponse({ success: true, added, updated, total: list.length }, 200, request, env);
}

// ------------------------------ Kiểm tra toàn hệ thống -----------------------
// Chạy thật qua toàn bộ pipeline (OAuth refresh -> sync model -> chat -> quota)
// để biết gateway có "sống" với model Antigravity hay không. Tốn 1-2 request
// thật lên Google nên chỉ gọi khi cần.
async function handleSelfTest(request, env, ctx, url) {
  const startedAt = Date.now();
  const model = url.searchParams.get("model") || "gemini-3.8-flash-high";
  const wantStream = url.searchParams.get("stream") === "1";
  const report = {
    version: GATEWAY_VERSION,
    clientVersion: clientVersion(env),
    kv: !!env.ANTIGRAVITY_KV,
    model,
    steps: []
  };
  const accounts = await getAccountsList(env, true);
  report.accounts = accounts.length;
  if (accounts.length === 0) {
    report.ok = false;
    report.error = "Chưa có tài khoản nào trong pool — hãy liên kết tài khoản Google trước.";
    return jsonResponse({ success: false, ...report }, 200, request, env);
  }
  const ranked = getRankedAccounts(env, accounts, model, ctx);
  const account = ranked[0];
  report.account = maskEmail(account.email);

  // 1) Refresh token (force) — đây là bước hay hỏng nhất khi tài khoản bị thu hồi
  try {
    const t0 = Date.now();
    const tok = await getValidTokenForAccount(env, account, true);
    report.projectId = tok?.projectId || null;
    report.steps.push({ step: "oauth_token", ok: !!tok?.accessToken, ms: Date.now() - t0, projectId: tok?.projectId || null });
  } catch (err) {
    report.steps.push({ step: "oauth_token", ok: false, error: err?.message || String(err) });
  }

  // 2) Đồng bộ danh sách model + định tuyến tên model client gửi lên
  try {
    const t0 = Date.now();
    const models = await getDynamicModels(env, true);
    const target = resolveModelTarget(model, models, env);
    report.routedTo = target.upstream;
    report.steps.push({
      step: "models_sync", ok: models.length > 0, ms: Date.now() - t0,
      count: models.length, routedTo: target.upstream,
      requestedAvailable: models.some((m) => m.id === model)
    });
  } catch (err) {
    report.steps.push({ step: "models_sync", ok: false, error: err?.message || String(err) });
  }

  const callChat = async (payload) => {
    const u = new URL(request.url);
    u.pathname = "/v1/chat/completions";
    u.search = "";
    return await handleChatCompletions(new Request(u.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }), env, ctx);
  };

  // 3) Chat thật (non-stream)
  try {
    const t0 = Date.now();
    const res = await callChat({
      model,
      messages: [{ role: "user", content: "Trả lời đúng một từ: pong" }],
      max_tokens: 32,
      stream: false
    });
    const data = await res.json().catch(() => ({}));
    const answer = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.name ?? null;
    report.steps.push({
      step: "chat.completions",
      ok: res.status === 200 && !!answer,
      status: res.status,
      ms: Date.now() - t0,
      servedModel: data?.model || null,
      downgraded: res.headers.get("x-gateway-downgraded") === "true",
      attempts: res.headers.get("x-gateway-attempts"),
      answer: typeof answer === "string" ? answer.slice(0, 160) : null,
      error: res.status === 200 ? null : (data?.error?.message || "unknown")
    });
  } catch (err) {
    report.steps.push({ step: "chat.completions", ok: false, error: err?.message || String(err) });
  }

  // 4) Chat streaming (tuỳ chọn) — kiểm tra SSE + [DONE] + heartbeat
  if (wantStream) {
    try {
      const t0 = Date.now();
      const res = await callChat({ model, messages: [{ role: "user", content: "Đếm từ 1 đến 3" }], max_tokens: 64, stream: true });
      const text = await res.text();
      const deltas = (text.match(/"content":"/g) || []).length;
      report.steps.push({
        step: "chat.stream", ok: res.status === 200 && text.trim().endsWith("data: [DONE]"),
        status: res.status, ms: Date.now() - t0, textChunks: deltas,
        hasFinishReason: /"finish_reason":"[a-z_]+"/.test(text),
        hasToolCalls: text.includes('"tool_calls"')
      });
    } catch (err) {
      report.steps.push({ step: "chat.stream", ok: false, error: err?.message || String(err) });
    }
  }

  // 5) Quota — biết luôn tài khoản còn bao nhiêu hạn mức
  try {
    const quota = await getAccountQuota(env, account, true, ctx);
    report.steps.push({
      step: "quota", ok: !quota.error,
      lowestRemaining: quota.lowestRemaining, nextResetMs: quota.nextResetMs,
      groups: (quota.groups || []).map((g) => g.name),
      error: quota.error || null
    });
  } catch (err) {
    report.steps.push({ step: "quota", ok: false, error: err?.message || String(err) });
  }

  const critical = report.steps.filter((s) => s.step === "oauth_token" || s.step === "chat.completions");
  report.ok = critical.length > 0 && critical.every((s) => s.ok);
  report.totalMs = Date.now() - startedAt;
  recordStat({ status: report.ok ? 200 : 503, endpoint: "/api/selftest" });
  logEvent(env, {
    level: report.ok ? "info" : "warn", path: "/api/selftest",
    message: report.ok ? `Self-test OK (${report.totalMs}ms, model ${model})` : "Self-test THẤT BẠI",
    ...(report.ok ? {} : { error: JSON.stringify(report.steps.filter((s) => !s.ok)).slice(0, 400) })
  });
  return jsonResponse({ success: report.ok, ...report }, 200, request, env);
}

// ------------------------------ Đổi API Key ----------------------------------
async function handleUpdateApiKey(request, env) {
  if (!env.ANTIGRAVITY_KV) {
    return jsonResponse({ success: false, error: "Chưa cấu hình ANTIGRAVITY_KV!" }, 500, request, env);
  }
  let body;
  try {
    body = await readJsonBody(request, 4096);
  } catch (err) {
    return jsonResponse({ success: false, error: `Body không hợp lệ: ${err?.message || err}` }, 400, request, env);
  }
  if (body?.resetToEnv) {
    await env.ANTIGRAVITY_KV.delete("custom_api_key").catch(() => {});
    memoryCache.allowedKeysOverride = null;
    memoryCache.cachedApiKey = null;
    memoryCache.apiKeyLoadedAt = 0;
    resetAuthState();
    logEvent(env, { level: "info", path: "/api/key/update", message: "Đã xoá key KV, quay về dùng env.API_KEY" });
    return jsonWithCookie({ success: true, message: "Đã xoá API Key trong KV — gateway quay về dùng biến môi trường API_KEY." }, 200, request, env, null);
  }
  const trimmed = String(body?.newApiKey || "").trim();
  if (!trimmed || trimmed.length < 8) {
    return jsonResponse({ success: false, error: "API Key mới phải có ít nhất 8 ký tự!" }, 400, request, env);
  }
  const ok = await safeKvPut(env.ANTIGRAVITY_KV, "custom_api_key", trimmed);
  if (!ok) {
    return jsonResponse({
      success: false,
      error: "Không ghi được key mới xuống KV (có thể đã chạm quota 1000 write/ngày). Key cũ vẫn đang hoạt động."
    }, 503, request, env);
  }
  // Override 5 phút cho isolate hiện tại + xoá session cũ để buộc đăng nhập lại.
  memoryCache.allowedKeysOverride = [trimmed];
  memoryCache.allowedKeysOverrideAt = Date.now();
  memoryCache.cachedApiKey = trimmed;
  memoryCache.apiKeyLoadedAt = Date.now();
  resetAuthState();
  const session = await buildSessionCookie(trimmed);
  logEvent(env, { level: "info", path: "/api/key/update", message: `Đã đổi API Key (${maskKey(trimmed)})` });
  return jsonWithCookie({
    success: true,
    message: "Đã cập nhật API Key. Lưu ý: biến môi trường API_KEY trong Cloudflare vẫn được chấp nhận cho tới khi bạn xoá nó — hãy xoá/sửa trong Dashboard để khóa cũ hết hiệu lực.",
    maskedKey: maskKey(trimmed)
  }, 200, request, env, session.header);
}

/* ======================== 90-dashboard.js ======================== */
/* ============================================================================
 *  PHẦN 12/12 — Giao diện: trang đăng nhập & dashboard quản trị
 * ============================================================================
 */

var DASHBOARD_CSS = `
  :root {
    --bg:#0b0f19; --card:#151e32; --card2:#0f172a; --border:#24324f;
    --primary:#38bdf8; --text:#f1f5f9; --muted:#94a3b8;
    --green:#10b981; --yellow:#f59e0b; --red:#ef4444;
  }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    background: radial-gradient(1200px 600px at 50% -200px, #14213a 0%, var(--bg) 60%);
    color: var(--text); padding: 24px 16px; margin: 0; min-height: 100vh; display: flex; justify-content: center; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 26px;
    max-width: 900px; width: 100%; box-shadow: 0 18px 50px rgba(0,0,0,.55); }
  h1 { font-size: 22px; margin: 0 0 4px 0; color: var(--primary); }
  h2 { font-size: 15px; margin: 0; }
  p { color: var(--muted); font-size: 13px; line-height: 1.6; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .spread { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
  .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 9999px;
    font-size: 12px; font-weight: 600; border: 1px solid transparent; }
  .badge-online { background: #064e3b; color: #6ee7b7; border-color: #059669; }
  .badge-offline { background: #7f1d1d; color: #fca5a5; border-color: #dc2626; }
  .badge-info { background: rgba(56,189,248,.12); color: var(--primary); border-color: rgba(56,189,248,.3); }
  .box { background: rgba(11,15,25,.55); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin: 12px 0; }
  .box-title { font-weight: 600; font-size: 14px; color: #e2e8f0; margin-bottom: 10px;
    display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
  button.btn, a.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    background: #0284c7; color: #fff; padding: 9px 15px; border-radius: 9px; text-decoration: none;
    border: none; cursor: pointer; font-weight: 600; font-size: 13px; transition: .15s; white-space: nowrap; }
  button.btn:hover, a.btn:hover { background: #0369a1; }
  button.btn-sm { padding: 5px 10px; font-size: 12px; background: #334155; }
  button.btn-sm:hover { background: #475569; }
  button.btn-danger { background: #991b1b; } button.btn-danger:hover { background: #b91c1c; }
  button.btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--muted); }
  button.btn-ghost:hover { background: #1e293b; color: #fff; }
  input[type=text], input[type=password], select, textarea { width: 100%; padding: 10px 12px; background: var(--card2);
    border: 1px solid var(--border); color: #f8fafc; border-radius: 9px; font-size: 13px; outline: none; font-family: inherit; }
  input:focus, select:focus, textarea:focus { border-color: var(--primary); }
  code { background: #1e293b; padding: 2px 6px; border-radius: 5px; color: #fbbf24; font-family: ui-monospace, monospace; }
  pre { background: #080c15; border: 1px solid var(--border); padding: 12px; border-radius: 9px;
    overflow-x: auto; color: #bae6fd; font-size: 12px; margin: 8px 0 0 0; font-family: ui-monospace, monospace; }
  .tabs { display: flex; align-items: center; gap: 8px; margin: 16px 0 6px; overflow-x: auto; padding-bottom: 4px; }
  .tab { background: var(--card2); border: 1px solid var(--border); color: var(--muted); padding: 8px 14px;
    border-radius: 9px; cursor: pointer; font-size: 13px; font-weight: 600; white-space: nowrap; }
  .tab:hover { background: #1e293b; color: #fff; }
  .tab.active { background: #0284c7; color: #fff; border-color: var(--primary); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
  .qbox { background: var(--card2); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
  .qname { font-weight: 600; font-size: 13px; color: var(--primary); margin-bottom: 8px; }
  .qmetric { margin-bottom: 9px; }
  .qlabel { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-bottom: 3px; }
  .bar { background: #1e293b; border-radius: 99px; height: 7px; overflow: hidden; }
  .bar > i { display: block; height: 100%; border-radius: 99px; transition: width .5s; }
  .small { font-size: 11px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; color: var(--muted); font-weight: 600; padding: 8px 6px; border-bottom: 1px solid var(--border); }
  td { padding: 9px 6px; border-bottom: 1px solid #1e293b; vertical-align: middle; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag { background: #1e293b; border: 1px solid var(--border); padding: 3px 8px; border-radius: 6px;
    font-size: 11px; color: #7dd3fc; font-family: ui-monospace, monospace; }
  .msg { font-weight: 600; font-size: 13px; margin-top: 8px; min-height: 18px; }
  .muted { color: var(--muted); }
  .ok { color: var(--green); } .err { color: var(--red); } .warn { color: var(--yellow); }
  details > summary { cursor: pointer; color: var(--muted); font-size: 13px; }
  .kv { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px dashed #1e293b; }
  .center { text-align: center; }
  .login-card { max-width: 440px; text-align: center; }
`;

function renderLoginScreen(request, env) {
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Đăng nhập • Antigravity Gateway</title>
<style>${DASHBOARD_CSS}</style>
</head>
<body>
  <div class="card login-card">
    <div style="font-size:42px">🔐</div>
    <div class="badge badge-info" style="margin-bottom:12px">🛡️ Gateway Protected • v${GATEWAY_VERSION}</div>
    <h1>Cổng Quản Trị Antigravity</h1>
    <p>Dashboard đã được khóa để bảo vệ tài khoản và hạn ngạch. Vui lòng nhập API Key để truy cập.</p>
    <div id="err" class="msg err" style="display:none"></div>
    <input type="password" id="keyInput" placeholder="Nhập API Key (sk-ag-...)" autofocus />
    <button class="btn" id="submitBtn" style="width:100%;margin-top:12px">🔓 Mở Khóa Dashboard</button>
    <p class="small" style="margin-top:14px">Phiên đăng nhập dùng cookie HttpOnly có chữ ký HMAC — API Key không được lưu trong trình duyệt.</p>
  </div>
<script>
(function () {
  var btn = document.getElementById('submitBtn');
  var input = document.getElementById('keyInput');
  var err = document.getElementById('err');
  function showErr(text) { err.innerText = '❌ ' + text; err.style.display = 'block'; }
  async function login() {
    var key = (input.value || '').trim();
    if (!key) return;
    btn.disabled = true; btn.innerText = '⏳ Đang kiểm tra...'; err.style.display = 'none';
    try {
      var res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ key: key })
      });
      var data = await res.json().catch(function () { return {}; });
      if (res.ok && data.success) { location.href = '/'; return; }
      showErr(data.error || 'API Key không chính xác!');
    } catch (e) {
      showErr('Lỗi kết nối tới Gateway: ' + e.message);
    }
    btn.disabled = false; btn.innerText = '🔓 Mở Khóa Dashboard';
  }
  btn.addEventListener('click', login);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') login(); });
})();
<\/script>
</body>
</html>`;
  return htmlResponse(html, request, env);
}

// Hàm này được stringify rồi nhúng vào trang — KHÔNG tham chiếu biến bên ngoài.
function dashboardClient(boot) {
  var state = { accountId: (boot.accounts[0] && boot.accounts[0].id) || "", quota: {}, timers: {} };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  };
  function barColor(p) { return p > 50 ? "#10b981" : (p > 20 ? "#f59e0b" : "#ef4444"); }
  function fmtCountdown(ms) {
    if (!isFinite(ms) || ms == null || ms <= 0) return "--";
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return d + "d " + h + "h";
    if (h > 0) return h + "h " + m + "m";
    if (m > 0) return m + "m " + (s % 60) + "s";
    return s + "s";
  }
  function fmtTime(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return "Hồi: " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " " + d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  }
  async function api(path, opts) {
    var o = opts || {};
    o.credentials = "same-origin";
    o.headers = Object.assign({ "Content-Type": "application/json" }, o.headers || {});
    if (o.body && typeof o.body !== "string") o.body = JSON.stringify(o.body);
    var res = await fetch(path, o);
    var text = await res.text();
    var data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
    return { ok: res.ok, status: res.status, data: data || {} };
  }
  function setMsg(id, text, cls) {
    var el = $(id);
    if (!el) return;
    el.innerText = text || "";
    el.className = "msg " + (cls || "");
  }
  function copyText(text, btn) {
    var done = function () { var old = btn.innerText; btn.innerText = "✅ Đã copy"; setTimeout(function () { btn.innerText = old; }, 1200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); done();
    }
  }

  // ---------------------------- Tabs tài khoản ----------------------------
  function renderTabs() {
    var box = $("tabs");
    if (!box) return;
    var html = "";
    for (var i = 0; i < boot.accounts.length; i++) {
      var a = boot.accounts[i];
      html += '<div class="tab' + (a.id === state.accountId ? " active" : "") + '" data-id="' + esc(a.id) + '">👤 ' + esc(a.email.split("@")[0]) + "</div>";
    }
    html += '<div class="tab" id="addTab" style="border-style:dashed;color:var(--primary)">➕ Thêm tài khoản</div>';
    box.innerHTML = html;
    Array.prototype.forEach.call(box.querySelectorAll(".tab[data-id]"), function (el) {
      el.addEventListener("click", function () { switchAccount(el.getAttribute("data-id")); });
    });
    var addTab = $("addTab");
    if (addTab) addTab.addEventListener("click", function () {
      var box2 = $("addBox");
      box2.style.display = box2.style.display === "none" ? "block" : "none";
      if (box2.style.display === "block") box2.scrollIntoView({ behavior: "smooth" });
    });
  }
  async function switchAccount(id) {
    state.accountId = id;
    renderTabs();
    var acc = boot.accounts.filter(function (a) { return a.id === id; })[0];
    if (acc) $("quotaHeader").innerText = "📊 Hạn ngạch: " + acc.email;
    await loadQuota(id);
  }

  // ---------------------------- Quota -------------------------------------
  function renderQuota(u, fetchedAt) {
    var box = $("quotaBox");
    if (!u) { box.innerHTML = '<div class="muted small">Chưa có dữ liệu quota.</div>'; return; }
    if (u.error) {
      box.innerHTML = '<div class="err small">Lỗi lấy quota: ' + esc(u.error) + '</div>';
      return;
    }
    var groups = Array.isArray(u.groups) ? u.groups.slice() : [];
    if (groups.length === 0) {
      var g = [];
      if (u.gemini && (u.gemini.fiveHour || u.gemini.weekly)) g.push({ name: "✨ Gemini", buckets: [u.gemini.fiveHour, u.gemini.weekly].filter(Boolean) });
      if (u.claude && (u.claude.fiveHour || u.claude.weekly)) g.push({ name: "🎭 Claude & GPT", buckets: [u.claude.fiveHour, u.claude.weekly].filter(Boolean) });
      groups = g;
    }
    if (groups.length === 0) { box.innerHTML = '<div class="muted small">Tài khoản chưa có nhóm hạn ngạch nào.</div>'; return; }
    var html = '<div class="grid">';
    for (var i = 0; i < groups.length; i++) {
      var grp = groups[i];
      html += '<div class="qbox"><div class="qname">' + esc(grp.name) + "</div>";
      for (var j = 0; j < (grp.buckets || []).length; j++) {
        var b = grp.buckets[j];
        var pct = typeof b.remainingPercentage === "number" ? b.remainingPercentage : 0;
        var key = state.accountId + ":" + i + ":" + j;
        state.quota[key] = { pct: pct, resetAt: (b.resetMs != null ? Date.now() + b.resetMs : null) };
        html += '<div class="qmetric">'
          + '<div class="qlabel"><span>' + esc(b.windowLabel || b.window || "hạn mức") + '</span><b style="color:' + barColor(pct) + '">' + pct + "%</b></div>"
          + '<div class="bar"><i style="width:' + pct + "%;background:" + barColor(pct) + '"></i></div>'
          + '<div class="small" data-cd="' + key + '">' + (b.resetTime ? fmtTime(b.resetTime) : "") + "</div>"
          + "</div>";
      }
      html += "</div>";
    }
    html += "</div>";
    box.innerHTML = html;
    tickCountdowns();
  }
  function tickCountdowns() {
    Object.keys(state.quota).forEach(function (key) {
      var el = document.querySelector('[data-cd="' + key + '"]');
      if (!el) return;
      var q = state.quota[key];
      if (!q.resetAt) return;
      var left = q.resetAt - Date.now();
      el.innerText = left > 0 ? "⏳ Còn " + fmtCountdown(left) : "✅ Sẵn sàng";
    });
  }
  async function loadQuota(id) {
    if (!id) return;
    var box = $("quotaBox");
    box.innerHTML = '<div class="muted small">Đang tải quota...</div>';
    var r = await api("/api/usage?accountId=" + encodeURIComponent(id));
    if (r.data && r.data.success && r.data.usage) {
      renderQuota(r.data.usage, Date.now());
      var u = r.data.usage;
      var last = $("quotaMeta");
      if (last) last.innerText = "Cập nhật: " + fmtTime(new Date().toISOString()) + (u.fetchedAt ? " • " + fmtTime(new Date(u.fetchedAt).toISOString()) : "");
    } else {
      box.innerHTML = '<div class="err small">' + esc((r.data && r.data.error) || "Không tải được quota") + "</div>";
    }
  }

  // ---------------------------- Bảng cân bằng ------------------------------
  async function loadBalance() {
    var sel = $("balModel");
    var box = $("balBox");
    box.innerHTML = '<div class="muted small">Đang tải...</div>';
    var r = await api("/api/balance?model=" + encodeURIComponent(sel.value));
    var data = r.data || {};
    if (!data.success || !Array.isArray(data.accounts)) {
      box.innerHTML = '<div class="muted small">Không tải được dữ liệu cân bằng.</div>';
      return;
    }
    var html = '<div style="overflow-x:auto"><table><thead><tr>'
      + "<th>Tài khoản</th><th>Hạn mức 5 giờ</th><th>Hạn mức Tuần</th><th>Tỷ lệ Traffic (SWRR)</th><th>Chế độ điều phối</th><th>Lượt tiếp theo</th>"
      + "</tr></thead><tbody>";
    for (var i = 0; i < data.accounts.length; i++) {
      var a = data.accounts[i];
      html += "<tr>"
        + '<td><div style="font-weight:600">👤 ' + esc(a.email.split("@")[0]) + '</div><div class="small" style="font-family:ui-monospace,monospace">' + esc(a.email) + "</div></td>"
        + "<td>" + miniBar(a.fiveHour, a.fiveHourCountdown) + "</td>"
        + "<td>" + miniBar(a.weekly, a.weeklyCountdown) + "</td>"
        + "<td>" + trafficCell(a.trafficShare, a.effectiveWeight) + "</td>"
        + '<td><span class="tag" style="color:' + (a.dispatchColor || "#10b981") + ";border-color:" + (a.dispatchColor || "#10b981") + '44">' + esc(a.dispatchMode || "") + "</span></td>"
        + "<td>" + (a.isNext ? '<span class="tag" style="background:#0284c7;color:#fff">⭐ Lượt tiếp theo</span>' : '<span class="small">Luân phiên sau</span>') + "</td>"
        + "</tr>";
    }
    html += "</tbody></table></div>";
    box.innerHTML = html;
  }
  function miniBar(pct, cd) {
    var p = typeof pct === "number" ? pct : 0;
    return '<div class="qlabel"><b style="color:' + barColor(p) + '">' + p + '%</b><span class="small">⏳ ' + esc(cd || "--") + "</span></div>"
      + '<div class="bar" style="height:5px"><i style="width:' + p + "%;background:" + barColor(p) + '"></i></div>';
  }
  function trafficCell(share, weight) {
    var s = typeof share === "number" ? share : 0;
    return '<div class="qlabel"><b style="color:#38bdf8">' + s + '%</b><span class="small">W: ' + (weight || 0) + "</span></div>"
      + '<div class="bar" style="height:5px"><i style="width:' + s + '%;background:#38bdf8"></i></div>';
  }

  // ---------------------------- Thao tác tài khoản --------------------------
  async function addAccount() {
    var input = $("cbInput");
    var val = (input.value || "").trim();
    if (!val) { setMsg("addMsg", "Vui lòng dán link callback!", "err"); return; }
    setMsg("addMsg", "⏳ Đang xác thực và thêm tài khoản...", "muted");
    var r = await api("/api/auth/exchange", { method: "POST", body: { callbackUrl: val } });
    if (r.data && r.data.success) {
      setMsg("addMsg", "✅ Đã thêm: " + r.data.account.email + " — đang tải lại...", "ok");
      setTimeout(function () { location.reload(); }, 1200);
    } else {
      setMsg("addMsg", "❌ " + ((r.data && r.data.error) || "Thất bại"), "err");
    }
  }
  async function deleteAccount() {
    if (!state.accountId) return;
    if (!confirm("Xoá tài khoản này khỏi Pool?")) return;
    var r = await api("/api/accounts/" + encodeURIComponent(state.accountId), { method: "DELETE" });
    if (r.data && r.data.success) location.reload();
    else alert("Lỗi: " + ((r.data && r.data.error) || r.status));
  }
  async function testAccount() {
    if (!state.accountId) return;
    setMsg("acctMsg", "⏳ Đang kiểm tra tài khoản...", "muted");
    var r = await api("/api/accounts/" + encodeURIComponent(state.accountId) + "/test", { method: "POST" });
    var d = r.data || {};
    if (d.success) setMsg("acctMsg", "✅ Tài khoản hoạt động tốt (" + d.latencyMs + "ms)", "ok");
    else setMsg("acctMsg", "❌ " + (d.error || "Lỗi không xác định"), "err");
  }
  async function resetCooldown() {
    if (!state.accountId) return;
    var r = await api("/api/accounts/" + encodeURIComponent(state.accountId) + "/cooldown", { method: "DELETE" });
    setMsg("acctMsg", (r.data && r.data.success) ? "✅ Đã xoá cooldown" : "❌ " + ((r.data && r.data.error) || "Lỗi"), (r.data && r.data.success) ? "ok" : "err");
  }
  async function selfTest() {
    var box = $("selfTestBox");
    box.style.display = "block";
    box.innerHTML = '<span class="warn">⏳ Đang chạy kiểm tra thật (refresh token → sync model → chat → quota)...</span>';
    var r = await api("/api/selftest?model=" + encodeURIComponent($("balModel").value) + "&stream=1", { method: "POST", body: {} });
    var d = r.data || {};
    var html = '<div style="font-weight:600;margin-bottom:6px" class="' + (d.ok ? "ok" : "err") + '">'
      + (d.ok ? "✅ HOẠT ĐỘNG TỐT" : "❌ CÓ BƯỚC THẤT BẠI") + " • " + (d.totalMs || 0) + "ms • tài khoản: " + esc(d.account || "-")
      + (d.routedTo ? " • route: " + esc(d.routedTo) : "") + "</div>";
    html += "<table><thead><tr><th>Bước</th><th>Kết quả</th><th>Chi tiết</th></tr></thead><tbody>";
    (d.steps || []).forEach(function (s2) {
      var detail = [];
      if (s2.status) detail.push("HTTP " + s2.status);
      if (s2.ms != null) detail.push(s2.ms + "ms");
      if (s2.servedModel) detail.push("model: " + s2.servedModel);
      if (s2.downgraded) detail.push("⚠️ đã hạ cấp model");
      if (s2.attempts) detail.push(s2.attempts + " lần thử");
      if (s2.count != null) detail.push(s2.count + " model");
      if (s2.requestedAvailable === false) detail.push("⚠️ model yêu cầu không có trên upstream");
      if (s2.lowestRemaining != null) detail.push("quota thấp nhất: " + s2.lowestRemaining + "%");
      if (s2.textChunks != null) detail.push(s2.textChunks + " chunk");
      if (s2.answer) detail.push("trả lời: " + s2.answer);
      if (s2.error) detail.push("lỗi: " + s2.error);
      html += "<tr><td><code>" + esc(s2.step) + "</code></td><td>" + (s2.ok ? '<span class="ok">OK</span>' : '<span class="err">LỖI</span>')
        + '</td><td class="muted">' + esc(detail.join(" • ")) + "</td></tr>";
    });
    html += "</tbody></table>";
    box.innerHTML = html;
  }
  async function syncModels() {
    var r = await api("/api/models/sync", { method: "POST", body: {} });
    alert((r.data && r.data.message) || (r.data && r.data.error) || "Xong");
    loadModels();
  }
  async function loadModels() {
    var r = await api("/v1/models");
    var list = (r.data && r.data.data) || [];
    $("modelsCount").innerText = list.length;
    var html = "";
    for (var i = 0; i < Math.min(list.length, 40); i++) html += '<span class="tag">' + esc(list[i].id) + "</span>";
    if (list.length > 40) html += '<span class="tag">+' + (list.length - 40) + " model khác</span>";
    $("modelsBox").innerHTML = html;
  }
  async function changeKey() {
    var val = ($("newKey").value || "").trim();
    if (val.length < 8) { setMsg("keyMsg", "API Key phải có ít nhất 8 ký tự!", "err"); return; }
    setMsg("keyMsg", "⏳ Đang lưu...", "muted");
    var r = await api("/api/key/update", { method: "POST", body: { newApiKey: val } });
    setMsg("keyMsg", (r.data && r.data.success ? "✅ " : "❌ ") + ((r.data && (r.data.message || r.data.error)) || "Lỗi"), (r.data && r.data.success) ? "ok" : "err");
  }
  async function resetKey() {
    if (!confirm("Xoá API Key trong KV và quay về dùng biến môi trường?")) return;
    var r = await api("/api/key/update", { method: "POST", body: { resetToEnv: true } });
    setMsg("keyMsg", (r.data && (r.data.message || r.data.error)) || "Xong", "ok");
    if (r.data && r.data.success) setTimeout(function () { location.href = "/"; }, 1200);
  }
  async function loadStats() {
    var r = await api("/api/stats");
    var d = r.data || {}, iso = d.isolate || {}, agg = d.aggregate || {};
    var rows = [
      ["Yêu cầu (isolate này)", iso.requests || 0],
      ["Thành công / Lỗi", (iso.ok || 0) + " / " + (iso.errors || 0)],
      ["Failover", iso.failovers || 0],
      ["429 / cooldown", (iso.quotaHits || 0) + " / " + (iso.cooldowns || 0)],
      ["Token vào / ra", (iso.promptTokens || 0) + " / " + (iso.completionTokens || 0)],
      ["Độ trễ TB", (iso.avgLatencyMs || 0) + " ms"],
      ["Tổng đã gộp (KV)", (agg.requests || 0) + " req • " + ((agg.promptTokens || 0) + (agg.completionTokens || 0)) + " token"],
      ["Uptime isolate", (iso.uptimeSec || 0) + "s"]
    ];
    $("statsBox").innerHTML = rows.map(function (row) {
      return '<div class="kv"><span class="muted">' + row[0] + "</span><b>" + row[1] + "</b></div>";
    }).join("");
  }
  async function loadLogs() {
    var r = await api("/api/logs");
    var logs = (r.data && r.data.logs) || [];
    if (!logs.length) { $("logBox").innerText = "Chưa có log nào trong isolate này."; return; }
    $("logBox").innerText = logs.slice().reverse().map(function (l) {
      var t = new Date(l.t).toLocaleTimeString("vi-VN");
      return t + "  " + (l.level || "info").toUpperCase() + "  " + (l.path || "") + "  " + (l.model || "") + "  " + (l.status || "") + (l.message ? "  " + l.message : "") + (l.ms ? "  " + l.ms + "ms" : "");
    }).join("\n");
  }

  // ---------------------------- Khởi động ---------------------------------
  function bind() {
    $("btnTest").addEventListener("click", testAccount);
    $("btnReset").addEventListener("click", resetCooldown);
    $("btnDelete").addEventListener("click", deleteAccount);
    $("btnAdd").addEventListener("click", addAccount);
    $("btnSync").addEventListener("click", syncModels);
    $("btnSelfTest").addEventListener("click", selfTest);
    $("btnReloadQuota").addEventListener("click", function () { loadQuota(state.accountId); });
    $("btnBalReload").addEventListener("click", loadBalance);
    $("balModel").addEventListener("change", loadBalance);
    $("btnChangeKey").addEventListener("click", changeKey);
    $("btnResetKey").addEventListener("click", resetKey);
    $("btnLogs").addEventListener("click", loadLogs);
    $("btnStats").addEventListener("click", loadStats);
    Array.prototype.forEach.call(document.querySelectorAll("[data-copy]"), function (btn) {
      btn.addEventListener("click", function () { copyText(btn.getAttribute("data-copy"), btn); });
    });
    setInterval(tickCountdowns, 1000);
    setInterval(function () { if (state.accountId) loadQuota(state.accountId); }, 60000);
    setInterval(loadBalance, 60000);
  }
  document.addEventListener("DOMContentLoaded", function () {
    renderTabs();
    bind();
    if (state.accountId) {
      var acc = boot.accounts.filter(function (a) { return a.id === state.accountId; })[0];
      if (acc) $("quotaHeader").innerText = "📊 Hạn ngạch: " + acc.email;
      loadQuota(state.accountId);
    }
    loadBalance();
    loadModels();
    loadStats();
  });
}
// Giữ tham chiếu tới hàm client để bundler/minifier không tree-shake mất:
// renderDashboard dùng dashboardClient.toString() để nhúng script vào HTML.
globalThis.__antigravityDashboardClient = dashboardClient;

async function renderDashboard(request, env) {
  const accounts = await getAccountsList(env);
  const origin = new URL(request.url).origin;
  const models = await getDynamicModels(env);
  const activeKey = await getRequiredApiKey(env);
  const clientVer = clientVersion(env);
  const authUrl = `${CONFIG.authUrl}?` + new URLSearchParams({
    client_id: CONFIG.clientId,
    response_type: "code",
    redirect_uri: CONFIG.redirectUri,
    scope: CONFIG.scopes.join(" "),
    access_type: "offline",
    prompt: "consent"
  }).toString();
  const boot = {
    version: GATEWAY_VERSION,
    clientVersion: clientVer,
    origin,
    baseUrl: origin + "/v1",
    kvEnabled: !!env.ANTIGRAVITY_KV,
    maskedKey: maskKey(activeKey),
    authUrl,
    accounts: accounts.map((a) => ({ id: a.id, email: a.email, projectId: a.projectId, cooling: isAccountCoolingDown(a, Date.now()) })),
    models: models.slice(0, 60).map((m) => m.id),
    statsEnabled: envBool(env, "ENABLE_STATS", true)
  };
  const bootJson = JSON.stringify(boot).replace(/</g, "\\u003c");
  const modelsTags = models.slice(0, 15).map((m) => `<span class="tag">${m.id}</span>`).join("");
  const coolingCount = boot.accounts.filter((a) => a.cooling).length;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Antigravity Multi-Account Gateway</title>
<style>${DASHBOARD_CSS}</style>
</head>
<body>
<div class="card">
  <div class="spread">
    <div>
      <h1>🚀 Antigravity Gateway <span class="small">v${GATEWAY_VERSION}</span></h1>
      <p style="margin:2px 0 0 0">Multi-Account Pool • client ${clientVer} • ${boot.kvEnabled ? "KV: đã cấu hình" : '<span class="warn">KV: chưa cấu hình</span>'}</p>
    </div>
    <div class="row">
      <span class="badge ${accounts.length > 0 ? "badge-online" : "badge-offline"}">● Pool: ${accounts.length} tài khoản${coolingCount ? ` • ${coolingCount} đang cooldown` : ""}</span>
      <a href="/health" target="_blank" class="btn btn-sm btn-ghost">🩺 Health</a>
      <a href="/logout" class="btn btn-sm">🚪 Đăng xuất</a>
    </div>
  </div>

  <div class="tabs" id="tabs"></div>

  <div class="box" id="quotaCard">
    <div class="box-title">
      <span id="quotaHeader">📊 Hạn ngạch tài khoản</span>
      <div class="row">
        <button class="btn btn-sm" id="btnReloadQuota">🔄 Làm mới</button>
        <button class="btn btn-sm" id="btnTest">🧪 Kiểm tra</button>
        <button class="btn btn-sm" id="btnReset">♻️ Xoá cooldown</button>
        <button class="btn btn-sm btn-danger" id="btnDelete">🗑️ Xoá</button>
      </div>
    </div>
    <div id="quotaBox"></div>
    <div class="small" id="quotaMeta"></div>
    <div id="acctMsg" class="msg"></div>
  </div>

  <div class="box">
    <div class="box-title">
      <span>⚖️ Bộ Điều Phối Cân Bằng Tải • Dynamic SWRR Balancer v2</span>
      <div class="row">
        <select id="balModel" style="width:240px">
          <option value="gemini-3.8-flash-high" selected>✨ gemini-3.8-flash-high</option>
          <option value="gemini-3.8-flash-medium">⚡ gemini-3.8-flash-medium</option>
          <option value="gemini-3.1-pro-high">🧠 gemini-3.1-pro-high</option>
          <option value="claude-sonnet-4-6">🎭 claude-sonnet-4-6</option>
          <option value="claude-opus-4-6-thinking">🔮 claude-opus-4-6-thinking</option>
          <option value="gpt-oss-120b">🌐 gpt-oss-120b</option>
        </select>
        <button class="btn btn-sm" id="btnBalReload">🔄 Cập nhật</button>
      </div>
    </div>
    <p style="margin:0 0 6px 0">Thuật toán <b>Smooth Weighted Round-Robin</b> + <b>Tận dụng Reset khẩn cấp</b> + <b>Bảo tồn hạn ngạch tuần</b> — chia tải theo tỷ lệ thời gian thực.</p>
    <div id="balBox"></div>
  </div>

  <div class="box" id="addBox" style="display:${accounts.length === 0 ? "block" : "none"}">
    <div class="box-title"><span>➕ Thêm tài khoản Google vào Pool</span>
      <button class="btn btn-sm btn-ghost" onclick="document.getElementById('addBox').style.display='none'">Đóng</button>
    </div>
    <p style="margin:0 0 8px 0">Bấm đăng nhập bằng tài khoản Google (cửa sổ mới), sau đó dán link callback vào ô bên dưới:</p>
    <a href="${authUrl}" target="_blank" class="btn">🔗 1. Đăng nhập Google</a>
    <input type="text" id="cbInput" placeholder="Dán link callback: http://localhost:8085/callback?code=4/0A..." style="margin-top:10px" />
    <button class="btn" id="btnAdd" style="margin-top:8px">⚡ 2. Thêm vào Pool</button>
    <div id="addMsg" class="msg"></div>
  </div>

  <div class="box">
    <div class="box-title">
      <span>🤖 Models hỗ trợ (<span id="modelsCount">${models.length}</span>) • Context ${resolveContextLimit(env)}</span>
      <div class="row">
        <button class="btn btn-sm" id="btnSelfTest">🧬 Kiểm tra toàn hệ thống</button>
        <button class="btn btn-sm" id="btnSync">🔄 Đồng bộ Models</button>
      </div>
    </div>
    <div class="tags" id="modelsBox">${modelsTags}</div>
    <div id="selfTestBox" class="small" style="margin-top:10px;display:none"></div>
  </div>

  <div class="box">
    <div class="box-title"><span>📋 Cấu hình client</span></div>
    <p style="margin:0 0 6px 0">Base URL: <code>${boot.baseUrl}</code> • API Key hiện tại: <code>${maskKey(activeKey)}</code></p>
    <pre># OpenAI SDK / Cursor / Cline / Roo / Continue
Base URL : ${boot.baseUrl}
API Key  : &lt;API_KEY của bạn&gt;
Model    : gemini-3.8-flash-high

# Claude Code (Anthropic API)
export ANTHROPIC_BASE_URL=${origin}
export ANTHROPIC_API_KEY=&lt;API_KEY của bạn&gt;

# OpenAI Responses API (Codex CLI &amp; client mới)
curl ${boot.baseUrl}/responses -H "Authorization: Bearer &lt;API_KEY&gt;" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gemini-3.8-flash-high","input":"Xin chào!"}'

# Kiểm tra nhanh
curl ${boot.baseUrl}/chat/completions -H "Authorization: Bearer &lt;API_KEY&gt;" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gemini-3.8-flash-high","messages":[{"role":"user","content":"hi"}]}'</pre>
    <div class="row" style="margin-top:8px">
      <button class="btn btn-sm" data-copy="${boot.baseUrl}">📋 Copy Base URL</button>
      <button class="btn btn-sm" data-copy="export ANTHROPIC_BASE_URL=${origin}\nexport ANTHROPIC_API_KEY=&lt;API_KEY&gt;">📋 Copy cấu hình Claude Code</button>
    </div>
  </div>

  <div class="box">
    <div class="box-title"><span>📈 Thống kê (isolate hiện tại)</span>
      <button class="btn btn-sm" id="btnStats">🔄 Cập nhật</button>
    </div>
    <div id="statsBox"></div>
  </div>

  <div class="box">
    <div class="box-title"><span>🧾 Log gần đây</span><button class="btn btn-sm" id="btnLogs">🔄 Tải log</button></div>
    <pre id="logBox" style="max-height:260px;overflow:auto">Bấm "Tải log" để xem hoạt động gần đây của isolate này.</pre>
  </div>

  <div class="box">
    <div class="box-title"><span>🔑 Đổi API Key bảo vệ Gateway</span></div>
    <p style="margin:0 0 8px 0">Key hiện tại: <code>${maskKey(activeKey)}</code>. Nhập key mới (tối thiểu 8 ký tự):</p>
    <div class="row">
      <input type="text" id="newKey" placeholder="Ví dụ: sk-ag-..." style="flex:1;min-width:220px" />
      <button class="btn" id="btnChangeKey">💾 Lưu Key mới</button>
      <button class="btn btn-ghost" id="btnResetKey">↩️ Quay về env.API_KEY</button>
    </div>
    <div id="keyMsg" class="msg"></div>
  </div>
</div>
<script>
(${dashboardClient.toString()})(${bootJson});
<\/script>
</body>
</html>`;
  return htmlResponse(html, request, env);
}

/* ======================== 99-index.js ======================== */
/* ============================================================================
 *  PHẦN 12b/12 — Router chính & cron trigger
 * ============================================================================
 */

function notFound(request, env) {
  return openAiError("Không tìm thấy endpoint này. Xem danh sách tại GET /health", 404, "invalid_request_error", "not_found", request, env);
}

var index_default = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return handleCors(request, env);
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    const startedAt = Date.now();
    const isAnthropicPath = pathname === "/v1/messages" || pathname.startsWith("/v1/messages/") || pathname === "/messages";

    try {
      // ---------------------- Endpoint công khai ----------------------
      if (pathname === "/health") return await handleHealth(request, env);

      // ---------------------- Dashboard ----------------------
      if (pathname === "/" || pathname === "/login") {
        const auth = await authenticate(request, env);
        if (!auth) {
          return request.method === "GET" ? renderLoginScreen(request, env)
            : unauthorizedResponse(request, env);
        }
        if (request.method !== "GET" && request.method !== "HEAD") {
          return jsonResponse({ success: false, error: "Method không được hỗ trợ." }, 405, request, env);
        }
        return await renderDashboard(request, env);
      }
      if (pathname === "/logout") return handleLogout(request, env);

      // Đăng nhập: chưa cần auth (đây là bước lấy phiên)
      if (pathname === "/api/auth/login" && request.method === "POST") {
        return await handleLogin(request, env);
      }

      // ---------------------- Cần xác thực ----------------------
      const auth = await authenticate(request, env);
      if (!auth) {
        recordStat({ status: 401, endpoint: pathname });
        return isAnthropicPath
          ? anthropicError("API Key không hợp lệ hoặc bị thiếu (header x-api-key/Authorization).", 401, "authentication_error", request, env)
          : unauthorizedResponse(request, env);
      }
      // Chống CSRF cho các thao tác ghi khi xác thực bằng cookie phiên.
      if ((auth.method === "session" || auth.method === "legacy-cookie") && !isCsrfSafe(request)) {
        recordStat({ status: 403, endpoint: pathname });
        return jsonResponse({ success: false, error: "Yêu cầu bị chặn bởi kiểm tra CSRF (Origin không khớp)." }, 403, request, env);
      }
      const rl = checkApiRateLimit(env, auth.key || clientIp(request));
      if (!rl.allowed) {
        recordStat({ status: 429, endpoint: pathname });
        return jsonResponse({ success: false, error: "Vượt giới hạn RATE_LIMIT_RPM." }, 429, request, env, { "retry-after": String(rl.retryAfterSec || 60) });
      }

      // ---------------------- Quản trị ----------------------
      if (pathname === "/api/auth/exchange" && request.method === "POST") return await handleExchangeCode(request, env, ctx);
      if (pathname === "/api/accounts" && request.method === "GET") return await handleGetAccounts(request, env);
      if (pathname === "/api/accounts/export" && request.method === "GET") return await handleExportAccounts(request, env);
      if (pathname === "/api/accounts/import" && request.method === "POST") return await handleImportAccounts(request, env);

      const accountMatch = pathname.match(/^\/api\/accounts\/([^/]+)(?:\/(cooldown|test))?$/);
      if (accountMatch) {
        const id = decodeURIComponent(accountMatch[1]);
        const sub = accountMatch[2];
        if (!sub && request.method === "DELETE") return await handleDeleteAccount(request, env, id);
        if (sub === "cooldown" && request.method === "DELETE") return await handleResetCooldown(request, env, id);
        if (sub === "test" && request.method === "POST") return await handleTestAccount(request, env, id);
      }
      if (pathname === "/api/usage" && request.method === "GET") {
        return await handleGetUsage(request, env, ctx, url.searchParams.get("accountId") || "");
      }
      if (pathname === "/api/balance" && request.method === "GET") {
        return await handleGetBalanceStatus(request, env, url.searchParams.get("model") || "gemini-3.8-flash-high");
      }
      if (pathname === "/api/models/sync" && request.method === "POST") return await handleSyncModels(request, env);
      if (pathname === "/api/selftest" && (request.method === "GET" || request.method === "POST")) {
        return await handleSelfTest(request, env, ctx, url);
      }
      if (pathname === "/api/stats" && request.method === "GET") return await handleGetStats(request, env);
      if (pathname === "/api/logs" && request.method === "GET") return await handleGetLogs(request, env);
      if (pathname === "/api/key/update" && request.method === "POST") return await handleUpdateApiKey(request, env);

      // ---------------------- API tương thích OpenAI ----------------------
      if ((pathname === "/v1/models" || pathname === "/models") && request.method === "GET") return await handleListModels(request, env);
      if ((pathname === "/v1/chat/completions" || pathname === "/chat/completions") && request.method === "POST") {
        return await handleChatCompletions(request, env, ctx);
      }
      if ((pathname === "/v1/completions" || pathname === "/completions") && request.method === "POST") {
        return await handleLegacyCompletions(request, env, ctx);
      }
      if ((pathname === "/v1/responses" || pathname === "/responses") && request.method === "POST") {
        return await handleResponsesApi(request, env, ctx);
      }
      // ---------------------- API tương thích Anthropic ----------------------
      if (isMessagesPath(pathname) && request.method === "POST") return await handleAnthropicMessages(request, env, ctx);
      if ((pathname === "/v1/messages/count_tokens" || pathname === "/messages/count_tokens") && request.method === "POST") {
        return await handleCountTokens(request, env);
      }
      // Các endpoint upstream không hỗ trợ -> trả lỗi rõ ràng thay vì 404 mơ hồ.
      if (pathname === "/v1/embeddings" || pathname === "/embeddings") {
        return openAiError(
          "Antigravity Pool không cung cấp model embedding. Hãy dùng dịch vụ embedding khác (OpenAI, Voyage, Gemini API...).",
          501, "invalid_request_error", "not_implemented", request, env
        );
      }
      if (pathname.startsWith("/v1/audio") || pathname.startsWith("/v1/images") || pathname.startsWith("/v1/files")) {
        return openAiError("Endpoint này chưa được gateway hỗ trợ.", 501, "invalid_request_error", "not_implemented", request, env);
      }
      return notFound(request, env);
    } catch (err) {
      console.error("[Gateway Error]", err);
      logEvent(env, { level: "error", path: pathname, message: err?.message || String(err), ms: Date.now() - startedAt });
      recordStat({ status: 500, endpoint: pathname });
      if (isAnthropicPath) return anthropicError(err?.message || String(err), 500, "api_error", request, env);
      return openAiError(err?.message || String(err), 500, "internal_server_error", 500, request, env);
    } finally {
      if (env && env.ANTIGRAVITY_KV) {
        try { maybeFlushStats(env, ctx); } catch (_) { /* ignore */ }
      }
    }
  },

  // =========================================================================
  // CRON TRIGGER: tự động đồng bộ model mới + gộp số liệu thống kê.
  // Cấu hình trong wrangler.toml: [triggers] crons = ["0 */6 * * *"]
  // =========================================================================
  async scheduled(controller, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const result = await refreshModelsCache(env);
        if (result && result.added.length > 0) {
          console.log(`[Cron Models Sync] ✅ Đã tự động cập nhật ${result.added.length} model mới: ${result.added.join(", ")}`);
        } else if (result) {
          console.log(`[Cron Models Sync] OK (${result.models.length} models), không có model mới.`);
        } else {
          console.warn("[Cron Models Sync] Bỏ qua lần này: upstream không phản hồi hoặc pool chưa có tài khoản.");
        }
      } catch (err) {
        console.warn("[Cron Models Sync] Lỗi:", err?.message || String(err));
      }
      try { maybeFlushStats(env, ctx); } catch (_) { /* ignore */ }
    })());
  }
};

export default index_default;
