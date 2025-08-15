// scripts/test-mongo.mjs
import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import url from "url";

// Load .env.local manually for this script
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env.local");
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of env) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) process.env[m[1]] = m[2];
  }
} else {
  console.error("Could not find .env.local at", envPath);
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "testdb";

if (!uri) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}

console.log("Connecting to:", uri.replace(/\/\/.*@/, "//<redacted>@"));
console.log("Using DB:", dbName);

const client = new MongoClient(uri);

try {
  await client.connect();

  // Verify connection
  await client.db("admin").command({ ping: 1 });
  console.log("✅ Ping OK");

  // List databases
  const dbs = await client.db().admin().listDatabases();
  console.log("Databases:", dbs.databases.map(d => d.name));

  // Touch your target DB
  const db = client.db(dbName);
  const col = db.collection("healthcheck");
  await col.insertOne({ _ts: new Date(), ok: true });
  const count = await col.countDocuments();
  console.log(`Inserted doc. Collection 'healthcheck' count = ${count}`);

  // Clean up the test doc (optional)
  await col.deleteMany({});
  console.log("✅ Connection test finished successfully.");
} catch (e) {
  console.error("❌ Connection failed:");
  console.error(e?.name, e?.code, e?.message);
  if (e?.code === 18 || /Authentication failed/i.test(e?.message || "")) {
    console.error(`
Tips:
- Make sure you're using the *Database User* credentials from Atlas → Security → Database Access.
- If you just reset the password, wait 1–2 minutes and try again.
- In Compass, try the same URI to confirm the credentials/IP allowlist.`);
  }
  process.exit(1);
} finally {
  await client.close().catch(() => {});
}
