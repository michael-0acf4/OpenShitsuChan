const config = require("../tools/project.config.json");
const DBModel = require("../model/DBModel");
const logger = require("../tools/logger").Create(__filename);

module.exports = class CoreServices {
  /**
   * @param {*} connexion
   * @param {string} idcharacter current hypothesis
   * @param {JSON} answers_so_far {q1 : p1, q2 : p2, ...}
   * @param {JSON} statCharaOf {idchara : {q1 : p1, q2 : p2...., ...}, ...}
   */
  static async computeProbabilities(
    connexion,
    idcharacter,
    answers_so_far,
    statCharaOf = null,
  ) {
    // {idchara : {a1 : ..., a2 : ...., ...}}
    if (statCharaOf == null || statCharaOf == undefined) {
      statCharaOf = await CoreServices.getCharacterSetAsMap(connexion);
    }
    const total_charas = await CoreServices.countCharacters(connexion);

    const P_H = 1 / total_charas; // equal probabilities for each chara
    const P_notH = 1 - P_H;
    let prod_pEk_given_H = 1, prod_pEk_given_notH = 1;

    for (let qid in answers_so_far) {
      const ans = answers_so_far[qid];
      // if the question's answer is not properly defined
      // we cannot answer yes or no directly so we take 0.5 (BUT NOT 0)
      const target = statCharaOf[idcharacter].quest[qid] || 0.5;
      const dist = Math.abs(ans - target);

      // illustrates the fact that if target == ans, diff should be 1
      prod_pEk_given_H *= 1 - dist;
      // proba of the current evidence given it is not the character the user thinks of
      // same as above but we do it for all proba that isnt 'target'
      let ds = 0;
      for (let id in statCharaOf) {
        if (id != idcharacter) {
          // if the question's answer is not properly defined
          // we cannot answer yes or no directly so we take 0.5
          const other_target = statCharaOf[id].quest[qid] || 0.5;
          const other_dist = Math.abs(ans - other_target);
          ds += other_dist;
        }
      }
      prod_pEk_given_notH *= 1 - (ds / (total_charas - 1));
    }

    // console.log('Got ', idcharacter, prod_pEk_given_notH, 'and', prod_pEk_given_H);

    const makeZeroSafe = (x) => Math.max(x, 0.000001);
    return (P_H * prod_pEk_given_H) /
      makeZeroSafe(P_H * prod_pEk_given_H + P_notH * prod_pEk_given_notH);
  }

  /**
   * @param {*} connexion
   * @param {JSON} answers_so_far {q1 : p1, q2 : p2, ...}
   * @param {boolean} sort sort by probability desc
   * @param {number} top how many should we retrieve
   */
  static async computeProbForAllCharacters(
    connexion,
    answers_so_far,
    sort = true,
    top = 3,
  ) {
    const statCharaOf = await CoreServices.getCharacterSetAsMap(connexion);
    let result = [];
    for (let id in statCharaOf) {
      const probability = await CoreServices.computeProbabilities(
        connexion,
        id,
        answers_so_far,
        statCharaOf,
      );
      result.push({
        id: id,
        name: statCharaOf[id].infos.name,
        probability: probability,
        play_count: statCharaOf[id].infos.play_count,
        submitted_by: statCharaOf[id].infos.submitted_by,
      });
    }
    if (sort) {
      result = result.sort((x, y) => y.probability - x.probability);
    }
    if (!isNaN(parseInt(top)) && top > 0) {
      result = result.filter((_, i) => i < top);
    }
    return result;
  }

  /**
   * @param {*} connexion
   * @returns {JSON} {idchara : {q1 : , q2 : ...., ...}}
   */
  static async getCharacterSetAsMap(connexion) {
    const sql = `SELECT 
                        "idcharacter", "name", "idquestion", 
                        "probability", "submitted_by", "play_count"
                    FROM "v_CharaAnswer"`;
    const result = await connexion.query(sql);
    let map = {};
    for (let item of result.rows) {
      if (map[item.idcharacter] == undefined) {
        map[item.idcharacter] = {
          infos: {
            name: item.name,
            submitted_by: item.submitted_by,
            play_count: item.play_count,
          },
          quest: {},
        };
      }
      map[item.idcharacter].quest[item.idquestion] = parseFloat(
        item.probability,
      );
    }
    return map;
  }

  /**
   * @param {*} connexion
   * @returns {number} total entry in the database
   */
  static async countCharacters(connexion) {
    const sql = 'SELECT COUNT(*) as "nb" FROM "Character"';
    const result = await connexion.query(sql);
    return result.rows[0]["nb"];
  }

  /**
   * @param {*} connexion
   * @param {string} name
   */
  static async getBestMatchCharacterByName(connexion, name) {
    const sql = {
      text: `SELECT * FROM "Character" WHERE LOWER("name") LIKE LOWER($1)`,
      values: ["%" + name + "%"],
    };
    const result = await connexion.query(sql);
    return result.rows[0] || null;
  }

  static async incrementPlayCount(connexion, idcharacter) {
    const db = DBModel.use(connexion);
    const curr = await db.getById('"Character"', idcharacter);
    logger.info("increment play_count" + idcharacter);
    if (curr) {
      await db.updateById('"Character"', {
        play_count: parseInt(curr.play_count) + 1,
      }, idcharacter);
    }
  }
};
