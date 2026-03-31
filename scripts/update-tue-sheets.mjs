// One-off: Update Tuesday spreadsheet URLs directly in Upstash Redis
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const UPDATES = {
  "Afshan Madan":    "https://docs.google.com/spreadsheets/d/1CzR8x8KphTGyt0xaicuOAXsOn-n1YvV7PzEn8Vkb6-A/edit?gid=1541591503#gid=1541591503",
  "Anki Dankha":     "https://docs.google.com/spreadsheets/d/13ohbilAD598vAKmb8lllZ7GD0rhITTLdDzZc6Jl1yY8/edit?gid=1541591503#gid=1541591503",
  "Brandon Gawn":    "https://docs.google.com/spreadsheets/d/19hqCy90gUAsd9v4ep5jPBV237tbt8xAC6vsIiqBwCTo/edit?gid=507840090#gid=507840090",
  "Charli Drew":     "https://docs.google.com/spreadsheets/d/1DUR2UWQCoHpMs33u6_rpg-cpx9cEqt7UP2g19Cp3VcI/edit?gid=1541591503#gid=1541591503",
  "Courtney McKenzie":"https://docs.google.com/spreadsheets/d/1AKeClMkVchb-41lRa1fstPOaA1TgnoH1D3LUtLEPfQ8/edit?gid=1541591503#gid=1541591503",
  "Dylan Simmons":   "https://docs.google.com/spreadsheets/d/1WLFtHqhv4g0UHmdrlLAibFCLQTW6PrWSsTH6C4bG-P8/edit?gid=652228184#gid=652228184",
  "Hamza Ozsehitoglu":"https://docs.google.com/spreadsheets/d/1kFaak92-mpaAkO0jNRS-GGxY9uEKP4VHMYdouFEEoIQ/edit?gid=507840090#gid=507840090",
  "Harrish":         "https://docs.google.com/spreadsheets/d/18Y5GT8AmvrpoFUtRfu00-UDV2ydBt_YBeFOCddgQiL0/edit?gid=507840090#gid=507840090",
  "Jacinta":         "https://docs.google.com/spreadsheets/d/1LrmJwV72g81i3oWYIhF42zZF1bgbJ8I6XgEVumLaaU8/edit?gid=1879642775#gid=1879642775",
  "Jane":            "https://docs.google.com/spreadsheets/d/1dqlAb47ARrR4fAdzTsQab2j4XM1RY3NGmmU1Yb5pS8k/edit?gid=1541591503#gid=1541591503",
  "John V":          "https://docs.google.com/spreadsheets/d/1P0T1Ia06WEu8c75Qc6lrpnyQTSOv9sLlOsEQnonCnXw/edit?gid=310272152#gid=310272152",
  "Jordan Gauci":    "https://docs.google.com/spreadsheets/d/1fJMLIoDFLnjnuvEsZu-8Q1rvG_He3EVmaObX-aUyf3A/edit?gid=1541591503#gid=1541591503",
  "Justin Frost":    "https://docs.google.com/spreadsheets/d/1qSjf3JWhAAoHMASk6eepAfvLRDoh4bvbA1B5e8AZ3I0/edit?gid=1541591503#gid=1541591503",
  "Karanpreet Singh":"https://docs.google.com/spreadsheets/d/1R9Fn7b1ql-llVFIixBTzYS1MZ_vXg7r2tAKIhMQ414Q/edit?gid=507840090#gid=507840090",
  "Karina":          "https://docs.google.com/spreadsheets/d/1RCAYAhBmMA9voSxXYZnwL5w9nRlrmSSPimml1aKhBNs/edit?gid=1541591503#gid=1541591503",
  "Kiko":            "https://docs.google.com/spreadsheets/d/12ORjH9v0KkkzQO_Dlec0c6SWWixcIFWqK4CZDa6Y9_I/edit?gid=1541591503#gid=1541591503",
  "Marc Gray":       "https://docs.google.com/spreadsheets/d/1jYqCxfZf9HsrZxpas_Ds5MIG3J_Qlm9wB5vM1iNk2c8/edit?gid=652228184#gid=652228184",
  "Mary Dankha":     "https://docs.google.com/spreadsheets/d/1prsUWaI4biA0AdMkos8c0my2l3z71Z2NnoopU9jOMCM/edit?gid=1541591503#gid=1541591503",
  "Moe Buksh":       "https://docs.google.com/spreadsheets/d/1ieNWsEW0VoQsaZ9tbxZDOPkBWWGSaVtpTdiRSEvT1iA/edit?gid=1541591503#gid=1541591503",
  "Nikita":          "https://docs.google.com/spreadsheets/d/1UJgm_X7LTTsX91y-9MKt-sHvzeXAVv5DCOD9Lz044qo/edit?gid=1541591503#gid=1541591503",
  "Nikola Gudelj":   "https://docs.google.com/spreadsheets/d/1-NKqxIC8KMPD1z5iClOkbcJ9bfuxlyNK454wlHFy1Hw/edit?gid=1541591503#gid=1541591503",
  "Patrick Vella":   "https://docs.google.com/spreadsheets/d/1bW4NLfYEiFYYIAgB1Fnq2To5NaoysofU2ALWX6drXsk/edit?gid=507840090#gid=507840090",
  "Perry Chitas":    "https://docs.google.com/spreadsheets/d/1ZY-Hx0bNgYxHkKdSK-5eoTSRXHe9BuLr02HMh8h_Ukg/edit?gid=507840090#gid=507840090",
  "Rhys":            "https://docs.google.com/spreadsheets/d/1YZT9j8nRBpLVA0y_zIh1ORbT7lNFRtaoOtnpMW35rOM/edit?gid=865529349#gid=865529349",
  "Ryan Baxter":     "https://docs.google.com/spreadsheets/d/18xC2fVICz1cu6JpYNU2fvY43aP99A0OQYBnWyTgy6ls/edit?gid=1541591503#gid=1541591503",
  "Shane Rose":      "https://docs.google.com/spreadsheets/d/15PKYJwb7qNIH-v5yJZrXf2e6Ekt0at6Cgo-JgCUb3Q8/edit?gid=507840090#gid=507840090",
  "Stefan Japranin": "https://docs.google.com/spreadsheets/d/1OlZ3x4W6YuU6SyxDT8Uf5qOPa45jKUjkjhzxlS6az2U/edit?gid=1541591503#gid=1541591503",
  "Teagan Eastman":  "https://docs.google.com/spreadsheets/d/1HPbaTZQDEkEw2z-1IMNw5siNHAU_ZB8O78KZsFJ-HTs/edit?gid=1541591503#gid=1541591503",
  "Tommy Barton":    "https://docs.google.com/spreadsheets/d/1mYj9YEIWX9cDMegj1vommGAoPXYTr0kZX8CaMlVH-3U/edit?gid=1541591503#gid=1541591503",
};

