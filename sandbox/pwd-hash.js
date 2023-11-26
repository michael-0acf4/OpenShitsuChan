const crypto = require("crypto");

/**
 * Generate a password hash value for configuring the backoffice
 * @usage
 * node path/pwd-hash your_password
 */
const [, , password] = process.argv;

const hash = crypto
  .createHash("sha256")
  .update(password)
  .digest("hex");

console.log("Generated hash value :");
console.log(hash);
