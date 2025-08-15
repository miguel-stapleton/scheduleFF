// scripts/test-mongo.mjs
import { MongoClient } from "mongodb";
import fs from "fs";

// Load .env.local (simple loader)
if (!fs.existsSync(".env.local")) {
  console.error("Missing .env.local in project root");
  process.exit(1);
}
for (const line of fs.readFileSync(".env.local","utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$/i);
  if (m) process.env[m[1]] = m[2];
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "testdb";
if (!uri) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}

console.log("Connecting…", uri.replace(/\/\/.*@/, "//<redacted>@"), " DB:", dbName);

const client = new MongoClient(uri);
try {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("✅ Ping OK");

  const db = client.db(dbName);
  const col = db.collection("healthcheck");
  const r = await col.insertOne({ ok: true, _ts: new Date() });
  console.log("Inserted id:", r.insertedId.toString());

  const count = await col.countDocuments();
  console.log(`healthcheck count: ${count}`);

  await col.deleteMany({});
  console.log("✅ Finished successfully.");
} catch (e) {
  console.error("❌ Connection failed:", e.name, e.code, e.message);
  process.exit(1);
} finally {
  await client.close().catch(() => {});
}

