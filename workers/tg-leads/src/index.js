/**
 * Заявки сайта → личные сообщения админам в Telegram.
 * Секрет: TELEGRAM_BOT_TOKEN
 * Список чатов: TELEGRAM_ADMIN_IDS=111,222 или константа ADMINS
 * Для /myid: TELEGRAM_WEBHOOK_SECRET
 *
 * POST /         заявка: phone, name?, plan?, page?, note?
 * POST /webhook  команда /myid отвечает chat id
 */

import { consumeSlot, json, makeCors } from "../../lib/http.js";

const ALLOWED_ORIGINS = [
  "https://гос-сэс.рф",
  "https://www.гос-сэс.рф",
  "https://xn----etb7amba7f.xn--p1ai",
  "https://www.xn----etb7amba7f.xn--p1ai",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
];

const MAX_LEADS = 5;
const ADMINS = [];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = makeCors(origin, ALLOWED_ORIGINS);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (path === "/webhook" && request.method === "POST") {
      return handleWebhook(request, env);
    }

    if (request.method !== "POST" || path !== "/") {
      return json({ ok: false, error: "Method not allowed", code: "method_not_allowed" }, 405, corsHeaders);
    }

    const admins = adminIds(env);
    if (!env.TELEGRAM_BOT_TOKEN || admins.length === 0) {
      return json({ ok: false, error: "Server misconfigured", code: "misconfigured" }, 500, corsHeaders);
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON", code: "invalid_json" }, 400, corsHeaders);
    }

    return handleLead(request, env, data, corsHeaders, admins);
  },
};

function adminIds(env) {
  const fromEnv = String(env.TELEGRAM_ADMIN_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set([...ADMINS.map(String), ...fromEnv])];
}

async function handleLead(request, env, data, corsHeaders, admins) {
  const lead = parseLead(data);
  if (!lead) {
    return json({ ok: false, error: "Invalid lead", code: "validation" }, 400, corsHeaders);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await consumeSlot(env.BOT_KV, `lead:${ip}`, Date.now(), MAX_LEADS);
  if (!allowed) {
    return json({ ok: false, error: "Too many requests", code: "rate_limited" }, 429, corsHeaders);
  }

  const text = leadText(lead);
  for (const chatId of admins) {
    const sent = await sendTelegram(env.TELEGRAM_BOT_TOKEN, chatId, text);
    if (!sent.ok) return json(sent.body, sent.status, corsHeaders);
  }
  return json({ ok: true }, 200, corsHeaders);
}

function parseLead(data) {
  if (!data || typeof data !== "object") return null;

  const rawPhone = String(data.phone || "").trim().slice(0, 64);
  const digitsOnly = rawPhone.replace(/\D/g, "");
  const digits = digitsOnly.startsWith("8") && digitsOnly.length === 11 ? `7${digitsOnly.slice(1)}` : digitsOnly;
  const phoneOk = digits.length === 11 && digits.startsWith("7");
  const handle = rawPhone.replace(/\s/g, "");
  const tgOk = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(handle);
  if (!phoneOk && !tgOk) return null;

  const name = String(data.name || "").trim().slice(0, 80);
  const plan = String(data.plan || "").trim().slice(0, 80);
  const page = String(data.page || "").trim().slice(0, 300);
  const note = String(data.note || "").replace(/\r/g, "").trim().slice(0, 700);
  return {
    phone: phoneOk ? digits : "",
    contact: phoneOk ? "" : (handle.startsWith("@") ? handle : `@${handle}`),
    name,
    plan,
    page,
    note,
  };
}

function leadText(lead) {
  const lines = ["Заявка с сайта ГОС СЭС"];
  if (lead.phone) {
    const national = lead.phone.slice(1);
    const phone = `+7 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6, 8)}-${national.slice(8, 10)}`;
    lines.push(`Телефон: ${phone}`);
  }
  if (lead.contact) lines.push(`Telegram: ${lead.contact}`);
  if (lead.name) lines.push(`Имя: ${lead.name}`);
  if (lead.plan) lines.push(`Услуга: ${lead.plan}`);
  if (lead.note) lines.push(lead.note);
  if (lead.page) lines.push(`Страница: ${readablePage(lead.page)}`);
  return lines.join("\n").slice(0, 4000);
}

function readablePage(page) {
  let url;
  try {
    url = new URL(page);
  } catch {
    return page;
  }
  const host = url.hostname
    .split(".")
    .map((label) => (label.startsWith("xn--") ? decodePunycode(label.slice(4)) : label))
    .join(".");
  let path = url.pathname;
  if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length) || "/";
  return `${url.protocol}//${host}${path}${url.search}`;
}

function decodePunycode(input) {
  const base = 36;
  const tMin = 1;
  const tMax = 26;
  const skew = 38;
  const damp = 700;
  const output = [];
  const delimiter = input.lastIndexOf("-");
  if (delimiter > 0) {
    for (let j = 0; j < delimiter; j++) output.push(input.charCodeAt(j));
  }
  let i = 0;
  let n = 128;
  let bias = 72;
  let pos = delimiter > 0 ? delimiter + 1 : 0;

  const adapt = (delta, numPoints, firstTime) => {
    delta = firstTime ? Math.floor(delta / damp) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    let k = 0;
    while (delta > ((base - tMin) * tMax) >> 1) {
      delta = Math.floor(delta / (base - tMin));
      k += base;
    }
    return k + Math.floor(((base - tMin + 1) * delta) / (delta + skew));
  };

  while (pos < input.length) {
    const oldi = i;
    let w = 1;
    for (let k = base; ; k += base) {
      if (pos >= input.length) return input;
      const code = input.charCodeAt(pos++);
      const digit = code >= 48 && code <= 57 ? code - 22 : code >= 65 && code <= 90 ? code - 65 : code >= 97 && code <= 122 ? code - 97 : base;
      if (digit >= base) return input;
      i += digit * w;
      const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
      if (digit < t) break;
      w *= base - t;
    }
    const outLen = output.length + 1;
    bias = adapt(i - oldi, outLen, oldi === 0);
    n += Math.floor(i / outLen);
    i %= outLen;
    output.splice(i, 0, n);
    i += 1;
  }
  return String.fromCodePoint(...output);
}

async function sendTelegram(token, chatId, text) {
  let res;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    return { ok: false, status: 502, body: { ok: false, error: "Telegram unavailable", code: "tg_network" } };
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = String(body?.description || "").slice(0, 160);
    console.log("tg send failed", res.status, detail, "chat", String(chatId));
    return {
      ok: false,
      status: 502,
      body: { ok: false, error: "Telegram failed", code: "tg_failed", detail: detail || undefined },
    };
  }
  return { ok: true };
}

async function handleWebhook(request, env) {
  if (env.TELEGRAM_WEBHOOK_SECRET) {
    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (secret !== env.TELEGRAM_WEBHOOK_SECRET) return new Response("forbidden", { status: 403 });
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return new Response("ok");
  }

  const message = update.message;
  const chatId = message?.chat?.id;
  const command = String(message?.text || "").trim().split(/\s+/)[0]?.split("@")[0].toLowerCase();
  if (!chatId || message.from?.is_bot || command !== "/myid") return new Response("ok");
  if (!env.TELEGRAM_BOT_TOKEN) return new Response("misconfigured", { status: 500 });

  const sent = await sendTelegram(env.TELEGRAM_BOT_TOKEN, chatId, String(chatId));
  return new Response(sent.ok ? "ok" : "failed", { status: sent.ok ? 200 : 502 });
}
