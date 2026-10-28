// Vercel uses this root entry point and runs the exported Express app as a function.
const express = require("./Server/node_modules/express");
const app = express();

app.use(require("./Server/server.js"));

module.exports = app;
