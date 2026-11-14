const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const dbApi = require("./db");

const file = process.env.SQLITE_PATH || path.join(__dirname, "..", "data", "app.sqlite");

async function copyTable(source, db, table, columns) {
  const rows = source.prepare(`SELECT ${columns.join(", ")} FROM ${table}`).all();
  if (!rows.length) return 0;
  const marks = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((column) => column !== "id")
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");
  const conflict = columns.includes("id") ? "(id)" : "";
  const sql = conflict
    ? `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${marks}) ON CONFLICT ${conflict} DO UPDATE SET ${updates}`
    : `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${marks}) ON CONFLICT DO NOTHING`;
  for (const row of rows) {
    await db.prepare(sql).run(...columns.map((column) => row[column]));
  }
  if (columns.includes("id")) {
    const max = rows.reduce((highest, row) => Math.max(highest, Number(row.id) || 0), 1);
    await dbApi.runRaw(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), ${max}, true)`);
  }
  return rows.length;
}

async function main() {
  if (!dbApi.usesSupabase()) {
    throw new Error("Falta DATABASE_URL en .env o en el entorno. Sin eso no hay Supabase al que copiar.");
  }
  const source = new DatabaseSync(file, { readOnly: true });
  const db = dbApi.getDb();
  await dbApi.ready();
  const users = await copyTable(source, db, "users", [
    "id",
    "username",
    "password_hash",
    "role",
    "created_at",
    "penalty_until",
    "rehab_remaining",
  ]);
  const complaints = await copyTable(source, db, "complaints", [
    "id",
    "lat",
    "lng",
    "category",
    "comment",
    "photos",
    "ccaa",
    "provincia",
    "municipio",
    "municipio_code",
    "location_source",
    "status",
    "author_alias",
    "author_user_id",
    "author_token_hash",
    "created_at",
    "moderated_at",
    "moderator_id",
    "moderation_note",
    "resolved_at",
    "real_votes",
    "fake_votes",
    "removed_reason",
  ]);
  const votes = await copyTable(source, db, "votes", [
    "id",
    "complaint_id",
    "user_id",
    "value",
    "voter_lat",
    "voter_lng",
    "is_rehab",
    "created_at",
  ]);
  const requests = await copyTable(source, db, "resolve_requests", ["complaint_id", "user_id", "created_at"]);
  const log = await copyTable(source, db, "moderation_log", [
    "id",
    "complaint_id",
    "moderator_id",
    "action",
    "note",
    "created_at",
  ]);
  source.close();
  await dbApi.close();
  console.log(`Copiado a Supabase: ${users} cuentas, ${complaints} quejas, ${votes} votos, ${requests} avisos de resuelta, ${log} notas.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
