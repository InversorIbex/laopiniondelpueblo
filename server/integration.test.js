const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.GEO_OFFLINE = "1";
process.env.DISABLE_LIMITS = "1";
process.env.SECRET = "integration-secret";
process.env.DB_PATH = path.join(os.tmpdir(), `eptlo-${process.pid}.sqlite`);
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `eptlo-up-${process.pid}`);

const { createApp } = require("./index");
const dbApi = require("./db");

function client() {
  let jar = "";
  return {
    async send(urlPath, options = {}) {
      const headers = new Headers(options.headers || {});
      if (jar) headers.set("cookie", jar);
      const response = await fetch(base + urlPath, { ...options, headers });
      const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
      if (cookies.length) jar = cookies.map((item) => item.split(";")[0]).join("; ");
      const text = await response.text();
      let body = null;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
      return { status: response.status, body };
    },
  };
}

let base;
let server;

test("flujo de queja, moderación, voto y abuso", async (t) => {
  const app = createApp();
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await dbApi.close();
    fs.rmSync(process.env.DB_PATH, { force: true });
    fs.rmSync(`${process.env.DB_PATH}-shm`, { force: true });
    fs.rmSync(`${process.env.DB_PATH}-wal`, { force: true });
    fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
  });

  const anon = client();
  const outside = new FormData();
  outside.set("lat", "42.5");
  outside.set("lng", "4.2");
  outside.set("category", "basura");
  outside.set("comment", "Esto está en el mar y no debería aceptarse como queja.");
  outside.set("aliasMode", "auto");
  const rejectedPlace = await anon.send("/api/complaints", { method: "POST", body: outside });
  assert.equal(rejectedPlace.status, 400);

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const form = new FormData();
  form.set("lat", "40.4168");
  form.set("lng", "-3.7038");
  form.set("category", "bache");
  form.set("comment", "Hay un bache hondo junto al paso de cebra y se llena de agua.");
  form.set("aliasMode", "custom");
  form.set("alias", "Vecino Centro");
  form.append("photos", new File([png], "bache.png", { type: "image/png" }));
  const created = await anon.send("/api/complaints", { method: "POST", body: form });
  assert.equal(created.status, 201);
  assert.equal(created.body.complaint.provincia, "Madrid");
  assert.equal(created.body.complaint.municipio, "Madrid");
  assert.equal(created.body.complaint.status, "pending");
  assert.equal(created.body.complaint.authorAlias, "Vecino Centro");
  const id = created.body.complaint.id;
  const authorToken = created.body.authorToken;

  const hidden = await anon.send(`/api/complaints/${id}`);
  assert.equal(hidden.status, 404);
  const withToken = await anon.send(`/api/complaints/${id}`, { headers: { "x-author-token": authorToken } });
  assert.equal(withToken.status, 200);
  const photo = await fetch(base + created.body.complaint.photos[0]);
  assert.equal(photo.status, 200);

  const mod = client();
  const login = await mod.send("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "moderador", password: "Pueblo2026!" }),
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, "moderator");
  const approved = await mod.send(`/api/mod/complaints/${id}/aprobar`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ note: "Se ve el bache." }),
  });
  assert.equal(approved.body.complaint.status, "verified");

  const listed = await anon.send("/api/complaints?municipio=Madrid");
  assert.ok(listed.body.some((item) => item.id === id));

  const farUser = await register("lejos");
  const farVote = await farUser.send(`/api/complaints/${id}/vote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: "real", lat: 41.3874, lng: 2.1686 }),
  });
  assert.equal(farVote.status, 403);

  const near = await register("cerca");
  const nearVote = await near.send(`/api/complaints/${id}/vote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: "real", lat: 40.42, lng: -3.7 }),
  });
  assert.equal(nearVote.status, 200);
  assert.equal(nearVote.body.complaint.realVotes, 1);

  const abusive = await register("duros");
  for (let i = 0; i < 5; i += 1) {
    const complaintId = await publishComplaint(`Queja de prueba numero ${i} en una acera de Madrid centro.`);
    const vote = await abusive.send(`/api/complaints/${complaintId}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "fake", lat: 40.42, lng: -3.7 }),
    });
    assert.equal(vote.status, 200, vote.body?.error);
    if (i === 4) assert.equal(vote.body.penalized, true);
  }

  const blocked = await publishComplaint("Otra acera rota para comprobar que el voto ya no entra.");
  const blockedVote = await abusive.send(`/api/complaints/${blocked}/vote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: "fake", lat: 40.42, lng: -3.7 }),
  });
  assert.equal(blockedVote.status, 403);

  const trustedId = await publishComplaint("Farola fundida desde hace semanas en esta misma plaza.");
  for (const name of ["real1", "real2", "real3"]) {
    const voter = await register(name);
    const vote = await voter.send(`/api/complaints/${trustedId}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "real", lat: 40.42, lng: -3.7 }),
    });
    assert.equal(vote.status, 200, vote.body?.error);
  }
  const rehab = await abusive.send(`/api/complaints/${trustedId}/vote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: "real", lat: 37.3891, lng: -5.9845 }),
  });
  assert.equal(rehab.status, 200, rehab.body?.error);
  assert.equal(rehab.body.user.rehabRemaining, 2);

  const doomed = await publishComplaint("Un banco que varios vecinos van a marcar como no real.");
  for (let i = 0; i < 6; i += 1) {
    const voter = await register(`no${i}`);
    const vote = await voter.send(`/api/complaints/${doomed}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "fake", lat: 40.421, lng: -3.701 }),
    });
    assert.equal(vote.status, 200, vote.body?.error);
    if (i === 5) assert.equal(vote.body.removed, true);
  }
  const gone = await anon.send(`/api/complaints/${doomed}`);
  assert.equal(gone.status, 404);

  const exported = await mod.send("/api/mod/export?municipio=Madrid");
  assert.equal(exported.status, 200);
  assert.match(exported.body, /Hay un bache hondo/);
});

async function register(username) {
  const person = client();
  const result = await person.send("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password: "clave-segura" }),
  });
  assert.equal(result.status, 201, result.body?.error);
  return person;
}

async function publishComplaint(comment) {
  const author = client();
  const form = new FormData();
  form.set("lat", "40.4168");
  form.set("lng", "-3.7038");
  form.set("category", "acera");
  form.set("comment", comment);
  form.set("aliasMode", "auto");
  const created = await author.send("/api/complaints", { method: "POST", body: form });
  assert.equal(created.status, 201, created.body?.error);
  const mod = client();
  await mod.send("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "moderador", password: "Pueblo2026!" }),
  });
  const approved = await mod.send(`/api/mod/complaints/${created.body.complaint.id}/aprobar`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(approved.status, 200, approved.body?.error);
  return created.body.complaint.id;
}
