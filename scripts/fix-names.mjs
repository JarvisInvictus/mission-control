// Script to fix ALL CAPS client names to Title Case
const API = "https://mission-control-gray-rho.vercel.app/api/clients";

function toTitleCase(str) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

async function main() {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`GET failed: ${res.status}`);
  const clients = await res.json();
  console.log(`Found ${clients.length} clients`);

  let fixed = 0;
  for (const client of clients) {
    const corrected = toTitleCase(client.name);
    if (corrected !== client.name) {
      await fetch(`${API}/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: corrected }),
      });
      console.log(`  PATCH ${client.id}: "${client.name}" → "${corrected}"`);
      fixed++;
    }
  }
  console.log(`\nFixed ${fixed} names`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
