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
    { name: "HMAC", hash: "SHA-1" },
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

async function createAdminToken(env) {
  const expires = Date.now() + 30 * 60 * 1000;

  const payload = `admin:${expires}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.ADMIN_TOKEN_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payload)
    )
  );

  const encoded = btoa(
    String.fromCharCode(...new TextEncoder().encode(payload))
  );

  const sig = btoa(String.fromCharCode(...signature));

  return `${encoded}.${sig}`;
}

async function verifyAdminToken(token, env) {
  try {
    if (!token || !token.includes(".")) return false;

    const [encoded, sig] = token.split(".");

    const payload = new TextDecoder().decode(
      Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
    );

    const [role, expires] = payload.split(":");

    if (role !== "admin") return false;
    if (Date.now() > Number(expires)) return false;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.ADMIN_TOKEN_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const expected = new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(payload)
      )
    );

    const actual = Uint8Array.from(
      atob(sig),
      c => c.charCodeAt(0)
    );

    if (actual.length !== expected.length) return false;

    let difference = 0;

    for (let i = 0; i < expected.length; i++) {
      difference |= expected[i] ^ actual[i];
    }

    return difference === 0;
  } catch {
    return false;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

async function requireAdmin(request, env) {
  const auth = request.headers.get("Authorization") || "";

  if (!auth.startsWith("Bearer ")) {
    return false;
  }

  return verifyAdminToken(auth.slice(7), env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Admin login
    if (url.pathname === "/api/verify" && request.method === "POST") {
      try {
        const body = await request.json();
        const code = String(body.code || "");

        if (!/^\d{6}$/.test(code)) {
          return json({ ok: false }, 400);
        }

        const valid = await verifyTOTP(env.TOTP_SECRET, code);

        if (!valid) {
          return json({ ok: false });
        }

        const token = await createAdminToken(env);

        return json({
          ok: true,
          token
        });
      } catch (error) {
        console.error(error);
        return json({ ok: false }, 500);
      }
    }

    // Load showcase items
    if (
      url.pathname === "/api/admin/showcase" &&
      request.method === "GET"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json({ error: "Unauthorized" }, 401);
      }

      const { results } = await env.DB.prepare(
        `SELECT id, title, category, description, image, link, sort_order
         FROM showcase_items
         ORDER BY sort_order ASC, id ASC`
      ).all();

      return json(results);
    }

    // Add showcase item
    if (
      url.pathname === "/api/admin/showcase" &&
      request.method === "POST"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json({ error: "Unauthorized" }, 401);
      }

      const body = await request.json();

      if (!body.title) {
        return json({ error: "Title is required" }, 400);
      }

      const max = await env.DB.prepare(
        `SELECT COALESCE(MAX(sort_order), 0) AS max_order
         FROM showcase_items`
      ).first();

      const sortOrder = Number(max?.max_order || 0) + 1;

      const result = await env.DB.prepare(
        `INSERT INTO showcase_items
         (title, category, description, image, link, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          body.title,
          body.category || "",
          body.description || "",
          body.image || "",
          body.link || "",
          sortOrder
        )
        .run();

      return json({
        ok: true,
        id: result.meta.last_row_id
      });
    }

    // Edit showcase item
    if (
      url.pathname.startsWith("/api/admin/showcase/") &&
      request.method === "PUT"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json({ error: "Unauthorized" }, 401);
      }

      const id = url.pathname.split("/").pop();
      const body = await request.json();

      await env.DB.prepare(
        `UPDATE showcase_items
         SET title = ?,
             category = ?,
             description = ?,
             image = ?,
             link = ?
         WHERE id = ?`
      )
        .bind(
          body.title || "",
          body.category || "",
          body.description || "",
          body.image || "",
          body.link || "",
          id
        )
        .run();

      return json({ ok: true });
    }

    // Delete showcase item
    if (
      url.pathname.startsWith("/api/admin/showcase/") &&
      request.method === "DELETE"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json({ error: "Unauthorized" }, 401);
      }

      const id = url.pathname.split("/").pop();

      await env.DB.prepare(
        `DELETE FROM showcase_items WHERE id = ?`
      )
        .bind(id)
        .run();

      return json({ ok: true });
    }

    // Reorder showcase items
    if (
      url.pathname === "/api/admin/showcase/reorder" &&
      request.method === "POST"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json({ error: "Unauthorized" }, 401);
      }

      const body = await request.json();

      if (!Array.isArray(body.ids)) {
        return json({ error: "Invalid order" }, 400);
      }

      const statements = body.ids.map((id, index) =>
        env.DB.prepare(
          `UPDATE showcase_items
           SET sort_order = ?
           WHERE id = ?`
        ).bind(index + 1, id)
      );

      await env.DB.batch(statements);

      return json({ ok: true });
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
            response.headers.get("Content-Type") ||
            "application/json",
          "Cache-Control": "no-store"
        }
      });
    }

    // Static site
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Site assets unavailable", {
      status: 500
    });
  }
};
