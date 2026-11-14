const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const dbApi = require("./db");
const geo = require("./geo");
const {
  CATEGORIES,
  STATUSES,
  RULES,
  haversineKm,
  shouldRemove,
  assessVote,
  voteRestriction,
} = require("./logic");

const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const UPLOADS = process.env.UPLOAD_DIR || path.join(ROOT, "data", "uploads");

function createApp() {
  fs.mkdirSync(UPLOADS, { recursive: true });
  const db = dbApi.init();
  geo.load();

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  const upload = multer({
    storage: multer.diskStorage({
      destination: UPLOADS,
      filename: (req, file, cb) => {
        const ext = extensionFor(file.mimetype);
        if (!ext) return cb(new Error("Solo imágenes JPG, PNG, WEBP o GIF"));
        cb(null, crypto.randomBytes(16).toString("hex") + ext);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 4 },
    fileFilter: (req, file, cb) => {
      if (!extensionFor(file.mimetype)) {
        cb(new Error("Solo imágenes JPG, PNG, WEBP o GIF"));
        return;
      }
      cb(null, true);
    },
  });

  app.use("/vendor/leaflet", express.static(path.join(ROOT, "node_modules", "leaflet", "dist"), { maxAge: "7d" }));
  app.use(express.static(PUBLIC));

  app.get("/uploads/:file", (req, res) => {
    const name = req.params.file;
    if (!/^[a-f0-9]{32}\.(jpg|png|webp|gif)$/.test(name)) {
      return sendError(res, 404, "No encontramos esa imagen.");
    }
    const file = path.join(UPLOADS, name);
    if (!file.startsWith(UPLOADS)) return sendError(res, 404, "No encontramos esa imagen.");
    res.sendFile(file, (error) => {
      if (error && !res.headersSent) sendError(res, 404, "No encontramos esa imagen.");
    });
  });

  app.get("/api/meta", (req, res) => {
    res.json({ categories: CATEGORIES, statuses: STATUSES, rules: RULES });
  });

  app.get("/api/geo/arbol", (req, res) => {
    res.json(geo.tree());
  });

  app.get("/api/geo/capa/:kind", (req, res) => {
    const layers = geo.publicLayers();
    const layer = req.params.kind === "ccaa" ? layers.ccaa : req.params.kind === "provincias" ? layers.provincias : null;
    if (!layer) return sendError(res, 404, "No existe esa capa.");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.json(layer);
  });

  app.get("/api/geo/buscar", (req, res) => {
    res.json(geo.searchMunicipalities(req.query.q || "", 15));
  });

  app.get("/api/geo/municipios", (req, res) => {
    if (req.query.bbox) {
      const [west, south, east, north] = String(req.query.bbox).split(",").map(Number);
      if (![west, south, east, north].every(Number.isFinite)) {
        return sendError(res, 400, "El recuadro del mapa no es válido.");
      }
      return res.json(geo.municipalitiesInBbox(west, south, east, north));
    }
    if (!req.query.provincia) return sendError(res, 400, "Elige una provincia.");
    res.json(geo.municipalitiesOf(req.query.provincia));
  });

  app.get("/api/geo/municipio/:code", asyncHandler(async (req, res) => {
    const item = await geo.municipalityPolygon(req.params.code, db);
    if (!item) return sendError(res, 404, "No encontramos ese ayuntamiento.");
    res.json(item);
  }));

  app.get("/api/geo/reverse", asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!validCoord(lat, lng)) return sendError(res, 400, "Esas coordenadas no valen.");
    const place = req.query.modo === "rapido" ? geo.locateLocal(lat, lng) : await geo.locate(lat, lng, db);
    if (!place) return sendError(res, 404, "Ese punto no cae en España.");
    res.json(place);
  }));

  app.get("/api/stats", (req, res) => {
    const row = db
      .prepare(
        `SELECT
           SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified,
           SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved
         FROM complaints`
      )
      .get();
    res.json({ verified: row.verified || 0, resolved: row.resolved || 0 });
  });

  app.post("/api/auth/register", limit("register", 8, 60 * 60 * 1000), asyncHandler(async (req, res) => {
    const username = cleanUsername(req.body?.username);
    const password = String(req.body?.password || "");
    if (!username) return sendError(res, 400, "El usuario necesita de 3 a 24 letras o números, y empezar por una letra.");
    if (password.length < 8) return sendError(res, 400, "La contraseña necesita al menos 8 caracteres.");
    const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (exists) return sendError(res, 409, "Ese usuario ya existe. Prueba con otro.");
    const info = db
      .prepare("INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, 'user', ?)")
      .run(username, bcrypt.hashSync(password, 10), new Date().toISOString());
    const user = publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(Number(info.lastInsertRowid)));
    setSession(res, user.id);
    res.status(201).json({ user });
  }));

  app.post("/api/auth/login", limit("login", 12, 15 * 60 * 1000), asyncHandler(async (req, res) => {
    const typed = cleanUsername(req.body?.username);
    const username = typed === "admin" ? "moderador" : typed;
    const password = String(req.body?.password || "");
    const row = username ? db.prepare("SELECT * FROM users WHERE username = ?").get(username) : null;
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return sendError(res, 401, "Usuario o contraseña incorrectos.");
    }
    setSession(res, row.id);
    res.json({ user: publicUser(row) });
  }));

  app.post("/api/auth/logout", (req, res) => {
    res.setHeader("Set-Cookie", "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    res.json({ ok: true });
  });

  app.get("/api/auth/me", (req, res) => {
    const user = currentUser(req);
    res.json({ user: user ? publicUser(user) : null });
  });

  app.post("/api/auth/password", asyncHandler(async (req, res) => {
    const user = currentUser(req);
    if (!user) return sendError(res, 401, "Entra con tu cuenta para continuar.");
    const next = String(req.body?.next || "");
    if (next.length < 8) return sendError(res, 400, "La contraseña nueva necesita al menos 8 caracteres.");
    if (!bcrypt.compareSync(String(req.body?.current || ""), user.password_hash)) {
      return sendError(res, 401, "La contraseña actual no coincide.");
    }
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(next, 10), user.id);
    res.json({ ok: true });
  }));

  app.get("/api/complaints", (req, res) => {
    const viewer = currentUser(req);
    const rows = filterComplaints(req.query, viewer);
    res.json(rows.map((row) => present(row, viewer)).filter(Boolean));
  });

  app.get("/api/complaints/mias", (req, res) => {
    const viewer = currentUser(req);
    if (!viewer) return sendError(res, 401, "Entra con tu cuenta para ver tus quejas.");
    const rows = db
      .prepare("SELECT * FROM complaints WHERE author_user_id = ? ORDER BY created_at DESC")
      .all(viewer.id);
    res.json(rows.map((row) => present(row, viewer)));
  });

  app.post("/api/complaints/por-token", (req, res) => {
    const tokens = Array.isArray(req.body?.tokens) ? req.body.tokens.slice(0, 50) : [];
    const found = [];
    for (const item of tokens) {
      const id = Number(item?.id);
      const token = String(item?.token || "");
      if (!id || !token) continue;
      const row = db.prepare("SELECT * FROM complaints WHERE id = ?").get(id);
      if (row && row.author_token_hash === hashToken(token)) found.push(present(row, null, true));
    }
    res.json(found);
  });

  app.get("/api/complaints/:id", (req, res) => {
    const viewer = currentUser(req);
    const row = db.prepare("SELECT * FROM complaints WHERE id = ?").get(Number(req.params.id));
    if (!row) return sendError(res, 404, "No encontramos esa queja.");
    const token = req.get("x-author-token") || "";
    const ownsToken = token && row.author_token_hash === hashToken(token);
    const data = present(row, viewer, ownsToken);
    if (!data) return sendError(res, 404, "Esa queja todavía no es pública.");
    if (viewer) {
      const vote = db
        .prepare("SELECT value FROM votes WHERE complaint_id = ? AND user_id = ?")
        .get(row.id, viewer.id);
      data.myVote = vote?.value || null;
      data.voteState = voteRestriction(toLogicUser(viewer), new Date());
    }
    const requests = db
      .prepare("SELECT COUNT(*) AS total FROM resolve_requests WHERE complaint_id = ?")
      .get(row.id);
    data.resolveRequests = requests.total || 0;
    res.json(data);
  });

  app.post(
    "/api/complaints",
    limit("complaints", 8, 60 * 60 * 1000),
    (req, res, next) => {
      upload.array("photos", 4)(req, res, (error) => {
        if (error) return next(error);
        next();
      });
    },
    asyncHandler(async (req, res) => {
      try {
        const lat = Number(req.body?.lat);
        const lng = Number(req.body?.lng);
        const category = String(req.body?.category || "");
        const comment = cleanText(req.body?.comment);
        if (!validCoord(lat, lng)) return cleanup(req, sendError(res, 400, "Marca el punto en el mapa."));
        if (!CATEGORIES[category]) return cleanup(req, sendError(res, 400, "Elige un tipo de problema."));
        if (comment.length < 20) {
          return cleanup(req, sendError(res, 400, "Cuéntalo con un poco más de detalle: al menos 20 caracteres."));
        }
        if (comment.length > 2000) return cleanup(req, sendError(res, 400, "El texto es demasiado largo."));

        const place = await geo.locate(lat, lng, db);
        if (!place || !place.provincia) {
          return cleanup(req, sendError(res, 400, "El punto tiene que estar en España."));
        }

        const viewer = currentUser(req);
        const alias = resolveAlias(req.body, viewer);
        if (alias.error) return cleanup(req, sendError(res, 400, alias.error));
        const authorToken = crypto.randomBytes(24).toString("hex");
        const photos = (req.files || []).map((file) => file.filename);
        const info = db
          .prepare(
            `INSERT INTO complaints (
              lat, lng, category, comment, photos, ccaa, provincia, municipio, municipio_code,
              location_source, status, author_alias, author_user_id, author_token_hash, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
          )
          .run(
            lat,
            lng,
            category,
            comment,
            JSON.stringify(photos),
            place.ccaa,
            place.provincia,
            place.municipio || "Sin determinar",
            place.municipioCode,
            place.source,
            alias.name,
            viewer ? viewer.id : null,
            hashToken(authorToken),
            new Date().toISOString()
          );
        const id = Number(info.lastInsertRowid);
        res.status(201).json({
          complaint: present(db.prepare("SELECT * FROM complaints WHERE id = ?").get(id), viewer, true),
          authorToken,
          place,
        });
      } catch (error) {
        cleanupFiles(req);
        throw error;
      }
    })
  );

  app.post("/api/complaints/:id/vote", limit("votes", 40, 60 * 60 * 1000), (req, res) => {
    const viewer = currentUser(req);
    const id = Number(req.params.id);
    const value = req.body?.value === "fake" ? "fake" : req.body?.value === "real" ? "real" : "";
    const voterLat = Number(req.body?.lat);
    const voterLng = Number(req.body?.lng);
    const complaint = db.prepare("SELECT * FROM complaints WHERE id = ?").get(id);
    const distanceKm =
      complaint && validCoord(voterLat, voterLng)
        ? haversineKm(voterLat, voterLng, complaint.lat, complaint.lng)
        : null;
    const recentVotes = viewer
      ? db
          .prepare("SELECT value, created_at AS createdAt FROM votes WHERE user_id = ?")
          .all(viewer.id)
      : [];
    const decision = assessVote({
      user: viewer ? toLogicUser(viewer) : null,
      complaint: complaint ? toLogicComplaint(complaint) : null,
      value,
      distanceKm,
      now: new Date(),
      recentVotes,
    });
    if (!decision.ok) return sendError(res, decision.status, decision.error);

    const already = db.prepare("SELECT id FROM votes WHERE complaint_id = ? AND user_id = ?").get(id, viewer.id);
    if (already) return sendError(res, 409, "Ya has votado esta queja.");

    const outcome = dbApi.transaction(() => {
      db.prepare(
        `INSERT INTO votes (complaint_id, user_id, value, voter_lat, voter_lng, is_rehab, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        viewer.id,
        value,
        Number.isFinite(voterLat) ? voterLat : null,
        Number.isFinite(voterLng) ? voterLng : null,
        decision.isRehab ? 1 : 0,
        new Date().toISOString()
      );
      const column = value === "real" ? "real_votes" : "fake_votes";
      db.prepare(`UPDATE complaints SET ${column} = ${column} + 1 WHERE id = ?`).run(id);
      if (decision.isRehab) {
        db.prepare(
          "UPDATE users SET rehab_remaining = CASE WHEN rehab_remaining > 0 THEN rehab_remaining - 1 ELSE 0 END WHERE id = ?"
        ).run(viewer.id);
      }
      if (decision.penalize) {
        const until = new Date(Date.now() + RULES.penaltyDays * 24 * 60 * 60 * 1000).toISOString();
        db.prepare("UPDATE users SET penalty_until = ?, rehab_remaining = ? WHERE id = ?").run(
          until,
          RULES.rehabRequired,
          viewer.id
        );
      }
      const updated = db.prepare("SELECT * FROM complaints WHERE id = ?").get(id);
      let removed = false;
      if (updated.status === "verified" && shouldRemove(updated.real_votes, updated.fake_votes)) {
        db.prepare("UPDATE complaints SET status = 'removed', removed_reason = 'votos' WHERE id = ?").run(id);
        removed = true;
      }
      return { removed, penalize: Boolean(decision.penalize) };
    });

    const freshUser = db.prepare("SELECT * FROM users WHERE id = ?").get(viewer.id);
    const fresh = db.prepare("SELECT * FROM complaints WHERE id = ?").get(id);
    res.json({
      complaint: present(fresh, freshUser, true),
      removed: outcome.removed,
      penalized: outcome.penalize,
      user: publicUser(freshUser),
    });
  });

  app.post("/api/complaints/:id/resolver", (req, res) => {
    const viewer = currentUser(req);
    if (!viewer) return sendError(res, 401, "Entra con tu cuenta para marcar una queja como resuelta.");
    const id = Number(req.params.id);
    const row = db.prepare("SELECT * FROM complaints WHERE id = ?").get(id);
    if (!row || !["verified", "resolved"].includes(row.status)) {
      return sendError(res, 404, "Esa queja no está publicada.");
    }
    if (row.status === "resolved") return res.json({ complaint: present(row, viewer), resolveRequests: RULES.resolveRequestsNeeded });

    if (viewer.role === "moderator") {
      markResolved(row, viewer.id, "moderator");
    } else {
      const lat = Number(req.body?.lat);
      const lng = Number(req.body?.lng);
      if (!validCoord(lat, lng)) return sendError(res, 400, "Necesitamos tu ubicación para comprobar que estás cerca.");
      const distance = haversineKm(lat, lng, row.lat, row.lng);
      if (distance > RULES.voteRadiusKm) {
        return sendError(res, 403, "Solo quien está a menos de 10 km puede decir que ya está resuelta.");
      }
      db.prepare(
        "INSERT OR IGNORE INTO resolve_requests (complaint_id, user_id, created_at) VALUES (?, ?, ?)"
      ).run(id, viewer.id, new Date().toISOString());
      const count = db.prepare("SELECT COUNT(*) AS total FROM resolve_requests WHERE complaint_id = ?").get(id).total;
      if (count >= RULES.resolveRequestsNeeded) markResolved(row, null, "vecinos");
    }
    const fresh = db.prepare("SELECT * FROM complaints WHERE id = ?").get(id);
    const requests = db.prepare("SELECT COUNT(*) AS total FROM resolve_requests WHERE complaint_id = ?").get(id);
    res.json({ complaint: present(fresh, viewer), resolveRequests: requests.total || 0 });
  });

  app.get("/api/mod/resumen", (req, res) => {
    if (!isMod(req)) return sendError(res, 403, "Solo moderación puede ver este panel.");
    const counts = db
      .prepare("SELECT status, COUNT(*) AS total FROM complaints GROUP BY status")
      .all();
    const byStatus = Object.fromEntries(counts.map((row) => [row.status, row.total]));
    res.json({ byStatus, rules: RULES });
  });

  app.get("/api/mod/complaints", (req, res) => {
    const viewer = currentUser(req);
    if (!viewer || viewer.role !== "moderator") return sendError(res, 403, "Solo moderación puede ver este panel.");
    const status = STATUSES[req.query.status] ? req.query.status : "pending";
    const rows = db
      .prepare("SELECT * FROM complaints WHERE status = ? ORDER BY created_at ASC LIMIT 200")
      .all(status);
    res.json(rows.map((row) => present(row, viewer, true)));
  });

  app.post("/api/mod/complaints/:id/aprobar", (req, res) => moderate(req, res, "verified", "aprobar"));
  app.post("/api/mod/complaints/:id/rechazar", (req, res) => moderate(req, res, "rejected", "rechazar"));
  app.post("/api/mod/complaints/:id/resolver", (req, res) => {
    const viewer = currentUser(req);
    if (!viewer || viewer.role !== "moderator") return sendError(res, 403, "Solo moderación puede hacer esto.");
    const row = db.prepare("SELECT * FROM complaints WHERE id = ?").get(Number(req.params.id));
    if (!row) return sendError(res, 404, "No encontramos esa queja.");
    if (row.status === "pending" || row.status === "rejected") {
      return sendError(res, 400, "Primero hay que publicarla.");
    }
    markResolved(row, viewer.id, "moderator");
    logMod(row.id, viewer.id, "resolver", cleanText(req.body?.note || ""));
    res.json({ complaint: present(db.prepare("SELECT * FROM complaints WHERE id = ?").get(row.id), viewer, true) });
  });

  app.patch("/api/mod/complaints/:id", (req, res) => {
    const viewer = currentUser(req);
    if (!viewer || viewer.role !== "moderator") return sendError(res, 403, "Solo moderación puede hacer esto.");
    const row = db.prepare("SELECT * FROM complaints WHERE id = ?").get(Number(req.params.id));
    if (!row) return sendError(res, 404, "No encontramos esa queja.");
    const ccaa = cleanText(req.body?.ccaa).slice(0, 80);
    const provincia = cleanText(req.body?.provincia).slice(0, 80);
    const municipio = cleanText(req.body?.municipio).slice(0, 120);
    if (!ccaa || !provincia || !municipio) {
      return sendError(res, 400, "Comunidad, provincia y ayuntamiento son obligatorios.");
    }
    db.prepare("UPDATE complaints SET ccaa = ?, provincia = ?, municipio = ?, location_source = 'moderacion' WHERE id = ?").run(
      ccaa,
      provincia,
      municipio,
      row.id
    );
    logMod(row.id, viewer.id, "corregir-territorio", `${ccaa} / ${provincia} / ${municipio}`);
    res.json({ complaint: present(db.prepare("SELECT * FROM complaints WHERE id = ?").get(row.id), viewer, true) });
  });

  app.delete("/api/mod/complaints/:id", (req, res) => {
    const viewer = currentUser(req);
    if (!viewer || viewer.role !== "moderator") return sendError(res, 403, "Solo moderación puede hacer esto.");
    const row = db.prepare("SELECT * FROM complaints WHERE id = ?").get(Number(req.params.id));
    if (!row) return sendError(res, 404, "No encontramos esa queja.");
    for (const file of JSON.parse(row.photos || "[]")) {
      fs.rmSync(path.join(UPLOADS, file), { force: true });
    }
    db.prepare("DELETE FROM votes WHERE complaint_id = ?").run(row.id);
    db.prepare("DELETE FROM resolve_requests WHERE complaint_id = ?").run(row.id);
    db.prepare("DELETE FROM complaints WHERE id = ?").run(row.id);
    logMod(row.id, viewer.id, "borrar", "");
    res.json({ ok: true });
  });

  app.get("/api/mod/export", (req, res) => {
    const viewer = currentUser(req);
    if (!viewer || viewer.role !== "moderator") return sendError(res, 403, "Solo moderación puede exportar.");
    const where = ["status IN ('verified', 'resolved')"];
    const params = [];
    for (const key of ["ccaa", "provincia", "municipio", "category"]) {
      if (req.query[key]) {
        where.push(`${key} = ?`);
        params.push(String(req.query[key]));
      }
    }
    if (req.query.status && STATUSES[req.query.status]) {
      where.splice(0, 1, "status = ?");
      params.unshift(String(req.query.status));
    }
    const rows = db.prepare(`SELECT * FROM complaints WHERE ${where.join(" AND ")} ORDER BY created_at DESC`).all(...params);
    const format = req.query.format === "json" ? "json" : "csv";
    if (format === "json") return res.json(rows.map((row) => present(row, viewer, true)));
    const header = [
      "id",
      "fecha",
      "estado",
      "categoria",
      "comentario",
      "ccaa",
      "provincia",
      "municipio",
      "lat",
      "lng",
      "votos_real",
      "votos_no_real",
      "autor",
      "fotos",
    ];
    const lines = [header.join(";")];
    for (const row of rows) {
      const photos = JSON.parse(row.photos || "[]").map((file) => `/uploads/${file}`).join(" ");
      lines.push(
        [
          row.id,
          row.created_at,
          STATUSES[row.status] || row.status,
          CATEGORIES[row.category] || row.category,
          csvCell(row.comment),
          csvCell(row.ccaa),
          csvCell(row.provincia),
          csvCell(row.municipio),
          row.lat,
          row.lng,
          row.real_votes,
          row.fake_votes,
          csvCell(row.author_alias),
          csvCell(photos),
        ].join(";")
      );
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=quejas.csv");
    res.send(`\uFEFF${lines.join("\n")}`);
  });

  app.get("/api/mod/users", (req, res) => {
    const viewer = currentUser(req);
    if (!viewer || viewer.role !== "moderator") return sendError(res, 403, "Solo moderación puede ver las cuentas.");
    const rows = db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 300").all();
    res.json(rows.map(publicUser));
  });

  app.post("/api/mod/users/:id/rol", (req, res) => {
    const viewer = currentUser(req);
    if (!viewer || viewer.role !== "moderator") return sendError(res, 403, "Solo moderación puede hacer esto.");
    const role = req.body?.role === "moderator" ? "moderator" : "user";
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(req.params.id));
    if (!user) return sendError(res, 404, "No encontramos esa cuenta.");
    if (user.id === viewer.id && role !== "moderator") {
      return sendError(res, 400, "No puedes quitarte tu propio acceso de moderación.");
    }
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, user.id);
    logMod(null, viewer.id, "rol", `${user.username} → ${role}`);
    res.json({ user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(user.id)) });
  });

  app.post("/api/mod/users/:id/penalizacion", (req, res) => {
    const viewer = currentUser(req);
    if (!viewer || viewer.role !== "moderator") return sendError(res, 403, "Solo moderación puede hacer esto.");
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(req.params.id));
    if (!user) return sendError(res, 404, "No encontramos esa cuenta.");
    const clear = Boolean(req.body?.clear);
    if (clear) {
      db.prepare("UPDATE users SET penalty_until = NULL, rehab_remaining = 0 WHERE id = ?").run(user.id);
    } else {
      const days = Math.min(30, Math.max(1, Number(req.body?.days) || RULES.penaltyDays));
      const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      db.prepare("UPDATE users SET penalty_until = ?, rehab_remaining = ? WHERE id = ?").run(
        until,
        RULES.rehabRequired,
        user.id
      );
    }
    res.json({ user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(user.id)) });
  });

  app.use((error, req, res, next) => {
    cleanupFiles(req);
    if (res.headersSent) return next(error);
    if (error?.message === "Solo imágenes JPG, PNG, WEBP o GIF") return sendError(res, 400, error.message);
    if (error?.code === "LIMIT_FILE_SIZE") return sendError(res, 400, "Cada foto puede pesar hasta 5 MB.");
    console.error(error);
    sendError(res, 500, "Ha ocurrido un error. Inténtalo de nuevo.");
  });

  return app;

  function moderate(req, res, status, action) {
    const viewer = currentUser(req);
    if (!viewer || viewer.role !== "moderator") return sendError(res, 403, "Solo moderación puede hacer esto.");
    const row = db.prepare("SELECT * FROM complaints WHERE id = ?").get(Number(req.params.id));
    if (!row) return sendError(res, 404, "No encontramos esa queja.");
    const note = cleanText(req.body?.note || "").slice(0, 500);
    if (status === "rejected" && note.length < 4) {
      return sendError(res, 400, "Escribe un motivo breve para no publicarla.");
    }
    db.prepare(
      `UPDATE complaints
       SET status = ?, moderated_at = ?, moderator_id = ?, moderation_note = ?
       WHERE id = ?`
    ).run(status, new Date().toISOString(), viewer.id, note, row.id);
    logMod(row.id, viewer.id, action, note);
    res.json({ complaint: present(db.prepare("SELECT * FROM complaints WHERE id = ?").get(row.id), viewer, true) });
  }

  function markResolved(row, moderatorId, how) {
    db.prepare("UPDATE complaints SET status = 'resolved', resolved_at = ? WHERE id = ?").run(new Date().toISOString(), row.id);
    logMod(row.id, moderatorId, "resuelta", how);
  }

  function logMod(complaintId, moderatorId, action, note) {
    db.prepare(
      "INSERT INTO moderation_log (complaint_id, moderator_id, action, note, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(complaintId, moderatorId, action, note || "", new Date().toISOString());
  }

  function filterComplaints(query, viewer) {
    const where = [];
    const params = [];
    const publicStatuses = ["verified", "resolved"];
    if (query.status && STATUSES[query.status] && viewer?.role === "moderator") {
      where.push("status = ?");
      params.push(query.status);
    } else if (query.status && publicStatuses.includes(query.status)) {
      where.push("status = ?");
      params.push(query.status);
    } else {
      where.push("status IN ('verified', 'resolved')");
    }
    for (const key of ["ccaa", "provincia", "municipio", "category"]) {
      if (query[key]) {
        where.push(`${key} = ?`);
        params.push(String(query[key]));
      }
    }
    if (query.bbox) {
      const [west, south, east, north] = String(query.bbox).split(",").map(Number);
      if ([west, south, east, north].every(Number.isFinite)) {
        where.push("lng >= ? AND lng <= ? AND lat >= ? AND lat <= ?");
        params.push(west, east, south, north);
      }
    }
    const order = query.orden === "votos" ? "real_votes DESC, created_at DESC" : "created_at DESC";
    return db.prepare(`SELECT * FROM complaints WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT 300`).all(...params);
  }

  function currentUser(req) {
    const token = readCookie(req, "session");
    if (!token) return null;
    const id = verifySession(token);
    if (!id) return null;
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  }

  function isMod(req) {
    const user = currentUser(req);
    return Boolean(user && user.role === "moderator");
  }

  function setSession(res, userId) {
    const token = signSession(userId);
    res.setHeader(
      "Set-Cookie",
      `session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`
    );
  }
}

