import { LemmaClient } from "lemma-sdk";

async function main() {
  console.log("Connecting to local Lemma stack...");
  
  const client = new LemmaClient({
    apiUrl: "http://127-0-0-1.sslip.io:8711",
    authUrl: "http://127-0-0-1.sslip.io:3711/auth",
  });

  try {
    // Check available models or list pods
    const res = await client.request("GET", "/api/v1/pods");
    console.log("Available Pods response:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Failed to fetch pods:", err);
  }
}

main();
