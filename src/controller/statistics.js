const express = require("express");
const Connection = require("../services/Connection");
const BackServices = require("../services/BackServices");
const router = express.Router();
const logger = require("../tools/logger").Create(__filename);

router.use(async (req, res, next) => {
  req.session = null;
  next();
});

router.get("/", async (req, res) => {
  let con = null;
  try {
    con = Connection();
    let out = await BackServices.performEntropyStatistics(con);
    let str = BackServices.formatStatString(...Object.values(out));
    res.send(str.replace(/\n/g, "<br/>"));
  } catch (err) {
    console.error(err.toString());
    res.redirect("/error/500");
  } finally {
    if (con != null) con.end();
  }
});

module.exports = router;
