const express = require("express");
const BackServices = require("../services/BackServices");
const Connection = require("../services/Connection");
const Tools = require("../tools/Tools");
const router = express.Router();
const logger = require("../tools/logger").Create(__filename);

// just in case
router.use((req, res, next) => {
  if (!req.session.editor) {
    res.json({
      status: 400,
      datas: "You must be logged as an admin first",
    });
    return; // stop everything otherwise we get HTTP_HEADER_SENT
  }
  next();
});

router.get("/character", async (req, res) => {
  let con = null;
  try {
    con = Connection();
    const { name } = req.query;
    if (!name) {
      throw Error("<name> is empty");
    }
    const result = await BackServices.getCharacterByName(con, name);
    res.status(200).json({
      status: 200,
      datas: result,
    });
  } catch (err) {
    res.status(400).json({
      status: 400,
      datas: err.toString(),
    });
    console.error(err.toString());
  } finally {
    if (con != null) con.end();
  }
});

router.get("/question", async (req, res) => {
  let con = null;
  try {
    con = Connection();
    const { content } = req.query;
    if (!content) {
      throw Error("<content> is empty");
    }
    const result = await BackServices.getQuestionByContent(con, content);
    res.status(200).json({
      status: 200,
      datas: result,
    });
  } catch (err) {
    res.status(400).json({
      status: 400,
      datas: err.toString(),
    });
    console.error(err.toString());
  } finally {
    if (con != null) con.end();
  }
});

router.post("/editor_data", async (req, res) => {
  let con = null;
  try {
    con = Connection();
    // console.log(req.body);
    const { character, questions } = req.body;
    if (Tools.isEmpty(character)) {
      throw Error("character field is empty");
    }

    if (Tools.isEmpty(questions)) {
      throw Error("question field is empty");
    }

    await BackServices.insertOrUpdateCharaFromPost(con, character, questions);

    res.status(200).json({
      status: 200,
      datas: "Success !",
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({
      status: 400,
      datas: err.toString(),
    });
  } finally {
    if (con != null) con.end();
  }
});

module.exports = router;
