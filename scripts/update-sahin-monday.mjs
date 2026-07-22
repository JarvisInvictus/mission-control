// Move Sahin to Monday + update his spreadsheet URL
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const NEW_URL = "https://docs.google.com/spreadsheets/d/12HxbJM_HYtOkJWOJyTp2mzkNQwcFPd4SSeBR0WX2r8I/edit?gid=2061472357#gid=2061472357";

async function main() {
  let clients = await redis.get("jarvis:clients");
  if (!clients) { console.error("No clients found"); process.exit(1); }
  if (typeof clients === "string") clients = JSON.parse(clients);

  const sahin = clients.find(c => c.name?.toLowerCase().startsWith("sahin"));
  if (!sahin) { console.error("Sahin not found!"); process.exit(1); }

  console.log("Before:", JSON.stringify({ name: sahin.name, checkinDay: sahin.checkinDay, spreadsheetUrl: sahin.spreadsheetUrl?.slice(0, 60) + "..." }));

  sahin.checkinDay = "monday";
  sahin.spreadsheetUrl = NEW_URL;

  console.log("After:", JSON.stringify({ name: sahin.name, checkinDay: sahin.checkinDay, spreadsheetUrl: sahin.spreadsheetUrl?.slice(0, 60) + "..." }));

  await redis.set("jarvis:clients", JSON.stringify(clients));
  console.log("✅ Sahin updated — Monday + new sheet");
}

main().catch(console.error);
