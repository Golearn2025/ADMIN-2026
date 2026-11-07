/**
 * One-shot OAuth for Google Ads API.
 *
 * 1) Create OAuth client (Desktop) in GCP project vantage-lane
 * 2) Put CLIENT_ID + CLIENT_SECRET in .env.local
 * 3) Run: node scripts/google-ads-oauth.mjs
 * 4) Paste the refresh token into GOOGLE_ADS_REFRESH_TOKEN
 */
import http from "http";
import { URL } from "url";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };
const CLIENT_ID = env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_ADS_CLIENT_SECRET;
const PORT = 8765;
const REDIRECT = `http://127.0.0.1:${PORT}/oauth2callback`;
const SCOPE = "https://www.googleapis.com/auth/adwords";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET in .env.local");
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
    if (u.pathname !== "/oauth2callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const code = u.searchParams.get("code");
    const err = u.searchParams.get("error");
    if (err || !code) {
      res.writeHead(400);
      res.end(`OAuth error: ${err || "no code"}`);
      server.close();
      process.exit(1);
    }

    const body = new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = await tokenRes.json();
    if (!tokenRes.ok) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(JSON.stringify(json, null, 2));
      console.error(json);
      server.close();
      process.exit(1);
    }

    const refresh = json.refresh_token;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      `<h1>OK</h1><p>Refresh token copied in terminal. You can close this tab.</p><pre>${refresh || "(no refresh_token — revoke app access and retry with prompt=consent)"}</pre>`
    );

    console.log("\n=== PASTE INTO .env.local ===\n");
    console.log(`GOOGLE_ADS_REFRESH_TOKEN=${refresh || ""}`);
    console.log("\n============================\n");
    server.close();
    process.exit(refresh ? 0 : 1);
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end(String(e));
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Open this URL in the browser (use the Google account that owns Ads):\n");
  console.log(authUrl.toString());
  console.log(`\nWaiting on ${REDIRECT} ...`);
});
