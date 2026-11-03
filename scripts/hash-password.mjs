/**
 * Generuje skrót hasła admina do zmiennej ADMIN_PASSWORD_HASH.
 *   node scripts/hash-password.mjs "twoje-hasło"
 *   node scripts/hash-password.mjs            ← wygeneruje losowe hasło
 */
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2] || randomBytes(18).toString("base64url");
const N = 16384, r = 8, p = 1;
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32, { N, r, p });
if (!process.argv[2]) console.log(`Hasło:               ${password}`);
// separator „:” — bez znaków „$”, które bywają interpretowane przy wklejaniu zmiennych
console.log(`ADMIN_PASSWORD_HASH=scrypt:${N}:${r}:${p}:${salt.toString("base64url")}:${hash.toString("base64url")}`);
