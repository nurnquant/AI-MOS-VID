/**
 * One-time YouTube OAuth consent helper (PROV-009D).
 *
 *   node --env-file=.env scripts/youtube-oauth.mjs
 *
 * Requires YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET in the env
 * (Google Cloud Console → OAuth client, type "Desktop app", with the
 * YouTube Data API v3 enabled). Opens a consent URL for YOUR Google
 * account; the loopback redirect is captured locally and exchanged.
 *
 * The refresh token is printed ONCE to this terminal — copy it into
 * `.env` (and later the Railway worker variables) as
 * YOUTUBE_REFRESH_TOKEN. Never commit it, never paste it into chat.
 */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const clientId = process.env.YOUTUBE_CLIENT_ID;
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET first (see header comment).");
  process.exit(1);
}

const state = randomBytes(16).toString("hex");
const scopes = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
].join(" ");

const server = createServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const redirectUri = `http://127.0.0.1:${port}/callback`;

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();

console.log("\n1. Open this URL in the browser logged into the channel's Google account:\n");
console.log(authUrl);
console.log("\n2. Approve access. This terminal finishes automatically.\n");

const code = await new Promise((resolve, reject) => {
  server.on("request", (req, res) => {
    const url = new URL(req.url, redirectUri);
    if (url.pathname !== "/callback") {
      res.writeHead(404).end();
      return;
    }
    const err = url.searchParams.get("error");
    if (err) {
      res.writeHead(200, { "content-type": "text/plain" }).end("Consent failed — see terminal.");
      reject(new Error(`consent error: ${err}`));
      return;
    }
    if (url.searchParams.get("state") !== state) {
      res.writeHead(400).end("state mismatch");
      reject(new Error("state mismatch"));
      return;
    }
    res
      .writeHead(200, { "content-type": "text/plain" })
      .end("Consent received — return to the terminal. You can close this tab.");
    resolve(url.searchParams.get("code"));
  });
});
server.close();

const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  }).toString(),
});
const tokens = await tokenResponse.json();
if (!tokenResponse.ok || !tokens.refresh_token) {
  console.error("Token exchange failed:", JSON.stringify(tokens).slice(0, 300));
  process.exit(1);
}

console.log("Success. Add this line to .env (and Railway worker vars for production):\n");
console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
console.log("Do not commit it or paste it anywhere else.");
