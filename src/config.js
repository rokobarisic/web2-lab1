require("dotenv").config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Nedostaje obavezna varijabla okoline: ${name}`);
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

const config = {
  port: parseInt(optional("PORT", "3000"), 10),
  baseUrl: optional("BASE_URL", "http://localhost:3000").replace(/\/+$/, ""),

  db: {
    connectionString: required("DATABASE_URL"),
    ssl:
      optional("DATABASE_SSL", "false") === "true"
        ? { rejectUnauthorized: false }
        : false,
  },

  oidc: {
    issuerBaseURL: optional("OIDC_ISSUER_BASE_URL", ""),
    clientID: optional("OIDC_CLIENT_ID", ""),
    clientSecret: optional("OIDC_CLIENT_SECRET", ""),
    secret: optional("SESSION_SECRET", ""),
  },

  m2m: {
    audience: optional("AUTH0_AUDIENCE", ""),
    issuerBaseURL: optional("AUTH0_ISSUER_BASE_URL", ""),
  },
};

module.exports = config;
