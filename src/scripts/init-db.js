const db = require("../db");

(async () => {
  try {
    await db.initSchema();
    console.log('Shema baze je kreirana (tablica "passes").');
  } catch (err) {
    console.error("Greška pri kreiranju sheme:", err.message);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
})();
