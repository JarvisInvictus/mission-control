// One-off: Update Wednesday spreadsheet URLs directly in Upstash Redis
// Run: node scripts/update-wed-sheets.mjs

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const UPDATES = {
  "Anthony McEwen":     "https://docs.google.com/spreadsheets/d/1nZ2FYmfjsjbk5_ctjQHd-UsbiFpySBrEn2lPVUJOMMU/edit?gid=507840090#gid=507840090",
  "Arshi Madan":        "https://docs.google.com/spreadsheets/d/1ZVKf7nARn8j6ewm9WQ3f_U9d6NyYSR9bd7RTDyCEOfk/edit?gid=1541591503#gid=1541591503",
  "Bailey":             "https://docs.google.com/spreadsheets/d/1362BuL_EOzV6MizUZ2E9EGg_Pottnko83GE_divpQVQ/edit?gid=1284756359#gid=1284756359",
  "Ben Heaney":         "https://docs.google.com/spreadsheets/d/1vJCj-vV-XTPmgvs3ylEPLGAEb1h1Xl8we3b3CgSFsFk/edit?gid=1541591503#gid=1541591503",
  "Connor":             "https://docs.google.com/spreadsheets/d/1L96h8kfkOsgxIKXi2ZwqTUmwwNr2LhtNmsotaLy4jYs/edit?gid=1541591503#gid=1541591503",
  "Cordell":            "https://docs.google.com/spreadsheets/d/11iBVd-xTBTbYR7erkge8W30cJOMBsY6piuBrZBQn00I/edit?gid=2018831270#gid=2018831270",
  "Garry Gill":         "https://docs.google.com/spreadsheets/d/13WquEm1KuxnjnUDFi7150JLUf0IQqsl4qm_qW9f2L98/edit?gid=507840090#gid=507840090",
  "Jasmine Chaaban":    "https://docs.google.com/spreadsheets/d/1RWiouXhNgOZefNlF5son8SeQNaGYReV8BJMSdPzoLQI/edit?gid=507840090#gid=507840090",
  "Joanne Angel":        "https://docs.google.com/spreadsheets/d/12bQlxnkkKIJbxerIZ_UvUT7vphWa5YcXXR9IdSepwbE/edit?gid=507840090#gid=507840090",
  "Leki":               "https://docs.google.com/spreadsheets/d/1SSekLvkbfWgkGU6geNGEiat3iVCeD3uaxG2JY9oblqY/edit?gid=507840090#gid=507840090",
  "Lochlin":            "https://docs.google.com/spreadsheets/d/1_ODi3hUSLlawyrdPw831kvQRpHzbzrJo-Cd7ywJxkM0/edit?gid=1541591503#gid=1541591503",
  "Matt Agnello":       "https://docs.google.com/spreadsheets/d/1c-izzIkrKdL1XzPAQP1T3lq3DiQIpyu2EEM1FG2uA5M/edit?gid=1541591503#gid=1541591503",
  "Noamatallah":        "https://docs.google.com/spreadsheets/d/1KBplCJWtVVnFjl6i09tctGNZ1eely4cNAsvp5UkZhdg/edit?gid=644103072#gid=644103072",
  "Sahin":              "https://docs.google.com/spreadsheets/d/1MBwdig64_9To-6d-4Qc9nWLCQUw8Lpnva_Fu4sEBtTM/edit?gid=1039799487#gid=1039799487",
  "Suzy":               "https://docs.google.com/spreadsheets/d/1Z6LAotdNOaI4lX1C3GsGf6skGCoDO-uwIHM86iAuZY0/edit?gid=1268672618#gid=1268672618",
  "Taylah Scott":       "https://docs.google.com/spreadsheets/d/1gcxK1EjpbJ5W-PtcjQPEAtOL12ycvJYJmVimqDEpSWc/edit?gid=507840090#gid=507840090",
  "Vikram":             "https://docs.google.com/spreadsheets/d/11mkk-B08JeJqTtSzsRj2Z_G-V4fHvlipQtN-nuRGGt8/edit?gid=644103072#gid=644103072",
  "Brodie Manning":     "https://docs.google.com/spreadsheets/d/1Vph8J9RhaW4YCo7EgCNCDVYkVCP_9nP31aWXr36BcTI/edit?gid=1541591503#gid=1541591503",
  "Teagan Ottone":      "https://docs.google.com/spreadsheets/d/1br_4-cjvsXwJ-oC37lLMHSk8njhLJfTyql7SExjPOcQ/edit?pli=1&gid=1541591503#gid=1541591503",
  "Bryce Martin":       "https://docs.google.com/spreadsheets/d/1AbV0i3svRUtId1khoDziHCNb_V76Bjtm59Rgtbv7-Q4/edit?gid=1541591503#gid=1541591503",
  "Billy Vasilopoulos":  "https://docs.google.com/spreadsheets/d/1XtJRt9d-bzmc4X0zwE7BtwkJquHYZL_QUaj7FtqNQsA/edit?gid=1541591503#gid=1541591503",
};

function normalize(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function fuzzyMatch(clientName, targetName) {
  const c = normalize(clientName);
  const t = normalize(targetName);
  if (c === t) return true;
  // First name match
  const cFirst = c.split(" ")[0];
  const tFirst = t.split(" ")[0];
  if (cFirst && tFirst && cFirst === tFirst) return true;
  return false;
}

async function main() {
  console.log("Fetching clients from Redis...");
  let clients = await redis.get("jarvis:clients");
  if (!clients) {
    console.error("No clients found in Redis at jarvis:clients");
    process.exit(1);
  }
  if (typeof clients === "string") {
    clients = JSON.parse(clients);
  }
  console.log(`Found ${clients.length} clients in Redis\n`);

  let updated = 0;
  let notFound = [];

  for (const [targetName, spreadsheetUrl] of Object.entries(UPDATES)) {
    const match = clients.find(c => fuzzyMatch(c.name, targetName));
    if (match) {
      match.spreadsheetUrl = spreadsheetUrl;
      console.log(`✓ ${match.name} → ${spreadsheetUrl.slice(0, 60)}...`);
      updated++;
    } else {
      console.log(`✗ NOT FOUND: ${targetName}`);
      notFound.push(targetName);
    }
  }

  console.log(`\nUpdated: ${updated}/${Object.keys(UPDATES).length}`);
  if (notFound.length > 0) {
    console.log(`Not found: ${notFound.join(", ")}`);
  }

  // Write back
  await redis.set("jarvis:clients", JSON.stringify(clients));
  console.log("\n✅ Written back to Redis (jarvis:clients)");
}

main().catch(console.error);