function normalize(n) { return n.toLowerCase().replace(/\s+/g, " ").trim(); }
function fuzzyMatch(cn, tn) {
  const c = normalize(cn), t = normalize(tn);
  if (c === t) return true;
  const cf = c.split(" ")[0], tf = t.split(" ")[0];
  return cf && tf && cf === tf;
}

async function main() {
  let clients = await redis.get("jarvis:clients");
  if (!clients) { console.error("No clients found"); process.exit(1); }
  if (typeof clients === "string") clients = JSON.parse(clients);
  console.log(`Found ${clients.length} clients\n`);

  let updated = 0, notFound = [];
  for (const [target, url] of Object.entries(UPDATES)) {
    const match = clients.find(c => fuzzyMatch(c.name, target));
    if (match) {
      match.spreadsheetUrl = url;
      console.log(`✓ ${match.name}`);
      updated++;
    } else {
      console.log(`✗ NOT FOUND: ${target}`);
      notFound.push(target);
    }
  }
  console.log(`\nUpdated: ${updated}/${Object.keys(UPDATES).length}`);
  if (notFound.length) console.log(`Not found: ${notFound.join(", ")}`);
  await redis.set("jarvis:clients", JSON.stringify(clients));
  console.log("✅ Written back to Redis");
}

main().catch(console.error);
