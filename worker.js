function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyTOTP(secret, code) {
  if (!secret) return false;

  if (secret.toUpperCase().includes("SECRET=")) {
    const match = secret.match(/secret=([A-Z2-7=+]+)/i);
    if (match) secret = match[1];
  }

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
  const tokenSecret = env.ADMIN_TOKEN_SECRET || env.ADMINPASSSYXPHER || "fallback_token_secret_key";

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(tokenSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  const encodedPayload = btoa(payload);
  const sigHex = bufferToHex(signature);

  return `${encodedPayload}.${sigHex}`;
}

async function verifyAdminToken(token, env) {
  try {
    if (!token || !token.includes(".")) {
      console.log("Auth debug: Token missing or invalid format");
      return false;
    }

    const [encoded, sigHex] = token.split(".");

    const payload = atob(encoded);
    const [role, expires] = payload.split(":");

    if (role !== "admin") {
      console.log("Auth debug: Invalid role in payload:", role);
      return false;
    }
    if (Date.now() > Number(expires)) {
      console.log("Auth debug: Token expired");
      return false;
    }

    const tokenSecret = env.ADMIN_TOKEN_SECRET || env.ADMINPASSSYXPHER || "fallback_token_secret_key";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(tokenSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const expectedSignature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payload)
    );

    const expectedSigHex = bufferToHex(expectedSignature);

    if (sigHex.length !== expectedSigHex.length) {
      console.log("Auth debug: Signature length mismatch");
      return false;
    }

    let difference = 0;

    for (let i = 0; i < expectedSigHex.length; i++) {
      difference |= sigHex.charCodeAt(i) ^ expectedSigHex.charCodeAt(i);
    }

    if (difference !== 0) {
      console.log("Auth debug: Signature hash mismatch (Secret key mismatch between creation and verification)");
      return false;
    }

    return true;
  } catch (err) {
    console.error("Token verification exception:", err);
    return false;
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders
    }
  });
}

async function requireAdmin(request, env) {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) {
    return verifyAdminToken(auth.slice(7), env);
  }
  
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/admin_token=([^;]+)/);
  if (match) {
    return verifyAdminToken(match[1], env);
  }
  
  return false;
}

function cleanStr(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "string" || typeof val === "number") {
    const s = String(val).trim();
    return s === "[object Object]" ? "" : s;
  }
  if (typeof val === "object") {
    return cleanStr(
      val.name || val.title || val.label || val.username || val.text || val.difficulty || val.rating || ""
    );
  }
  return "";
}

function parseDifficulty(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "string" || typeof val === "number") {
    const s = String(val).trim();
    if (s === "[object Object]" || s.toUpperCase() === "FEATURED") return "";
    return s;
  }
  if (typeof val === "object") {
    if (val.name && typeof val.name === "string" && val.name.toUpperCase() !== "FEATURED") return String(val.name);
    if (val.label) return String(val.label);
    if (val.difficulty) return parseDifficulty(val.difficulty);
    if (val.rating) return parseDifficulty(val.rating);
    if (val.stars !== undefined && val.stars !== null) return `${val.stars} Stars`;
  }
  return "";
}

function getLevelDifficulty(botItem, d1Item) {
  const d1Diff = d1Item ? parseDifficulty(d1Item.difficulty) : "";
  if (d1Diff) return d1Diff;

  const botDiff = parseDifficulty(botItem.difficulty);
  if (botDiff) return botDiff;

  const botRating = parseDifficulty(botItem.rating);
  if (botRating) return botRating;

  const botDiffName = parseDifficulty(botItem.difficulty_name);
  if (botDiffName) return botDiffName;

  if (botItem.stars) return `${botItem.stars} Stars`;

  return "Unrated";
}

