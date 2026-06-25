const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  let connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    try {
      const envPath = path.join(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
        if (match) {
          connectionString = match[1];
        }
      }
    } catch (e) {
      console.warn("Could not read .env file:", e.message);
    }
  }

  if (!connectionString) {
    console.error("Error: DATABASE_URL is not set.");
    process.exit(1);
  }

  const start = Date.now();
  console.log("Connecting...");
  const client = new Client({ connectionString });
  await client.connect();
  console.log(`Connected in ${Date.now() - start}ms`);
  
  const queryStart = Date.now();
  const res = await client.query('SELECT 1');
  console.log(`Query finished in ${Date.now() - queryStart}ms`, res.rows);
  
  await client.end();
}

main().catch(console.error);
