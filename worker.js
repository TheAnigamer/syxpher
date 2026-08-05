const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input) {
  input = input.replace(/[\s=]/g, "").toUpperCase();

  let bits = "";

  for (const char of input) {
    const value = BASE32.indexOf(char);
    if (value < 0) continue;
    bits += value.toString(2).padStart(5, "0");
  }

  const bytes = [];

  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return new Uint8Array(bytes);
}

async function generateTOTP(secret, counter) {
  const key = await crypto.subtle.importKey(
    "raw",
    base32Decode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);

  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);

  const hmac = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, buffer)
  );

  const offset = hmac[hmac.length - 1] & 0x0f;

  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];

  return String(binary % 1000000).padStart(6, "0");
}

async function verifyTOTP(secret, code) {
  const counter = Math.floor(Date.now() / 1000 / 30);

  // Allow 30 seconds before/after to handle small clock differences.
  for (const offset of [-1, 0, 1]) {
    if (await generateTOTP(secret, counter + offset) === code) {
      return true;
    }
  }

  return false;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Google Authenticator verification
    if (url.pathname === "/api/verify" && request.method === "POST") {
      try {
        const { code } = await request.json();

        if (!/^\d{6}$/.test(code)) {
          return Response.json({ ok: false });
        }

        const valid = await verifyTOTP(env.TOTP_SECRET, code);

        return Response.json({ ok: valid });
      } catch {
        return Response.json({ ok: false }, { status: 400 });
      }
    }

    // Geometry Dash levels API
    if (url.pathname === "/api/levels") {
      const apiResponse = await fetch(
        "https://gd-sync-308073055710.us-south1.run.app/?mode=curated",
        {
          headers: {
            Accept: "application/json"
          }
        }
      );

      return new Response(apiResponse.body, {
        status: apiResponse.status,
        headers: {
          "Content-Type":
            apiResponse.headers.get("Content-Type") || "application/json",
          "Cache-Control": "no-store"
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
