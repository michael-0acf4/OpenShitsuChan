const Connection = require("../services/Connection");
const DBModel = require("../model/DBModel");
const BackServices = require("../services/BackServices");

(async () => {
  let con = null;
  try {
    con = Connection();
    let out = await BackServices.performEntropyStatistics(con);
    console.log(BackServices.formatStatString(...Object.values(out)));
  } catch (err) {
    console.error(err.toString());
  } finally {
    if (con != null) con.end();
  }
})();
