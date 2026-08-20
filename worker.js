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
    String.fromCharCode(
      ...new TextEncoder().encode(payload)
    )
  );

  const sig = btoa(
    String.fromCharCode(...signature)
  );

  return `${encoded}.${sig}`;
}

async function verifyAdminToken(token, env) {
  try {
    if (!token || !token.includes(".")) return false;

    const [encoded, sig] = token.split(".");

    const payload = new TextDecoder().decode(
      Uint8Array.from(
        atob(encoded),
        c => c.charCodeAt(0)
      )
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
  const auth =
    request.headers.get("Authorization") || "";

  if (!auth.startsWith("Bearer ")) {
    return false;
  }

  return verifyAdminToken(
    auth.slice(7),
    env
  );
}


// ==========================================
// DB & MIGRATION HELPERS
// ==========================================

async function getSiteSettings(env) {
  const { results } = await env.DB.prepare(
    `SELECT key, value
     FROM site_settings
     ORDER BY key`
  ).all();

  const settings = {};

  for (const row of results || []) {
    settings[row.key] = row.value;
  }

  return settings;
}

async function ensureLevelsTable(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS levels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level_id TEXT,
        title TEXT,
        name TEXT,
        creator TEXT,
        description TEXT,
        video TEXT,
        video_url TEXT,
        link TEXT,
        difficulty TEXT,
        sort_order INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0
      )
    `).run();

    // Auto-migrate missing columns for pre-existing tables
    const extraCols = [
      ["level_id", "TEXT"],
      ["is_deleted", "INTEGER DEFAULT 0"],
      ["sort_order", "INTEGER DEFAULT 0"],
      ["video_url", "TEXT"],
      ["link", "TEXT"],
      ["difficulty", "TEXT"],
      ["creator", "TEXT"],
      ["description", "TEXT"]
    ];

    for (const [col, type] of extraCols) {
      try {
        await env.DB.prepare(`ALTER TABLE levels ADD COLUMN ${col} ${type}`).run();
      } catch (e) {
        // Column already exists
      }
    }
  } catch (e) {
    console.error("Could not initialize levels table:", e);
  }
}

async function getAllLevels(env) {
  await ensureLevelsTable(env);

  let botLevels = [];
  try {
    const res = await fetch(
      "https://gd-sync-308073055710.us-south1.run.app/?mode=curated",
      { headers: { Accept: "application/json" } }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        botLevels = data;
      } else if (data && Array.isArray(data.levels)) {
        botLevels = data.levels;
      } else if (data && Array.isArray(data.data)) {
        botLevels = data.data;
      }
    }
  } catch (e) {
    console.error("Cloud Run GD fetch failed:", e);
  }

  let d1Rows = [];
  try {
    const { results } = await env.DB.prepare(`SELECT * FROM levels`).all();
    d1Rows = results || [];
  } catch (e) {
    console.error("D1 levels fetch failed:", e);
  }

  const d1ByLevelId = new Map();
  const d1ById = new Map();
  const deletedSet = new Set();

  for (const row of d1Rows) {
    const idKey = String(row.id);
    const levelIdKey = row.level_id ? String(row.level_id) : "";

    if (row.is_deleted === 1) {
      if (levelIdKey) deletedSet.add(levelIdKey);
      if (idKey) deletedSet.add(idKey);
      continue;
    }

    if (levelIdKey) d1ByLevelId.set(levelIdKey, row);
    if (idKey) d1ById.set(idKey, row);
  }

  const combined = [];
  const processedD1Ids = new Set();

  for (const botItem of botLevels) {
    const rawId = botItem.level_id || botItem.levelId || botItem.id || "";
    const levelIdStr = String(rawId).trim();

    if (levelIdStr && deletedSet.has(levelIdStr)) {
      continue;
    }

    if (levelIdStr && d1ByLevelId.has(levelIdStr)) {
      const d1Item = d1ByLevelId.get(levelIdStr);
      processedD1Ids.add(d1Item.id);

      combined.push({
        id: d1Item.id,
        level_id: d1Item.level_id || levelIdStr,
        title: d1Item.title || d1Item.name || botItem.title || botItem.name || "",
        name: d1Item.name || d1Item.title || botItem.name || botItem.title || "",
        creator: d1Item.creator || botItem.creator || botItem.author || "",
        description: d1Item.description ?? botItem.description ?? "",
        video: d1Item.video || d1Item.video_url || botItem.video || botItem.video_url || botItem.link || "",
        video_url: d1Item.video_url || d1Item.video || botItem.video_url || botItem.video || "",
        link: d1Item.link || d1Item.video || botItem.link || "",
        difficulty: d1Item.difficulty || botItem.difficulty || "",
        sort_order: d1Item.sort_order ?? botItem.sort_order ?? 0
      });
    } else {
      combined.push({
        id: levelIdStr || Date.now(),
        level_id: levelIdStr,
        title: botItem.title || botItem.name || "",
        name: botItem.name || botItem.title || "",
        creator: botItem.creator || botItem.author || "",
        description: botItem.description || "",
        video: botItem.video || botItem.video_url || botItem.youtube || botItem.link || "",
        video_url: botItem.video_url || botItem.video || botItem.youtube || botItem.link || "",
        link: botItem.link || botItem.video || "",
        difficulty: botItem.difficulty || "",
        sort_order: botItem.sort_order ?? 0
      });
    }
  }

  for (const row of d1Rows) {
    if (row.is_deleted === 1 || processedD1Ids.has(row.id)) continue;

    combined.push({
      id: row.id,
      level_id: row.level_id || String(row.id),
      title: row.title || row.name || "",
      name: row.name || row.title || "",
      creator: row.creator || "",
      description: row.description || "",
      video: row.video || row.video_url || row.link || "",
      video_url: row.video_url || row.video || row.link || "",
      link: row.link || row.video || "",
      difficulty: row.difficulty || "",
      sort_order: row.sort_order ?? 0
    });
  }

  combined.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return combined;
}


// ==========================================
// WORKER MAIN
// ==========================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ========================================
    // ADMIN LOGIN
    // ========================================

    if (
      url.pathname === "/api/verify" &&
      request.method === "POST"
    ) {
      try {
        const body = await request.json();
        const code = String(body.code || "");

        if (!/^\d{6}$/.test(code)) {
          return json({ ok: false }, 400);
        }

        const valid = await verifyTOTP(
          env.TOTP_SECRET,
          code
        );

        if (!valid) {
          return json({ ok: false });
        }

        const token =
          await createAdminToken(env);

        return json({
          ok: true,
          token
        });
      } catch (error) {
        console.error(error);

        return json(
          { ok: false },
          500
        );
      }
    }


    // ========================================
    // PUBLIC SITE SETTINGS
    // ========================================

    if (
      url.pathname === "/api/site-settings" &&
      request.method === "GET"
    ) {
      try {
        const settings =
          await getSiteSettings(env);

        return json(settings);
      } catch (error) {
        console.error(error);

        return json(
          {
            error: "Could not load site settings"
          },
          500
        );
      }
    }


    // ========================================
    // ADMIN SITE SETTINGS
    // ========================================

    if (
      url.pathname === "/api/admin/site-settings" &&
      request.method === "GET"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json(
          { error: "Unauthorized" },
          401
        );
      }

      try {
        const settings =
          await getSiteSettings(env);

        return json(settings);
      } catch (error) {
        console.error(error);

        return json(
          {
            error: "Could not load settings"
          },
          500
        );
      }
    }


    if (
      url.pathname === "/api/admin/site-settings" &&
      request.method === "PUT"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json(
          { error: "Unauthorized" },
          401
        );
      }

      try {
        const body = await request.json();

        if (
          !body ||
          typeof body !== "object" ||
          Array.isArray(body)
        ) {
          return json(
            { error: "Invalid settings" },
            400
          );
        }

        const entries =
          Object.entries(body);

        const statements = entries.map(
          ([key, value]) => {
            return env.DB.prepare(
              `INSERT INTO site_settings
               (key, value)
               VALUES (?, ?)
               ON CONFLICT(key)
               DO UPDATE SET value = excluded.value`
            ).bind(
              String(key),
              String(value ?? "")
            );
          }
        );

        if (statements.length) {
          await env.DB.batch(statements);
        }

        return json({
          ok: true
        });
      } catch (error) {
        console.error(error);

        return json(
          {
            error: "Could not save settings"
          },
          500
        );
      }
    }


    // ========================================
    // PUBLIC SHOWCASE
    // ========================================

    if (
      url.pathname === "/api/showcase" &&
      request.method === "GET"
    ) {
      try {
        const { results } =
          await env.DB.prepare(
            `SELECT id,
                    title,
                    category,
                    description,
                    image,
                    link,
                    sort_order
             FROM showcase_items
             ORDER BY sort_order ASC, id ASC`
          ).all();

        return json(results || []);
      } catch (error) {
        console.error(error);

        return json(
          {
            error: "Could not load showcase"
          },
          500
        );
      }
    }


    // ========================================
    // ADMIN SHOWCASE GET
    // ========================================

    if (
      url.pathname === "/api/admin/showcase" &&
      request.method === "GET"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json(
          { error: "Unauthorized" },
          401
        );
      }

      const { results } =
        await env.DB.prepare(
          `SELECT id,
                  title,
                  category,
                  description,
                  image,
                  link,
                  sort_order
           FROM showcase_items
           ORDER BY sort_order ASC, id ASC`
        ).all();

      return json(results || []);
    }


    // ========================================
    // ADD SHOWCASE ITEM
    // ========================================

    if (
      url.pathname === "/api/admin/showcase" &&
      request.method === "POST"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json(
          { error: "Unauthorized" },
          401
        );
      }

      try {
        const body =
          await request.json();

        if (!body.title) {
          return json(
            {
              error: "Title is required"
            },
            400
          );
        }

        const max =
          await env.DB.prepare(
            `SELECT COALESCE(
              MAX(sort_order), 0
            ) AS max_order
             FROM showcase_items`
          ).first();

        const sortOrder =
          Number(max?.max_order || 0) + 1;

        const result =
          await env.DB.prepare(
            `INSERT INTO showcase_items
             (
               title,
               category,
               description,
               image,
               link,
               sort_order
             )
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
      } catch (error) {
        console.error(error);

        return json(
          {
            error: "Could not create item"
          },
          500
        );
      }
    }


    // ========================================
    // EDIT SHOWCASE ITEM
    // ========================================

    if (
      url.pathname.startsWith(
        "/api/admin/showcase/"
      ) &&
      request.method === "PUT"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json(
          { error: "Unauthorized" },
          401
        );
      }

      try {
        const id =
          url.pathname.split("/").pop();

        const body =
          await request.json();

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

        return json({
          ok: true
        });
      } catch (error) {
        console.error(error);

        return json(
          {
            error: "Could not update item"
          },
          500
        );
      }
    }


    // ========================================
    // DELETE SHOWCASE ITEM
    // ========================================

    if (
      url.pathname.startsWith(
        "/api/admin/showcase/"
      ) &&
      request.method === "DELETE"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json(
          { error: "Unauthorized" },
          401
        );
      }

      try {
        const id =
          url.pathname.split("/").pop();

        await env.DB.prepare(
          `DELETE FROM showcase_items
           WHERE id = ?`
        )
          .bind(id)
          .run();

        return json({
          ok: true
        });
      } catch (error) {
        console.error(error);

        return json(
          {
            error: "Could not delete item"
          },
          500
        );
      }
    }


    // ========================================
    // REORDER SHOWCASE
    // ========================================

    if (
      url.pathname ===
        "/api/admin/showcase/reorder" &&
      request.method === "POST"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json(
          { error: "Unauthorized" },
          401
        );
      }

      try {
        const body =
          await request.json();

        if (!Array.isArray(body.ids)) {
          return json(
            {
              error: "Invalid order"
            },
            400
          );
        }

        const statements =
          body.ids.map(
            (id, index) =>
              env.DB.prepare(
                `UPDATE showcase_items
                 SET sort_order = ?
                 WHERE id = ?`
              ).bind(
                index + 1,
                id
              )
          );

        if (statements.length) {
          await env.DB.batch(
            statements
          );
        }

        return json({
          ok: true
        });
      } catch (error) {
        console.error(error);

        return json(
          {
            error: "Could not reorder items"
          },
          500
        );
      }
    }


    // ========================================
    // ADMIN GD LEVELS GET
    // ========================================

    if (
      (url.pathname === "/api/admin/levels" ||
       url.pathname === "/api/admin/gd-levels") &&
      request.method === "GET"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json({ error: "Unauthorized" }, 401);
      }

      try {
        const levels = await getAllLevels(env);
        return json(levels);
      } catch (error) {
        console.error(error);
        return json({ error: "Could not load levels" }, 500);
      }
    }


    // ========================================
    // ADD GD LEVEL
    // ========================================

    if (
      (url.pathname === "/api/admin/levels" ||
       url.pathname === "/api/admin/gd-levels") &&
      request.method === "POST"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json({ error: "Unauthorized" }, 401);
      }

      try {
        await ensureLevelsTable(env);
        const body = await request.json();

        const title = String(body.title || body.name || "");
        const levelId = String(body.level_id || body.levelId || Date.now());

        if (!title && !levelId) {
          return json({ error: "Title or Level ID is required" }, 400);
        }

        const videoLink = String(body.video || body.video_url || body.youtube || body.link || "");

        const max = await env.DB.prepare(
          `SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM levels`
        ).first();

        const sortOrder = Number(max?.max_order || 0) + 1;

        const existing = await env.DB.prepare(
          `SELECT id FROM levels WHERE level_id = ?`
        ).bind(levelId).first();

        if (existing) {
          await env.DB.prepare(
            `UPDATE levels SET
               title = ?, name = ?, creator = ?, description = ?,
               video = ?, video_url = ?, link = ?, difficulty = ?, is_deleted = 0
             WHERE level_id = ?`
          ).bind(
            title, title, String(body.creator || body.author || ""),
            String(body.description || ""), videoLink, videoLink,
            String(body.link || videoLink), String(body.difficulty || ""), levelId
          ).run();

          return json({ ok: true, id: existing.id });
        } else {
          const result = await env.DB.prepare(
            `INSERT INTO levels (
               level_id, title, name, creator, description,
               video, video_url, link, difficulty, sort_order, is_deleted
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
          ).bind(
            levelId, title, title, String(body.creator || body.author || ""),
            String(body.description || ""), videoLink, videoLink,
            String(body.link || videoLink), String(body.difficulty || ""), sortOrder
          ).run();

          return json({ ok: true, id: result.meta?.last_row_id || levelId });
        }
      } catch (error) {
        console.error("Add level error:", error);
        return json({ error: "Could not create level" }, 500);
      }
    }


    // ========================================
    // EDIT GD LEVEL
    // ========================================

    if (
      (url.pathname.startsWith("/api/admin/levels/") ||
       url.pathname.startsWith("/api/admin/gd-levels/")) &&
      !url.pathname.endsWith("/reorder") &&
      request.method === "PUT"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json({ error: "Unauthorized" }, 401);
      }

      try {
        await ensureLevelsTable(env);
        const id = url.pathname.split("/").pop();
        const body = await request.json();

        const title = String(body.title || body.name || "");
        const videoLink = String(body.video || body.video_url || body.youtube || body.link || "");
        const levelId = String(body.level_id || body.levelId || id);

        const existing = await env.DB.prepare(
          `SELECT id FROM levels WHERE level_id = ? OR id = ?`
        ).bind(levelId, id).first();

        if (existing) {
          await env.DB.prepare(
            `UPDATE levels SET
               title = ?, name = ?, creator = ?, description = ?,
               video = ?, video_url = ?, link = ?, difficulty = ?, is_deleted = 0
             WHERE id = ?`
          ).bind(
            title, title, String(body.creator || body.author || ""),
            String(body.description || ""), videoLink, videoLink,
            String(body.link || videoLink), String(body.difficulty || ""), existing.id
          ).run();
        } else {
          await env.DB.prepare(
            `INSERT INTO levels (
               level_id, title, name, creator, description,
               video, video_url, link, difficulty, is_deleted
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
          ).bind(
            levelId, title, title, String(body.creator || body.author || ""),
            String(body.description || ""), videoLink, videoLink,
            String(body.link || videoLink), String(body.difficulty || "")
          ).run();
        }

        return json({ ok: true });
      } catch (error) {
        console.error("Edit level error:", error);
        return json({ error: "Could not update level" }, 500);
      }
    }


    // ========================================
    // DELETE GD LEVEL
    // ========================================

    if (
      (url.pathname.startsWith("/api/admin/levels/") ||
       url.pathname.startsWith("/api/admin/gd-levels/")) &&
      !url.pathname.endsWith("/reorder") &&
      request.method === "DELETE"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json({ error: "Unauthorized" }, 401);
      }

      try {
        await ensureLevelsTable(env);
        const id = String(url.pathname.split("/").pop());

        const existing = await env.DB.prepare(
          `SELECT id FROM levels WHERE level_id = ? OR id = ?`
        ).bind(id, id).first();

        if (existing) {
          await env.DB.prepare(`UPDATE levels SET is_deleted = 1 WHERE id = ?`).bind(existing.id).run();
        } else {
          await env.DB.prepare(`INSERT INTO levels (level_id, is_deleted) VALUES (?, 1)`).bind(id).run();
        }

        return json({ ok: true });
      } catch (error) {
        console.error("Delete level error:", error);
        return json({ error: "Could not delete level" }, 500);
      }
    }


    // ========================================
    // REORDER GD LEVELS
    // ========================================

    if (
      (url.pathname === "/api/admin/levels/reorder" ||
       url.pathname === "/api/admin/gd-levels/reorder") &&
      request.method === "POST"
    ) {
      if (!(await requireAdmin(request, env))) {
        return json({ error: "Unauthorized" }, 401);
      }

      try {
        await ensureLevelsTable(env);
        const body = await request.json();

        if (!Array.isArray(body.ids)) {
          return json({ error: "Invalid order" }, 400);
        }

        for (let index = 0; index < body.ids.length; index++) {
          const idStr = String(body.ids[index]);
          const order = index + 1;

          const existing = await env.DB.prepare(
            `SELECT id FROM levels WHERE level_id = ? OR id = ?`
          ).bind(idStr, idStr).first();

          if (existing) {
            await env.DB.prepare(`UPDATE levels SET sort_order = ? WHERE id = ?`)
              .bind(order, existing.id)
              .run();
          } else {
            await env.DB.prepare(`INSERT INTO levels (level_id, sort_order) VALUES (?, ?)`)
              .bind(idStr, order)
              .run();
          }
        }

        return json({ ok: true });
      } catch (error) {
        console.error("Reorder error:", error);
        return json({ error: "Could not reorder levels" }, 500);
      }
    }


    // ========================================
    // PUBLIC GEOMETRY DASH LEVELS
    // ========================================

    if (
      url.pathname === "/api/levels" &&
      request.method === "GET"
    ) {
      try {
        const levels = await getAllLevels(env);
        return json(levels);
      } catch (error) {
        console.error(error);
        return json({ error: "Geometry Dash API unavailable" }, 502);
      }
    }


    // ========================================
    // STATIC SITE
    // ========================================

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Site assets unavailable", { status: 500 });
  }
};
