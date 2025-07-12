const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "skill_swap.db");
const db = new sqlite3.Database(DB_PATH);

function printDuplicates(label, cb) {
  db.all(
    `SELECT name, GROUP_CONCAT(id) as ids, COUNT(*) as cnt FROM skills GROUP BY name HAVING cnt > 1`,
    (err, rows) => {
      if (err) return cb(err);
      if (rows.length === 0) {
        console.log(`No duplicate skills found ${label}.`);
      } else {
        console.log(`Duplicate skills ${label}:`);
        rows.forEach((row) => {
          console.log(`  ${row.name}: IDs [${row.ids}]`);
        });
      }
      cb();
    }
  );
}

async function deduplicateSkills() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      printDuplicates("before deduplication", async (err) => {
        if (err) return reject(err);
        // 1. Find duplicate skill names
        db.all(
          `SELECT name, MIN(id) as canonical_id, GROUP_CONCAT(id) as all_ids, COUNT(*) as cnt
                FROM skills
                GROUP BY name
                HAVING cnt > 1`,
          async (err, rows) => {
            if (err) return reject(err);
            if (!rows.length) return resolve("No duplicates found.");

            for (const row of rows) {
              const { name, canonical_id, all_ids } = row;
              const ids = all_ids.split(",").map(Number);
              // Remove canonical_id from the list of duplicates
              const duplicate_ids = ids.filter((id) => id !== canonical_id);

              if (duplicate_ids.length === 0) continue;

              // 2. Update user_skills_offered
              await new Promise((res, rej) => {
                db.run(
                  `UPDATE user_skills_offered SET skill_id = ? WHERE skill_id IN (${duplicate_ids
                    .map(() => "?")
                    .join(",")})`,
                  [canonical_id, ...duplicate_ids],
                  function (err) {
                    if (err) rej(err);
                    else res();
                  }
                );
              });

              // 3. Update user_skills_wanted
              await new Promise((res, rej) => {
                db.run(
                  `UPDATE user_skills_wanted SET skill_id = ? WHERE skill_id IN (${duplicate_ids
                    .map(() => "?")
                    .join(",")})`,
                  [canonical_id, ...duplicate_ids],
                  function (err) {
                    if (err) rej(err);
                    else res();
                  }
                );
              });

              // 4. Delete duplicate skills
              await new Promise((res, rej) => {
                db.run(
                  `DELETE FROM skills WHERE id IN (${duplicate_ids
                    .map(() => "?")
                    .join(",")})`,
                  duplicate_ids,
                  function (err) {
                    if (err) rej(err);
                    else res();
                  }
                );
              });

              console.log(
                `Deduplicated skill '${name}': kept ID ${canonical_id}, removed IDs [${duplicate_ids.join(
                  ", "
                )}]`
              );
            }
            printDuplicates("after deduplication", () =>
              resolve("Deduplication complete.")
            );
          }
        );
      });
    });
  });
}

deduplicateSkills()
  .then((msg) => {
    console.log(msg);
    db.close();
  })
  .catch((err) => {
    console.error("Error:", err);
    db.close();
  });
