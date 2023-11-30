const express = require("express");
const router = express.Router();

const logger = require("../tools/logger").Create(__filename);

router.get("/", async (req, res) => {
  let [error, message] = ["", ""];
  if (req.session) {
    req.session = null;
  }
  if (req.query.error) error = req.query.error;
  if (req.query.message) message = req.query.message;
  res.render("pages/home", {
    error: error,
    message: message,
    copyright: new Date().getFullYear(),
  });
});

module.exports = router;
