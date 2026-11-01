const path = require("path");
const express = require("express");
const { auth, requiresAuth } = require("express-openid-connect");
const { auth: jwtAuth, requiredScopes } = require("express-oauth2-jwt-bearer");
const QRCode = require("qrcode");
const config = require("./config");
const db = require("./db");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "..", "public")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  auth({
    authRequired: false,
    auth0Logout: true,
    baseURL: config.baseUrl,
    issuerBaseURL: config.oidc.issuerBaseURL,
    clientID: config.oidc.clientID,
    clientSecret: config.oidc.clientSecret,
    secret: config.oidc.secret,
  }),
);

app.get("/", async (req, res, next) => {
  try {
    const stats = await db.getStats();
    res.render("home", {
      total: stats.total,
      active: stats.active,
      isAuthenticated: req.oidc.isAuthenticated(),
      user: req.oidc.user,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/info/:id", async (req, res, next) => {
  try {
    const pass = await db.getPass(req.params.id);
    if (!pass) {
      return res.status(404).render("404", { id: req.params.id });
    }
    res.render("info", {
      id: req.params.id,
      name: pass.name,
      document: pass.document,
      issuedAt: pass.issued_at,
      status: pass.status,
    });
  } catch (err) {
    return res.status(404).render("404", { id: req.params.id });
  }
});

app.get("/restricted/passes", requiresAuth(), async (req, res, next) => {
  try {
    const passes = await db.listPasses();
    res.render("passes", { passes });
  } catch (err) {
    next(err);
  }
});

app.post(
  "/restricted/passes/:id/cancel",
  requiresAuth(),
  async (req, res, next) => {
    try {
      await db.cancelPass(req.params.id);
      res.redirect("/restricted/passes");
    } catch (err) {
      next(err);
    }
  },
);

app.post(
  "/restricted/passes/:id/delete",
  requiresAuth(),
  async (req, res, next) => {
    try {
      await db.deletePass(req.params.id);
      res.redirect("/restricted/passes");
    } catch (err) {
      next(err);
    }
  },
);

const checkJwt = jwtAuth({
  issuerBaseURL: config.m2m.issuerBaseURL,
  audience: config.m2m.audience,
});

app.get(
  "/passes/:id",
  checkJwt,
  requiredScopes("read:passes"),
  async (req, res, next) => {
    try {
      const pass = await db.getPass(req.params.id);
      if (!pass) {
        return res
          .status(404)
          .json({ error: "Tražena propusnica ne postoji!" });
      }
      res.json({
        id: pass.id,
        name: pass.name,
        document: pass.document,
        issuedAt: new Date(pass.issued_at)
          .toISOString()
          .replace(/\.\d{3}Z$/, "Z"),
        status: pass.status,
      });
    } catch (err) {
      next(err);
    }
  },
);

app.post(
  "/passes",
  checkJwt,
  requiredScopes("create:passes"),
  async (req, res, next) => {
    try {
      const name =
        typeof req.body.name === "string" ? req.body.name.trim() : "";
      const document =
        typeof req.body.document === "string" ? req.body.document.trim() : "";

      if (!name || !document) {
        return res.status(400).json({
          error:
            "Nešto je pošlo po zlu. Provjeri jesi li ispravno dodao polja 'name' i 'document'. Ne smiju biti prazna!",
        });
      }

      const pass = await db.createPass(name, document);

      const url = `${config.baseUrl}/info/${pass.id}`;
      const qr = await QRCode.toBuffer(url, { type: "png" });

      res.status(201);
      res.set("Location", `${config.baseUrl}/passes/${pass.id}`);
      res.type("image/png");
      res.send(qr);
    } catch (err) {
      next(err);
    }
  },
);

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode;
  if (status) {
    if (err.headers) {
      res.set(err.headers);
    }
    return res.status(status).json({
      error: err.message || "Greška autorizacije",
    });
  }
  console.error(err);
  res.status(500).send("Interna greška poslužitelja");
});

app.listen(config.port, () => {
  console.log(`Aplikacija sluša na ${config.baseUrl} (port ${config.port})`);
});
