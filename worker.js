/**
 * Cloudflare Worker — Contact Form Handler
 * Deploy this at: https://dash.cloudflare.com → Workers & Pages → Create Worker
 *
 * Environment Variables to set in the Worker dashboard:
 *   RESEND_API_KEY   — your Resend.com API key (free tier: 3,000 emails/month)
 *   TO_EMAIL         — your personal email (where submissions land)
 *   FROM_EMAIL       — a verified Resend sender address (e.g. noreply@yourdomain.com)
 *   ALLOWED_ORIGIN   — your portfolio URL (e.g. https://alexrivera.dev)
 */

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX       = 3;          // max 3 submissions per IP per minute

// In-memory store (resets per Worker isolate — good enough for basic abuse prevention)
const ipSubmissions = new Map();

function rateLimit(ip) {
  const now = Date.now();
  const record = ipSubmissions.get(ip) || { count: 0, start: now };

  if (now - record.start > RATE_LIMIT_WINDOW_MS) {
    ipSubmissions.set(ip, { count: 1, start: now });
    return false; // not rate-limited
  }

  if (record.count >= RATE_LIMIT_MAX) return true; // rate-limited

  record.count++;
  ipSubmissions.set(ip, record);
  return false;
}

function corsHeaders(origin, allowed) {
  const allowedOrigin = (allowed && origin === allowed) ? origin : allowed || '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  });
}

function validatePayload({ name, email, message }) {
  if (!name || name.trim().length < 2)        return 'Name must be at least 2 characters.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email address.';
  if (!message || message.trim().length < 20)  return 'Message must be at least 20 characters.';
  if (name.length > 100)                       return 'Name is too long.';
  if (message.length > 5000)                   return 'Message is too long (max 5000 chars).';
  return null;
}

// Simple HTML sanitizer — strips tags before email dispatch
function sanitize(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .slice(0, 5000);
}

async function sendEmail(env, { name, email, subject, message }) {
  const html = `
    <div style="font-family: monospace; max-width: 600px; border-left: 4px solid #c8410f; padding-left: 1.5rem;">
      <h2 style="color: #c8410f; margin-bottom: 0.25rem;">New Portfolio Inquiry</h2>
      <p style="color: #888; font-size: 0.8rem; margin-top: 0;">${new Date().toUTCString()}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.9rem;">
        <tr><td style="padding: 6px 0; color: #555; width: 100px;">Name</td><td style="padding: 6px 0;"><strong>${sanitize(name)}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #555;">Email</td><td style="padding: 6px 0;"><a href="mailto:${sanitize(email)}">${sanitize(email)}</a></td></tr>
        <tr><td style="padding: 6px 0; color: #555;">Subject</td><td style="padding: 6px 0;">${sanitize(subject || 'General Inquiry')}</td></tr>
      </table>
      <div style="background: #f5f0e8; padding: 1rem; border-radius: 4px; white-space: pre-wrap; font-size: 0.9rem; line-height: 1.6;">${sanitize(message)}</div>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to:   [env.TO_EMAIL],
      reply_to: email,
      subject: `[Portfolio] ${subject || 'New message'} from ${name}`,
      html,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend API error: ${err}`);
  }
}

export default {
  async fetch(request, env) {
    const origin  = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin, env.ALLOWED_ORIGIN);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed.' }, 405, headers);
    }

    // Rate limiting
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimit(ip)) {
      return json({ error: 'Too many requests. Please wait a minute and try again.' }, 429, headers);
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400, headers);
    }

    // Validate
    const validationError = validatePayload(body);
    if (validationError) {
      return json({ error: validationError }, 400, headers);
    }

    // Send email
    try {
      await sendEmail(env, body);
      return json({ success: true, message: 'Message received!' }, 200, headers);
    } catch (err) {
      console.error('Email send failed:', err.message);
      return json({ error: 'Could not deliver your message. Please try again later.' }, 500, headers);
    }
  }
};
