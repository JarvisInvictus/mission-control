// One-off: Update Monday spreadsheet URLs directly in Upstash Redis
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const UPDATES = {
  "Alan Tran":       "https://docs.google.com/spreadsheets/d/1otQyorCBDEJhHTCY5OOVJhQICNP_fCV-36O_8oA67ik/edit?gid=719489940#gid=719489940",
  "Aleks Leman":     "https://docs.google.com/spreadsheets/d/1qKld3K-gr1EYNT6KFfKADx569sfrB4JGNxfWSKzadSw/edit?gid=1882761732#gid=1882761732",
  "Ali Baydoun":     "https://docs.google.com/spreadsheets/d/1jiR412sjkk1iO-s_8-mtzhOMWAFeCuDlElMx_LyKkTc/edit?gid=507840090#gid=507840090",
  "Amber":           "https://docs.google.com/spreadsheets/d/1Hgb6Xumd9HxvhUyiPMUa7Y8txjTIHva7Yj1E_oKSjtg/edit?gid=1960533859#gid=1960533859",
  "Beth Closter":    "https://docs.google.com/spreadsheets/d/1FyU5p_RUJkalCMHL0FqFzI2uWqzGBna_Xx_xCadl6ow/edit?gid=507840090#gid=507840090",
  "Brooke":          "https://docs.google.com/spreadsheets/d/1ZeJbsNgAuu6airptwPEGHmOLrTkDH63Xf84EbjDb5Sk/edit?gid=1931560127#gid=1931560127",
  "Carly":           "https://docs.google.com/spreadsheets/d/1_fheGXoVAZw6KPfC33OTovGxlZ8Tk1Qqm0KCm0U5QJI/edit?gid=283935262#gid=283935262",
  "Casey":           "https://docs.google.com/spreadsheets/d/17BQASMFgIDf1IYmB0_BWNVeqlNMSPnAa2vps95QlaPQ/edit?gid=852163738#gid=852163738",
  "Ethan Leahy":     "https://docs.google.com/spreadsheets/d/1EFWOo3xSajqRGBvnuCvfaF-se2M_ljXd5SQ1kOP-Ca4/edit?gid=2027435262#gid=2027435262",
  "Felicity":        "https://docs.google.com/spreadsheets/d/19u44BwEG-PQ40JufzaUxX9UH5wTCWV81mFdtevsnuG8/edit?gid=1885076364#gid=1885076364",
  "Gianna":          "https://docs.google.com/spreadsheets/d/1OqLg87HOJAHYo_lfs_XsAQeFNR7gEBNSlKRZrJ8kaBU/edit?gid=1541591503#gid=1541591503",
  "John Obtinalla":   "https://docs.google.com/spreadsheets/d/1-uIMqFukPnvS1uBjbeczpfHjSsQ0736lzI1LoXLZXGI/edit?gid=507840090#gid=507840090",
  "Kayla":           "https://docs.google.com/spreadsheets/d/1q6TiPr7HsjYVnGL3EIDbFSpLtd2_3O0uy3g6HFwGw5Q/edit?gid=1879642775#gid=1879642775",
  "Kobe Vella":      "https://docs.google.com/spreadsheets/d/1S8dfPIX2X0QvuEj1lYnx5tMOMNGyehSwdWpYOF_fXmw/edit?gid=1879642775#gid=1879642775",
  "Madison G":        "https://docs.google.com/spreadsheets/d/1o7QmwIRHpD_JbUPvdGf9bVmWZTVUBgz-_GlQFnlqI3I/edit?gid=507840090#gid=507840090",
  "Mandy Tramer":    "https://docs.google.com/spreadsheets/d/1kqxcuWO4blz5eNcH-YOwl2heKzaJG1mfeovaP2mJd4k/edit?gid=1541591503#gid=1541591503",
  "Mark Honeyman":   "https://docs.google.com/spreadsheets/d/1Uo-uGEWacopSK0r1hpgkkC6dUxugtk9RBQmjJCTPBoI/edit?gid=282268318#gid=282268318",
  "Miguel":          "https://docs.google.com/spreadsheets/d/14LghwzPbVlJXdekpVpZppbLsy95ztockXBOaJrVkRfc/edit?gid=384617258#gid=384617258",
  "Natalie":         "https://docs.google.com/spreadsheets/d/1TBxmb9JWHMeJM2YqZiUn75yFx8ww2Ra8-AjutQclM9I/edit?gid=507840090#gid=507840090",
  "Nich Pappas":     "https://docs.google.com/spreadsheets/d/1F8bKjNhTfRPTLcB4IMGRCa5GAkhFCcpw18tRNs5YzXg/edit?gid=1541591503#gid=1541591503",
  "Sarah Grech":     "https://docs.google.com/spreadsheets/d/1J8DYWiEgKIg0MtigZ30h3wiKrkUyc1S9t5dyytNTKP0/edit?gid=507840090#gid=507840090",
  "Sarah Zalejski":  "https://docs.google.com/spreadsheets/d/1I8MSoXpOvM0hF4U2lnlPWJld8BFFl7vqiTMDcS91aQE/edit?gid=1541591503#gid=1541591503",
  "Tanya":           "https://docs.google.com/spreadsheets/d/1K7_swqFsfdJBAVCOnYEJYzN2K4IksBTU7GerzUzgelg/edit?gid=730641675#gid=730641675",
  "Tara-Lee White":  "https://docs.google.com/spreadsheets/d/1sgwYHYMg_CaeoLKi-S5Mq8N-FCnhK5vN1h7iP87IloE/edit?gid=507840090#gid=507840090",
  "Trisha":          "https://docs.google.com/spreadsheets/d/1xusOua8awUBByfo-HliFznOhRVZGGJmDRqZMk1M4QjI/edit?gid=507840090#gid=507840090",
  "Yasin":           "https://docs.google.com/spreadsheets/d/1l89ycxsQt5QmIrX3gd1t8zUh31_PUZ4UFT6MIbQBHXE/edit?gid=1257056358#gid=1257056358",
};

function normalize(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function fuzzyMatch(clientName, targetName) {
  const c = normalize(clientName);
  const t = normalize(targetName);
  if (c === t) return true;
  const cFirst = c.split(" ")[0];
  const tFirst = t.split(" ")[0];
  if (cFirst && tFirst && cFirst === tFirst) return true;
  return false;
}

async function main() {
  console.log("Fetching clients from Redis...");
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
