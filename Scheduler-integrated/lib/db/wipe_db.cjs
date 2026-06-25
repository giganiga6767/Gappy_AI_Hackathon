const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  let connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Try to load from .env file in project root
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
    console.error("Error: DATABASE_URL environment variable is not defined and could not be loaded from .env file.");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();
  console.log("Wiping database tables...");
  
  // Truncate tables with CASCADE to handle foreign key relations safely
  await client.query('TRUNCATE TABLE attendance, grades, events, courses, semesters, tasks, projects, routine, resources CASCADE');
  
  console.log("Database wiped successfully! Clean state restored.");
  await client.end();
}

main().catch(console.error);
