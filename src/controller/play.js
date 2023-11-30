const express = require("express");
const router = express.Router();

const logger = require("../tools/logger").Create(__filename);
const Connection = require("../services/Connection");
const Tools = require("../tools/Tools");
const QuestServices = require("../services/QuestServices");
const CoreServices = require("../services/CoreServices");
const config = require("../tools/project.config.json");
const AnsServices = require("../services/AnsServices");

router.get("/", async (req, res) => {
  const { gtrace } = req.query;

  // nothing to worry if session is empty or != null
  // if the user starts a new game, we must correct our database to make it more precise
  if (req.session.user && req.session.user.chara_in_mind) {
    // if it matches this means we haven't started a new game yet
    const chara_in_mind = req.session.user.chara_in_mind;
    // protect us from a bad data pollution
    const { accepting_prob_update } = config.constant;
    // console.log(chara_in_mind);
    // console.log(chara_in_mind.probability);
    if (
      gtrace == req.session.user.random_seed &&
      chara_in_mind.probability > accepting_prob_update
    ) {
      let con = null;
      try {
        con = Connection();
        const name = chara_in_mind.name;
        await con.query("BEGIN");
        await AnsServices.submitAnswersFor(
          con,
          name,
          "@me",
          req.session.user.answers,
        );
        await con.query("COMMIT");
      } catch (err) {
        await con.query("ROLLBACK");
        logger.error(err);
      } finally {
        if (con != null) con.end();
      }
    }
  }

  const count_signature = Tools.randomSeed();

  req.session.user = {
    answers: {},
    chara_in_mind: null,
    ai_reaction_index: 0, // by default we show the clueless pic
    random_seed: Tools.randomSeed(), // unique to a specific user
    count_signature: { // prevents double counting (when the refresh button is clicked)
      first: count_signature,
      second: count_signature, // value to compare to the first value (changed after a count update)
    },
  };
  res.redirect("/play/game");
});

router.get("/game", async (req, res) => {
  let [error, message] = ["", ""];
  let con = null;
  const game_data = {
    question: null,
    responses: QuestServices.getChoicesMap(),
    ai_reaction_index: 0,
    number_q: 0,
  };
  try {
    con = Connection();
    // console.log(req.session.user);
    const exclude = Object.keys(req.session.user.answers); // question ids
    const question = await QuestServices.getSingleQuestion(
      con,
      exclude,
      req.session.user.chara_in_mind,
    );
    // then exclude it for the next session turn
    if (question == null) {
      res.redirect("/play/game/result");
      return;
    }

    game_data.question = question;
    game_data.ai_reaction_index = req.session.user.ai_reaction_index;
    game_data.number_q = 1 + Object.keys(req.session.user.answers).length;

    if (req.query.error) error = req.query.error;
    if (req.query.message) message = req.query.message;
  } catch (err) {
    logger.error(err.toString());
    error += " " + err.toString();
    res.redirect("/error/500");
  } finally {
    if (con != null) con.end();
    if (game_data.question != null) {
      res.render("pages/play", {
        error: error,
        message: message,
        game_data: game_data,
        display_stop: (game_data.number_q >= config.listing.show_stop_after_q),
        uppFirst: Tools.uppFirst,
        copyright: new Date().getFullYear(),
      });
    }
  }
});

router.get("/game/choose/:qid/:choice_index", async (req, res) => {
  let con = null;
  try {
    con = Connection();
    const { sort, top } = config.listing;
    const { qid, choice_index } = req.params;

    if (!qid || !choice_index) {
      throw Error("qid or choice_index invalid");
    }

    // add new answer to the session
    req.session.user.answers[qid] = QuestServices.pickProbability(choice_index);

    const result = await CoreServices.computeProbForAllCharacters(
      con,
      req.session.user.answers,
      sort,
      top,
    );
    // update session
    req.session.user.ai_reaction_index = QuestServices.getAIReactionIndex(
      result,
    );
    req.session.user.chara_in_mind = result[0];

    // console.log(req.session.user.answers);
    // console.log(req.session.user.chara_in_mind);

    const isRandom = AnsServices.isDoingRandomStuff(req.session.user.answers);
    // console.log(result);

    // if we got high match, no need to go for further questions
    const count_responses = Object.keys(req.session.user.answers).length;
    const min_todo = config.listing.min_question_to_do;

    if (
      count_responses >= min_todo &&
      QuestServices.shouldProbablyStopGiven(result)
    ) {
      res.redirect("/play/game/result" + (isRandom ? "?rnd=t" : ""));
    } else {
      res.redirect("/play/game");
    }
  } catch (err) {
    logger.error(err.toString());
    res.redirect("/error/500");
  } finally {
    if (con != null) con.end();
  }
});

router.get("/game/result", async (req, res) => {
  let con = null;
  try {
    con = Connection();
    let result_datas = req.session.user;
    let { rnd } = req.query;
    let isRandom = !Tools.isEmpty(rnd);
    if (isRandom) {
      result_datas.ai_reaction_index = 1;
    }

    const { count_signature } = req.session.user;
    if (count_signature.first == count_signature.second) {
      await CoreServices.incrementPlayCount(con, result_datas.chara_in_mind.id);
      count_signature.second = ""; // prevents the next refresh to be recounted
      logger.info("Counting -- signature --" + count_signature.first);
    } else {
      logger.warn("Not Counting -- signature mismatch --");
    }

    // req.session.user = null; // maybe ?
    res.render("pages/end", {
      uppFirst: Tools.uppFirst,
      result_datas: result_datas,
      makePercent: Tools.makePercent,
      isRandom: isRandom,
      copyright: new Date().getFullYear(),
    });
  } catch (err) {
    logger.error(err.toString());
    res.redirect("/error/500");
  } finally {
    if (con != null) con.end();
  }
});

router.get("/game/result/wrong", async (req, res) => {
  let [error, message] = ["", ""];
  if (req.query.error) error = req.query.error;
  if (req.query.message) message = req.query.message;

  let result_datas = req.session.user;
  res.render("pages/wrong", {
    message: message,
    error: error,
    result_datas: result_datas,
    isEmpty: Tools.isEmpty,
    copyright: new Date().getFullYear(),
  });
});

router.post("/game/result/wrong", async (req, res) => {
  let con = null;
  try {
    con = Connection();
    let { name, your_name } = req.body;
    // console.log(name);
    if (Tools.isEmpty(name)) {
      throw Error("Character name is empty");
    }
    if (Tools.isEmpty(your_name)) {
      your_name = "X";
    }

    await con.query("BEGIN");
    await AnsServices.submitAnswersFor(
      con,
      name,
      your_name,
      req.session.user.answers,
    );
    await con.query("COMMIT");

    res.redirect("/play/game/result/wrong?message=Thanks!");
  } catch (err) {
    await con.query("ROLLBACK");
    res.redirect("/play/game/result/wrong?error=" + err.toString());
  } finally {
    if (con != null) con.end();
  }
});

module.exports = router;
