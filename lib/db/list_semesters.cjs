const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_DwFSb9dxOJ8G@ep-cold-darkness-ahwozvcw.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  const client = new Client({ connectionString });
  await client.connect();
  
  console.log("--- Semesters ---");
  const sRes = await client.query('SELECT * FROM semesters');
  console.log(sRes.rows);
  
  console.log("\n--- Courses ---");
  const cRes = await client.query('SELECT * FROM courses');
  console.log(cRes.rows);
  
  console.log("\n--- Events (first 5) ---");
  const eRes = await client.query('SELECT * FROM events ORDER BY start_time DESC LIMIT 5');
  console.log(eRes.rows);
  
  await client.end();
}

main().catch(console.error);
