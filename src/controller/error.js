const express = require("express");
const router = express.Router();
const logger = require("../tools/logger").Create(__filename);

router.get("/404", async (req, res) => {
  res.render("pages/error", {
    message: "Error 404 - Page Not Found :(",
    copyright: new Date().getFullYear(),
  });
});

router.get("/500", async (req, res) => {
  res.render("pages/error", {
    message: "Error 500 - internal server error :(",
    copyright: new Date().getFullYear(),
  });
});

module.exports = router;
