const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { execSync } = require('child_process');

const dbRequire = createRequire(path.join(__dirname, 'lib/db/package.json'));
const { Client } = dbRequire('pg');

async function main() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log("No .env file found. Copying .env.example...");
    fs.copyFileSync(path.join(__dirname, '.env.example'), envPath);
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (!match) {
    console.error("Error: DATABASE_URL not found in .env");
    process.exit(1);
  }

  let connectionString = match[1];

  let parsedUrl;
  try {
    parsedUrl = new URL(connectionString);
  } catch (e) {
    console.error("Error parsing DATABASE_URL:", e.message);
    process.exit(1);
  }

  // We only auto-provision if the connection string points to the default '/neondb' database
  // on our Neon server, meaning the user hasn't configured their own database yet.
  if (parsedUrl.pathname === '/neondb' && parsedUrl.hostname.includes('neon.tech')) {
    console.log("Detecting shared default Neon database. Provisioning your personal isolated cloud database...");
    
    const rand = Math.random().toString(36).substring(2, 10);
    const dbName = `db_local_${rand}`;

    try {
      // Connect to the default 'neondb' to create the new database
      const client = new Client({ connectionString });
      await client.connect();
      
      console.log(`Creating database: ${dbName}...`);
      await client.query(`CREATE DATABASE ${dbName};`);
      await client.end();
      console.log(`Database ${dbName} created successfully!`);

      // Update .env connection string to point to the new database
      parsedUrl.pathname = `/${dbName}`;
      const newConnectionString = parsedUrl.toString();
      
      // We read the file again to prevent race conditions or replace errors
      envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(connectionString, newConnectionString);
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log("Updated .env with your personal isolated cloud database URL.");
      
      // Update local connectionString variable
      connectionString = newConnectionString;
    } catch (err) {
      console.error("Failed to provision isolated database:", err.message);
      console.log("Falling back to shared database (data might be shared with other developers).");
    }
  }

  // Push schema to the database (whether personal or shared) to ensure tables exist
  console.log("Pushing database schema using drizzle-kit...");
  let pushCmd = 'pnpm --filter @workspace/db push';
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
  } catch (e) {
    pushCmd = 'npx pnpm@9 --filter @workspace/db push';
  }
  
  try {
    execSync(pushCmd, { stdio: 'inherit', env: { ...process.env, DATABASE_URL: connectionString } });
    console.log("Database schema applied successfully!");
  } catch (err) {
    console.error("Failed to apply database schema:", err.message);
    process.exit(1);
  }
}

main().catch(console.error);
