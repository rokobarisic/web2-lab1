const path = require("path");
const express = require("express");
const { auth, requiresAuth } = require("express-openid-connect");
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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Interna greška poslužitelja");
});

app.listen(config.port, () => {
  console.log(`Aplikacija sluša na ${config.baseUrl} (port ${config.port})`);
});
