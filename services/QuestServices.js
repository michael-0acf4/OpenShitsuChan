const config = require("../tools/project.config.json");
const DBModel = require("../model/DBModel");
const logger = require('../tools/logger').Create(__filename);


module.exports = class QuestServices {
    /**
     * @param {*} connexion 
     * @param {string[]} exclude_question_list 
     * @param {JSON} chara_in_mind 
     */
    static async getSingleQuestion (connexion, exclude_question_list, chara_in_mind) {
        const {most_probable_barrier} = config.constant;
        if (chara_in_mind != null && chara_in_mind.probability > most_probable_barrier) {
            const res = await QuestServices.getNextMostProbableQuestion (connexion, exclude_question_list, chara_in_mind);
            if (res != null)
                return res;
        }

        let where = '';
        if (exclude_question_list.length > 0)
            where = 'WHERE "idquestion" NOT IN (' + exclude_question_list.map((_, i) => '$' + (i + 1)).join(',')  +')';
        // fetch top 3 questions
        // pick a single one randomly
        const sql = {
            text : `SELECT * FROM 
                        (SELECT * FROM "v_QSTCountCHR" ${where} LIMIT 3) AS TEMP
                    ORDER BY RANDOM ()`,
            values : exclude_question_list
        };

        const res = await connexion.query (sql);
        return res.rows[0] || null;
    }

    /**
     * @param {*} connexion 
     * @param {string[]} exclude_question_list 
     * @param {JSON} chara
     */
    static async getNextMostProbableQuestion (connexion, exclude_question_list, chara) {
        if (!chara) return null;
        let where = 'WHERE "idcharacter" = $1';
        let offset = 2;
        if (exclude_question_list.length > 0)
            where += ' AND "idquestion" NOT IN (' + exclude_question_list.map((_, i) => '$' + (i + offset)).join(',')  +')';
        // fetch 5 most probable questions
        const sql = {
            text : `SELECT * FROM 
                        (
                            SELECT "idquestion", "idcharacter", "probability" 
                            FROM "v_CharaQuestionAnswer" ${where} LIMIT 5
                        ) AS TEMP
                    ORDER BY RANDOM ()`,
            values : [chara.id, ...exclude_question_list]
        };
        const res = await connexion.query (sql);
        const picked = res.rows[0] || null;

        if (!picked) return null; // only happens if there is no question for this character
        const db = DBModel.use (connexion);
        return await db.getById ('"v_QSTCountCHR"', picked.idquestion, 'Question');
    }

    /**
     * nothing special
     */
    static getChoicesMap () {
    	return config.choices;
    }

    /**
     * @param {number} choice_index 
     */
    static pickProbability (choice_index) {
        const map =  QuestServices.getChoicesMap ();
        const keys = Object.keys(map);
        let index = parseInt (choice_index);
        if (isNaN (index))
            throw Error ('Invalid choice index, not a number');
        if (index < 1 || index > keys.length)
            throw Error ('Invalid choice index, should get between ' + [1, keys.length].join('-'));
        return map [keys[index - 1]];
    }

    /**
     * @param {JSON} result_sorted_desc [{id, name, probability}, {}, ...] 
     */
    static shouldProbablyStopGiven (result_sorted_desc) {
        // first result is a high match
        const {high_match_min} = config.listing;
        if (result_sorted_desc[0].probability > high_match_min) {
            return true;
        }
        return false;
    }

    /**
     * @param {JSON} result_sorted_desc [{id, name, probability}, {}, ...] 
     * @returns {number} a number from 1 to 5
     */
    static getAIReactionIndex (result_sorted_desc) {
        // first result is a high match
        const fitest_prob = result_sorted_desc[0].probability;
        const total_faces = 8;
        // 1  --> total_faces
        // 0. --> ?
        return 1 + Math.floor(total_faces * fitest_prob);
    }
};