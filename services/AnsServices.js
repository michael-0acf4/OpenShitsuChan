const config = require("../tools/project.config.json");
const CoreServices = require("./CoreServices");
const DBModel = require("../model/DBModel");
const logger = require("../tools/logger").Create(__filename);

module.exports = class AnsServices {
  /**
   * @param {*} connexion
   * @param {string} chara_name
   * @param {string} your_name
   * @param {JSON[]} answers_so_far
   */
  static async submitAnswersFor(
    connexion,
    chara_name,
    your_name,
    answers_so_far,
  ) {
    let match_chara = await CoreServices.getBestMatchCharacterByName(
      connexion,
      chara_name,
    );
    const db = DBModel.use(connexion);

    if (match_chara == null) {
      const seq = await db.nextval('"characterSeq"');
      // it exists
      match_chara = {
        idcharacter: "CHR_" + seq,
        name: chara_name, // should be != 'X'
        image: null,
        play_count: 1,
        submitted_by: your_name,
        submit_time: db.PGDefault,
      };
      await db.insert('"Character"', match_chara); // more quote
      logger.warn("Inserting new character, name = " + chara_name);
    } else {
      logger.info("Found matching chara -- updating");
    }

    for (let qid in answers_so_far) {
      const pr = answers_so_far[qid];
      await AnsServices.insertOrUpdate(
        connexion,
        match_chara,
        qid,
        pr,
        chara_name,
      );
    }
  }

  /**
   * @param {*} connexion
   * @param {JSON} character
   * @param {string} idquestion
   * @param {number} probability
   * @param {string} chara_name
   */
  static async insertOrUpdate(
    connexion,
    character,
    idquestion,
    probability,
    chara_name = "X",
  ) {
    const db = DBModel.use(connexion);
    // chara exists already
    const answer = await AnsServices.getAnswerByIdQuestionAndChara(
      connexion,
      idquestion,
      character.idcharacter,
    );
    if (answer == null) {
      // must insert an answer for that question
      // now insert the corresponding answer for that question
      await db.insert('"Answer"', {
        idanswer: db.PGDefault,
        probability: probability,
        idquestion: idquestion,
        idcharacter: character.idcharacter,
      });
    } else {
      // just update it !
      const nproba = AnsServices.correctProbability(
        parseFloat(answer.probability),
        probability,
      );
      await db.updateById('"Answer"', { probability: nproba }, answer.idanswer);
    }
  }

  /**
   * @param {*} connexion
   * @param {string} idquestion
   * @param {string} idcharacter
   */
  static async getAnswerByIdQuestionAndChara(
    connexion,
    idquestion,
    idcharacter,
  ) {
    const db = DBModel.use(connexion);
    const ans = await db.get_where('"Answer"', {
      idquestion: idquestion,
      idcharacter: idcharacter,
    });
    return ans.rows[0] || null;
  }

  /**
   * Corrects a given probability according to the project configuration
   * @param {number} current_probability
   * @param {number} given_probability
   */
  static correctProbability(current_probability, given_probability) {
    if (given_probability < 0 || given_probability > 1) {
      throw Error("Probability should be between 0 and 1");
    }
    const { correction } = config.constant;
    const sign = given_probability < current_probability ? -1 : 1;
    const distance = Math.abs(current_probability - given_probability);
    const dp = correction * distance;
    return Math.min(1, Math.max(current_probability + sign * dp, 0.0001));
  }

  /**
   * When the user is doing stupid things
   * @param {*} answers_so_far
   */
  static isDoingRandomStuff(answers_so_far) {
    let values = Object.values(answers_so_far);
    if (values.length == 0) {
      return false;
    }
    // most answer is a 'I dont know'
    const statistics = {};
    for (let val of values) {
      statistics[val] = statistics[val] == undefined
        ? 1
        : (statistics[val] + 1);
    }

    for (let key in statistics) {
      statistics[key] /= values.length;
      // percentage
      statistics[key] = Math.floor(statistics[key] * 100);
    }

    if (statistics["0.5"] > 85) {
      return true;
    }
  }
};
