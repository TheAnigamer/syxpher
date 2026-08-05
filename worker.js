async function verifyTOTP(secret, code) {
  if (!secret) return false;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  secret = secret.replace(/[\s=]/g, "").toUpperCase();

  let bits = "";

  for (const char of secret) {
    const value = alphabet.indexOf(char);
    if (value === -1) return false;
    bits += value.toString(2).padStart(5, "0");
  }

  const bytes = [];

  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(bytes),
    {
      name: "HMAC",
      hash: "SHA-1"
    },
    false,
    ["sign"]
  );

  const counter = Math.floor(Date.now() / 1000 / 30);

  for (const offset of [-1, 0, 1]) {
    const current = counter + offset;
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);

    view.setUint32(0, Math.floor(current / 4294967296));
    view.setUint32(4, current >>> 0);

    const signature = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, buffer)
    );

    const index = signature[19] & 15;

    const number =
      ((signature[index] & 127) << 24) |
      (signature[index + 1] << 16) |
      (signature[index + 2] << 8) |
      signature[index + 3];

    const generated = String(number % 1000000).padStart(6, "0");

    if (generated === code) return true;
  }

  return false;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Authenticator
    if (url.pathname === "/api/verify" && request.method === "POST") {
      try {
        const body = await request.json();
        const code = String(body.code || "");

        if (!/^\d{6}$/.test(code)) {
          return Response.json({ ok: false }, { status: 400 });
        }

        const valid = await verifyTOTP(env.TOTP_SECRET, code);

        return Response.json({ ok: valid });
      } catch (error) {
        console.error("TOTP verification error:", error);

        return Response.json(
          { ok: false, error: "Authentication error" },
          { status: 500 }
        );
      }
    }

    // Geometry Dash levels
    if (url.pathname === "/api/levels") {
      const response = await fetch(
        "https://gd-sync-308073055710.us-south1.run.app/?mode=curated",
        {
          headers: {
            Accept: "application/json"
          }
        }
      );

      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") || "application/json",
          "Cache-Control": "no-store"
        }
      });
    }

    // Website
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Site assets unavailable", { status: 500 });
  }
};