function extensionFor(mime) {
  return { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" }[mime] || "";
}

function signSession(userId) {
  const body = Buffer.from(JSON.stringify({ id: userId, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", dbApi.secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifySession(token) {
  const [body, sig] = String(token).split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", dbApi.secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!payload?.id || payload.exp < Date.now()) return null;
    return payload.id;
  } catch {
    return null;
  }
}

function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function publicUser(row) {
  const restriction = voteRestriction(
    { penaltyUntil: row.penalty_until, rehabRemaining: row.rehab_remaining },
    new Date()
  );
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    createdAt: row.created_at,
    penaltyUntil: restriction.until,
    rehabRemaining: row.rehab_remaining || 0,
    limited: restriction.limited,
  };
}

function toLogicUser(row) {
  return { id: row.id, penaltyUntil: row.penalty_until, rehabRemaining: row.rehab_remaining || 0 };
}

function toLogicComplaint(row) {
  return {
    status: row.status,
    authorUserId: row.author_user_id,
    realVotes: row.real_votes,
    fakeVotes: row.fake_votes,
  };
}

function present(row, viewer, force) {
  const isOwner = Boolean(viewer && row.author_user_id && viewer.id === row.author_user_id);
  const isMod = Boolean(viewer && viewer.role === "moderator");
  const hidden = ["pending", "rejected", "removed"].includes(row.status);
  if (hidden && !isOwner && !isMod && !force) return null;
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    category: row.category,
    categoryLabel: CATEGORIES[row.category] || row.category,
    comment: row.comment,
    photos: JSON.parse(row.photos || "[]").map((file) => `/uploads/${file}`),
    ccaa: row.ccaa,
    provincia: row.provincia,
    municipio: row.municipio,
    municipioCode: row.municipio_code,
    locationSource: isMod || isOwner || force ? row.location_source : undefined,
    status: row.status,
    statusLabel: STATUSES[row.status] || row.status,
    authorAlias: row.author_alias,
    createdAt: row.created_at,
    realVotes: row.real_votes,
    fakeVotes: row.fake_votes,
    moderationNote: isOwner || isMod || force ? row.moderation_note : null,
    resolvedAt: row.resolved_at,
    removedReason: isMod ? row.removed_reason : null,
    mine: isOwner || Boolean(force),
  };
}

function resolveAlias(body, viewer) {
  const mode = body?.aliasMode || "auto";
  if (mode === "user") {
    if (!viewer) return { error: "Entra con tu cuenta para firmar con tu usuario." };
    return { name: viewer.username };
  }
  if (mode === "custom") {
    const alias = cleanAlias(body?.alias);
    if (!alias) return { error: "El nombre público puede tener letras, números y espacios, entre 2 y 24 caracteres." };
    return { name: alias };
  }
  const database = dbApi.getDb();
  for (let i = 0; i < 20; i += 1) {
    const candidate = `Vecino_${1000 + Math.floor(Math.random() * 9000)}`;
    const taken = database.prepare("SELECT id FROM complaints WHERE author_alias = ?").get(candidate);
    if (!taken) return { name: candidate };
  }
  return { name: `Vecino_${crypto.randomBytes(3).toString("hex")}` };
}

function cleanUsername(value) {
  const name = String(value || "").trim().toLowerCase();
  return /^[a-z][a-z0-9_]{2,23}$/.test(name) ? name : "";
}

function cleanAlias(value) {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  if (!/^[\p{L}\p{N} ._'-]{2,24}$/u.test(name)) return "";
  return name;
}

function cleanText(value) {
  return String(value || "").replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}

function validCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 27 && lat <= 44.5 && lng >= -19 && lng <= 5;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function cleanupFiles(req) {
  for (const file of req.files || []) {
    fs.rmSync(file.path, { force: true });
  }
  req.files = [];
}

function cleanup(req, result) {
  cleanupFiles(req);
  return result;
}

function sendError(res, status, error) {
  res.status(status).json({ error });
  return res;
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const buckets = new Map();
function limit(name, max, windowMs) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || "local";
    const key = `${name}:${ip}`;
    const now = Date.now();
    const recent = (buckets.get(key) || []).filter((time) => now - time < windowMs);
    if (process.env.DISABLE_LIMITS === "1") return next();
  if (recent.length >= max) return sendError(res, 429, "Demasiados intentos. Espera un momento y vuelve a probar.");
    recent.push(now);
    buckets.set(key, recent);
    next();
  };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const app = createApp();
  const created = dbApi.moderatorWasCreated();
  app.listen(port, () => {
    console.log(`El Pueblo Tiene la Opinión está en http://localhost:${port}`);
    if (created) {
      console.log("Se ha creado la cuenta de moderación: usuario moderador / contraseña Pueblo2026!");
      console.log("Cámbiala en cuanto entres, desde el menú de tu cuenta.");
    }
  });
}

module.exports = { createApp };
