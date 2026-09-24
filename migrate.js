require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ ERROR: DATABASE_URL is not set in your .env file!");
    console.error("Please add your DATABASE_URL in .env before running this script.");
    process.exit(1);
  }

  let client;
  try {
    const url = new URL(databaseUrl.trim().replace(/^['"]|['"]$/g, ""));
    url.searchParams.delete("sslmode");

    client = new Client({
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false },
    });

    console.log("⏳ Connecting to the database...");
    await client.connect();
    console.log("✅ Connected successfully!");

    // Ensure PostGIS is enabled
    console.log("⏳ Checking PostGIS extension...");
    await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    console.log("✅ PostGIS extension is ready.");

    const migrationsDir = path.join(__dirname, "database");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    console.log(`\nFound ${files.length} migration files to apply.\n`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      process.stdout.write(`[${i + 1}/${files.length}] Applying ${file}... `);
      await client.query(sql);
      console.log("DONE");
    }

    console.log("\n🎉 ALL 36 MIGRATIONS COMPLETED SUCCESSFULLY!\n");
  } catch (err) {
    console.error("\n❌ Migration failed:");
    console.error(err.message || err);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

runMigrations();