async function getSiteSettings(env) {
  const { results } = await env.DB.prepare(
    `SELECT key, value FROM site_settings ORDER BY key`
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
      } catch (e) {}
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
  }

  const combined = [];
  const processedD1Ids = new Set();

  for (const botItem of botLevels) {
    const rawId = botItem.level_id || botItem.levelId || botItem.id || "";
    const levelIdStr = String(rawId).trim();

    if (levelIdStr && deletedSet.has(levelIdStr)) {
      continue;
    }

    const botTitle = cleanStr(botItem.title || botItem.name || "");
    const botCreator = cleanStr(botItem.creator || botItem.author || "");
    const botDesc = cleanStr(botItem.description || "");
    const botVideo = cleanStr(botItem.video || botItem.video_url || botItem.youtube || botItem.link || "");

    if (levelIdStr && d1ByLevelId.has(levelIdStr)) {
      const d1Item = d1ByLevelId.get(levelIdStr);
      processedD1Ids.add(d1Item.id);

      const titleVal = cleanStr(d1Item.title || d1Item.name || botTitle);
      const creatorVal = cleanStr(d1Item.creator || botCreator);
      const diffVal = getLevelDifficulty(botItem, d1Item);
      const descVal = cleanStr(d1Item.description ?? botDesc);
      const videoVal = cleanStr(d1Item.video || d1Item.video_url || botVideo);

      combined.push({
        id: d1Item.id,
        level_id: d1Item.level_id || levelIdStr,
        title: titleVal,
        name: titleVal,
        creator: creatorVal,
        author: creatorVal,
        description: descVal,
        difficulty: diffVal,
        rating: diffVal,
        featured: diffVal,
        video: videoVal,
        video_url: videoVal,
        link: videoVal,
        is_bot: true,
        source: "bot",
        sort_order: d1Item.sort_order ?? botItem.sort_order ?? 0
      });
    } else {
      const diffVal = getLevelDifficulty(botItem, null);
      combined.push({
        id: levelIdStr || Date.now(),
        level_id: levelIdStr,
        title: botTitle,
        name: botTitle,
        creator: botCreator,
        author: botCreator,
        description: botDesc,
        difficulty: diffVal,
        rating: diffVal,
        featured: diffVal,
        video: botVideo,
        video_url: botVideo,
        link: botVideo,
        is_bot: true,
        source: "bot",
        sort_order: botItem.sort_order ?? 0
      });
    }
  }

  for (const row of d1Rows) {
    if (row.is_deleted === 1 || processedD1Ids.has(row.id)) continue;

    const titleVal = cleanStr(row.title || row.name || "");
    const creatorVal = cleanStr(row.creator || "");
    const diffVal = parseDifficulty(row.difficulty) || "Unrated";
    const descVal = cleanStr(row.description || "");
    const videoVal = cleanStr(row.video || row.video_url || row.link || "");

    combined.push({
      id: row.id,
      level_id: cleanStr(row.level_id) || String(row.id),
      title: titleVal,
      name: titleVal,
      creator: creatorVal,
      author: creatorVal,
      description: descVal,
      difficulty: diffVal,
      rating: diffVal,
      featured: diffVal,
      video: videoVal,
      video_url: videoVal,
      link: videoVal,
      is_bot: false,
      source: "manual",
      sort_order: row.sort_order ?? 0
    });
  }

  combined.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return combined;
}

function getLoginHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restricted Access</title>
  <style>
    body { background: #0a0a0b; color: #fff; font-family: monospace; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
    .box { background: #111; border: 1px solid rgba(255,255,255,0.1); padding: 2rem; max-width: 340px; width: 100%; text-align: center; }
    input { width: 100%; padding: 0.75rem; background: #0a0a0b; border: 1px solid rgba(255,255,255,0.2); color: #fff; margin-bottom: 1rem; box-sizing: border-box; font-family: monospace; }
    input:focus { border-color: #ff9e00; outline: none; }
    button { width: 100%; padding: 0.75rem; background: #ff9e00; border: none; color: #0a0a0b; font-weight: bold; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; }
    button:hover { opacity: 0.9; }
    .error { color: #ff4444; font-size: 0.8rem; margin-top: 0.5rem; display: none; }
    label { display: block; text-align: left; font-size: 0.75rem; margin-bottom: 0.3rem; color: #aaa; text-transform: uppercase; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="box">
    <h3 id="form-title">SECURE ACCESS</h3>
    <form id="login-form">
      <div id="step-password">
        <label for="password">Password</label>
        <input type="password" id="password" autocomplete="current-password" required>
        <button type="button" id="next-btn">Next</button>
      </div>
      
      <div id="step-code" class="hidden">
        <label for="code">Authenticator Code</label>
        <input type="text" id="code" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code" placeholder="000000">
        <button type="submit">Verify</button>
      </div>

      <div id="error-msg" class="error">Access Denied</div>
    </form>
  </div>
  <script>
    let verifiedPassword = "";
    const errorMsg = document.getElementById('error-msg');

    document.getElementById('next-btn').addEventListener('click', async () => {
      const pass = document.getElementById('password').value;
      if (!pass) return;
      errorMsg.style.display = 'none';
      
      try {
        const res = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pass })
        });
        const data = await res.json();
        if (data.ok) {
          verifiedPassword = pass;
          document.getElementById('step-password').classList.add('hidden');
          document.getElementById('step-code').classList.remove('hidden');
          document.getElementById('form-title').textContent = '2FA VERIFICATION';
          document.getElementById('code').focus();
        } else {
          errorMsg.textContent = 'Invalid Password';
          errorMsg.style.display = 'block';
        }
      } catch (err) {
        errorMsg.textContent = 'Verification failed';
        errorMsg.style.display = 'block';
      }
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('code').value;
      errorMsg.style.display = 'none';
      
      try {
        const res = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: verifiedPassword, code: code })
        });
        const data = await res.json();
        if (data.ok) {
          window.location.reload();
        } else {
          errorMsg.textContent = 'Invalid Authenticator Code';
          errorMsg.style.display = 'block';
        }
      } catch (err) {
        errorMsg.textContent = 'Verification failed';
        errorMsg.style.display = 'block';
      }
    });
  </script>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/verify" && request.method === "POST") {
      try {
        const body = await request.json();
        const code = String(body.code || "");
        const password = String(body.password || "");
        
        const correctPassword = env.ADMINPASSSYXPHER || "";
        
        if (password !== correctPassword) {
          return json({ ok: false, error: "Invalid Password" }, 401);
        }

        if (!code) {
          return json({ ok: true, step: "password_verified" }, 200);
        }

        if (!/^\d{6}$/.test(code)) return json({ ok: false, error: "Invalid Code" }, 400);
        const valid = await verifyTOTP(env.TOTP_SECRET, code);
        if (!valid) return json({ ok: false, error: "Invalid Code" }, 401);

        const token = await createAdminToken(env);
        
        const isSecure = url.protocol === "https:";
        const secureAttr = isSecure ? "Secure; " : "";

        return json({ ok: true, token }, 200, {
          "Set-Cookie": `admin_token=${token}; Path=/; ${secureAttr}HttpOnly; SameSite=Lax; Max-Age=604800`
        });
      } catch (error) {
        console.error(error);
        return json({ ok: false }, 500);
      }
    }

    if (url.pathname === "/api/site-settings" && request.method === "GET") {
      try {
        const settings = await getSiteSettings(env);
        return json(settings);
      } catch (error) {
        console.error(error);
        return json({ error: "Could not load site settings" }, 500);
      }
    }

    if (url.pathname === "/api/admin/site-settings" && request.method === "GET") {
      if (!(await requireAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
      try {
        const settings = await getSiteSettings(env);
        return json(settings);
      } catch (error) {
        console.error(error);
        return json({ error: "Could not load settings" }, 500);
      }
    }

    if (url.pathname === "/api/admin/site-settings" && request.method === "PUT") {
      if (!(await requireAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
      try {
        const body = await request.json();
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return json({ error: "Invalid settings" }, 400);
        }

        const entries = Object.entries(body);
        const statements = entries.map(([key, value]) =>
          env.DB.prepare(
            `INSERT INTO site_settings (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`
          ).bind(String(key), String(value ?? ""))
        );

        if (statements.length) await env.DB.batch(statements);
        return json({ ok: true });
      } catch (error) {
        console.error(error);
        return json({ error: "Could not save settings" }, 500);
      }
    }

    if (url.pathname === "/api/showcase" && request.method === "GET") {
      try {
        const { results } = await env.DB.prepare(
          `SELECT id, title, category, description, image, link, sort_order FROM showcase_items ORDER BY sort_order ASC, id ASC`
        ).all();
        return json(results || []);
      } catch (error) {
        console.error(error);
        return json({ error: "Could not load showcase" }, 500);
      }
    }

    if (url.pathname === "/api/admin/showcase" && request.method === "GET") {
      if (!(await requireAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
      const { results } = await env.DB.prepare(
        `SELECT id, title, category, description, image, link, sort_order FROM showcase_items ORDER BY sort_order ASC, id ASC`
      ).all();
      return json(results || []);
    }

    if (url.pathname === "/api/admin/showcase" && request.method === "POST") {
      if (!(await requireAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
      try {
        const body = await request.json();
        if (!body.title) return json({ error: "Title is required" }, 400);

        const max = await env.DB.prepare(
          `SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM showcase_items`
        ).first();
        const sortOrder = Number(max?.max_order || 0) + 1;

        const result = await env.DB.prepare(
          `INSERT INTO showcase_items (title, category, description, image, link, sort_order) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          body.title,
          body.category || "",
          body.description || "",
          body.image || "",
          body.link || "",
          sortOrder
        ).run();

        return json({ ok: true, id: result.meta.last_row_id });
      } catch (error) {
        console.error(error);
        return json({ error: "Could not create item" }, 500);
      }
    }

    if (url.pathname.startsWith("/api/admin/showcase/") && request.method === "PUT") {
      if (!(await requireAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
      try {
        const id = url.pathname.split("/").pop();
        const body = await request.json();

        await env.DB.prepare(
          `UPDATE showcase_items SET title = ?, category = ?, description = ?, image = ?, link = ? WHERE id = ?`
        ).bind(
          body.title || "",
          body.category || "",
          body.description || "",
          body.image || "",
          body.link || "",
          id
        ).run();

        return json({ ok: true });
      } catch (error) {
        console.error(error);
        return json({ error: "Could not update item" }, 500);
      }
    }

    if (url.pathname.startsWith("/api/admin/showcase/") && request.method === "DELETE") {
      if (!(await requireAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
      try {
        const id = url.pathname.split("/").pop();
        await env.DB.prepare(`DELETE FROM showcase_items WHERE id = ?`).bind(id).run();
        return json({ ok: true });
      } catch (error) {
        console.error(error);
        return json({ error: "Could not delete item" }, 500);
      }
    }

    if (url.pathname === "/api/admin/showcase/reorder" && request.method === "POST") {
      if (!(await requireAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
      try {
        const body = await request.json();
        if (!Array.isArray(body.ids)) return json({ error: "Invalid order" }, 400);

        const statements = body.ids.map((id, index) =>
          env.DB.prepare(`UPDATE showcase_items SET sort_order = ? WHERE id = ?`).bind(index + 1, id)
        );

        if (statements.length) await env.DB.batch(statements);
        return json({ ok: true });
      } catch (error) {
        console.error(error);
        return json({ error: "Could not reorder items" }, 500);
      }
    }

    if ((url.pathname === "/api/admin/levels" || url.pathname === "/api/admin/gd-levels") && request.method === "GET") {
      if (!(await requireAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
      try {
        const levels = await getAllLevels(env);
        return json(levels);
      } catch (error) {
        console.error(error);
        return json({ error: "Could not load levels" }, 500);
      }
    }

    if ((url.pathname === "/api/admin/levels" || url.pathname === "/api/admin/gd-levels") && request.method === "POST") {
      if (!(await requireAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
      try {
        await ensureLevelsTable(env);
        const body = await request.json();

        const title = cleanStr(body.title || body.name || "");
        const levelId = cleanStr(body.level_id || body.levelId || Date.now());

        if (!title && !levelId) return json({ error: "Title or Level ID is required" }, 400);

        const videoLink = cleanStr(body.video || body.video_url || body.youtube || body.link || "");
        const creator = cleanStr(body.creator || body.author || "");
        const difficulty = cleanStr(body.difficulty || body.rating || body.featured || "Unrated");
        const description = cleanStr(body.description || "");

        const max = await env.DB.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM levels`).first();
        const sortOrder = Number(max?.max_order || 0) + 1;

        const existing = await env.DB.prepare(`SELECT id FROM levels WHERE level_id = ?`).bind(levelId).first();

        if (existing) {
          await env.DB.prepare(
            `UPDATE levels SET title = ?, name = ?, creator = ?, description = ?, video = ?, video_url = ?, link = ?, difficulty = ?, is_deleted = 0 WHERE level_id = ?`
          ).bind(title, title, creator, description, videoLink, videoLink, String(body.link || videoLink), difficulty, levelId).run();
          return json({ ok: true, id: existing.id });
        } else {
          const result = await env.DB.prepare(
            `INSERT INTO levels (level_id, title, name, creator, description, video, video_url, link, difficulty, sort_order, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
          ).bind(levelId, title, title, creator, description, videoLink, videoLink, String(body.link || videoLink), difficulty, sortOrder).run();
          return json({ ok: true, id: result.meta?.last_row_id || levelId });
        }
      } catch (error) {
        console.error("Add level error:", error);
        return json({ error: "Could not create level" }, 500);
      }
    }

    if (
      (url.pathname.startsWith("/api/admin/levels/") || url.pathname.startsWith("/api/admin/gd-levels/")) &&
      !url.pathname.endsWith("/reorder") &&
      request.method === "PUT"
    ) {
      if (!(await requireAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
      try {
        await ensureLevelsTable(env);
        const id = url.pathname.split("/").pop();
        const body = await request.json();

        const title = cleanStr(body.title || body.name || "");
        const videoLink = cleanStr(body.video || body.video_url || body.youtube || body.link || "");
        const levelId = cleanStr(body.level_id || body.levelId || id);
        const creator = cleanStr(body.creator || body.author || "");
        const difficulty = cleanStr(body.difficulty || body.rating || body.featured || "Unrated");
        const description = cleanStr(body.description || "");

        const existing = await env.DB.prepare(`SELECT id FROM levels WHERE level_id = ? OR id = ?`).bind(levelId, id).first();

        if (existing) {
          await env.DB.prepare(
            `UPDATE levels SET title = ?, name = ?, creator = ?, description = ?, video = ?, video_url = ?, link = ?, difficulty = ?, is_deleted = 0 WHERE id = ?`
          ).bind(title, title, creator, description, videoLink, videoLink, String(body.link || videoLink), difficulty, existing.id).run();
        } else {
          await env.DB.prepare(
            `INSERT INTO levels (level_id, title, name, creator, description, video, video_url, link, difficulty, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
          ).bind(levelId, title, title, creator, description, videoLink, videoLink, String(body.link || videoLink), difficulty).run();
        }

        return json({ ok: true });
      } catch (error) {
        console.error("Edit level error:", error);
        return json({ error: "Could not update level" }, 500);
      }
    }

    if (
      (url.pathname.startsWith("/api/admin/levels/") || url.pathname.startsWith("/api/admin/gd-levels/")) &&
      !url.pathname.endsWith("/reorder") &&
      request.method === "DELETE"
    ) {
      if (!(await requireAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
      try {
        await ensureLevelsTable(env);
        const id = String(url.pathname.split("/").pop());

        const existing = await env.DB.prepare(`SELECT id FROM levels WHERE level_id = ? OR id = ?`).bind(id, id).first();

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

    if (
      (url.pathname === "/api/admin/levels/reorder" || url.pathname === "/api/admin/gd-levels/reorder") &&
      request.method === "POST"
    ) {
      if (!(await requireAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
      try {
        await ensureLevelsTable(env);
        const body = await request.json();
        if (!Array.isArray(body.ids)) return json({ error: "Invalid order" }, 400);

        for (let index = 0; index < body.ids.length; index++) {
          const idStr = String(body.ids[index]);
          const order = index + 1;

          const existing = await env.DB.prepare(`SELECT id FROM levels WHERE level_id = ? OR id = ?`).bind(idStr, idStr).first();

          if (existing) {
            await env.DB.prepare(`UPDATE levels SET sort_order = ? WHERE id = ?`).bind(order, existing.id).run();
          } else {
            await env.DB.prepare(`INSERT INTO levels (level_id, sort_order) VALUES (?, ?)`).bind(idStr, order).run();
          }
        }

        return json({ ok: true });
      } catch (error) {
        console.error("Reorder error:", error);
        return json({ error: "Could not reorder levels" }, 500);
      }
    }

    if (
      (url.pathname === "/api/levels" || 
       url.pathname === "/api/gd-levels" || 
       url.pathname === "/api/curated" || 
       url.pathname === "/api/get-levels" || 
       url.pathname === "/tracked-levels.json") &&
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

    const cookieHeader = request.headers.get("Cookie") || "";
    const match = cookieHeader.match(/admin_token=([^;]+)/);
    let isAuthenticated = false;

    if (match) {
      isAuthenticated = await verifyAdminToken(match[1], env);
    }

    if (!isAuthenticated) {
      return new Response(getLoginHtml(), {
        status: 200,
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
