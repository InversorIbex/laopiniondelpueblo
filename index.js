require("express");

function fallback(error) {
  const express = require("express");
  const app = express();
  const message = String(error && (error.stack || error.message) || error)
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://***")
    .slice(0, 1500);
  app.use((req, res) => {
    res.status(500).type("text/plain; charset=utf-8").send(message);
  });
  return app;
}

let app;
try {
  app = require("./server/index").createApp();
} catch (error) {
  app = fallback(error);
}

module.exports = app;
