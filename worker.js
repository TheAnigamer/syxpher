async function verifyTOTP(secret, code) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  secret = secret.replace(/[\s=]/g, "").toUpperCase();

  let bits = "";
  for (const char of secret) {
    const value = alphabet.indexOf(char);
    if (value < 0) return false;
    bits += value.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(bytes),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000 / 30);

  for (const offset of [-1, 0, 1]) {
    const counter = now + offset;
    const data = new ArrayBuffer(8);
    const view = new DataView(data);

    view.setUint32(0, Math.floor(counter / 4294967296));
    view.setUint32(4, counter >>> 0);

    const signature = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, data)
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

    if (url.pathname === "/api/verify" && request.method === "POST") {
      try {
        const body = await request.json();
        const code = String(body.code || "");

        if (!/^\d{6}$/.test(code)) {
          return Response.json({ ok: false });
        }

        const valid = await verifyTOTP(env.TOTP_SECRET, code);

        return Response.json({ ok: valid });
      } catch (error) {
        console.error("TOTP error:", error);
        return Response.json(
          { ok: false, error: "Authentication server error" },
          { status: 500 }
        );
      }
    }

    if (url.pathname === "/api/levels") {
      const apiResponse = await fetch(
        "https://gd-sync-308073055710.us-south1.run.app/?mode=curated",
        {
          headers: { Accept: "application/json" }
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
