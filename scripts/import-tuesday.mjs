// Bulk import Tuesday clients
const API = "https://mission-control-gray-rho.vercel.app/api/clients";

const clients = [
  { name: "Afshan Madan", paymentPlatform: "Newie", weeklyCharge: 100 },
  { name: "Anki Dankha", paymentPlatform: "Newie", weeklyCharge: 100 },
  { name: "Brandon Gawn", paymentPlatform: "Newie", weeklyCharge: 70 },
  { name: "Charli Drew", paymentPlatform: "Newie", weeklyCharge: 90 },
  { name: "Courtney Mckenzie", paymentPlatform: "Newie", weeklyCharge: 90 },
  { name: "Dylan Simmons", paymentPlatform: "Newie", weeklyCharge: 90 },
  { name: "Hamza Ozsehitoglu", paymentPlatform: "Newie", weeklyCharge: 90 },
  { name: "Harrish", paymentPlatform: "Newie", weeklyCharge: 90 },
  { name: "Jacinta", paymentPlatform: "Newie", weeklyCharge: 75 },
  { name: "Jane", paymentPlatform: "Newie", weeklyCharge: 80 },
  { name: "Joe Sofra", paymentPlatform: "Upfront", weeklyCharge: 80 },
  { name: "John V", paymentPlatform: "Newie", weeklyCharge: 60 },
  { name: "Jordan Gauci", paymentPlatform: "Newie", weeklyCharge: 100 },
  { name: "Justin Frost", paymentPlatform: "Newie", weeklyCharge: 100 },
  { name: "Karanpreet Singh", paymentPlatform: "Newie", weeklyCharge: 90 },
  { name: "Karina", paymentPlatform: "Newie", weeklyCharge: 70 },
  { name: "Kiko", paymentPlatform: "Upfront", weeklyCharge: 80 },
  { name: "Marc Gray", paymentPlatform: "Newie", weeklyCharge: 90 },
  { name: "Mary Dankha", paymentPlatform: "Newie", weeklyCharge: 100 },
  { name: "Moe Buksh", paymentPlatform: "Newie", weeklyCharge: 80 },
  { name: "Nikita", paymentPlatform: "Newie", weeklyCharge: 90 },
  { name: "Patrick Vella", paymentPlatform: "Newie", weeklyCharge: 90 },
  { name: "Perry Chitas", paymentPlatform: "Newie", weeklyCharge: 90 },
  { name: "Rhys", paymentPlatform: "Upfront", weeklyCharge: 75 },
  { name: "Ryan Baxter", paymentPlatform: "Newie", weeklyCharge: 100 },
  { name: "Shane Rose", paymentPlatform: "Newie", weeklyCharge: 0 },
  { name: "Stefan Japranin", paymentPlatform: "Newie", weeklyCharge: 70 },
  { name: "Teagan Eastman", paymentPlatform: "Newie", weeklyCharge: 100 },
  { name: "Tommy Barton", paymentPlatform: "Newie", weeklyCharge: 80 },
  { name: "Nikola Gudelj", paymentPlatform: "Newie", weeklyCharge: 90 },
];

async function main() {
  let imported = 0;
  for (const c of clients) {
    const payload = {
      ...c,
      email: `${c.name.toLowerCase().replace(/ /g, ".")}@placeholder.com`,
      coach: "Milzzy",
      status: "active",
      checkInDay: "Tuesday",
      startDate: "2026-03-23",
      spreadsheetUrl: "",
      pausedUntil: undefined,
      notes: "",
    };
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      imported++;
      console.log(`  + ${c.name}`);
    } else {
      const err = await res.text();
      console.error(`  FAIL ${c.name}: ${err}`);
    }
  }
  console.log(`\nImported ${imported}/${clients.length} Tuesday clients`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
