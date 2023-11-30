const express = require("express");
const router = express.Router();
const logger = require("../tools/logger").Create(__filename);

router.use((req, res, next) => {
  req.session = null;
  next();
});

router.get("/about", async (req, res) => {
  res.render("pages/about", {
    copyright: new Date().getFullYear(),
  });
});

module.exports = router;
