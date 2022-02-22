const config = require("../tools/project.config.json");
const DBModel = require("../model/DBModel");
const Tools = require("../tools/Tools");
const logger = require('../tools/logger').Create(__filename);


module.exports = class QuestServices {
    /**
     * @param {*} connexion 
     * @param {string[]} exclude_question_list 
     * @param {JSON} chara_in_mind 
     */
    static async getSingleQuestion (connexion, exclude_question_list, chara_in_mind) {
        const {most_probable_barrier, random_window_max_asking_question} = config.constant;

        // we must extract the maximum bits of information from the user
        // we pick randomly a question from the top maximisers
        if (exclude_question_list.length < random_window_max_asking_question) {
            const res = await QuestServices.getMaxInfosQuestionAccordingToModel (connexion, exclude_question_list);
            if (res != null) {
                // console.log ('+ Potential infos gain %d bits', res.infos);
                return res;
            }
        }

        // when we got a high probability, let's ask the user on questions
        // that relates more to that specific character we are 'strongly' sure of
        if (chara_in_mind != null && chara_in_mind.probability > most_probable_barrier) {
            const res = await QuestServices.getNextMostProbableQuestion (connexion, exclude_question_list, chara_in_mind);
            if (res != null)
                return res;
        }

        // we got a low/average match
        // we let the user answer a bunch of 'common' questions
        // if Shitsu-chan doesn't get it, it will be useful on the next session
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
        return result_sorted_desc[0].probability > high_match_min;
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


    /**
     * Returns a single question that will extract the maximum number
     * of information
     * @param {*} connexion 
     * @param {string[]} exclude_question_list 
     */
    static async getMaxInfosQuestionAccordingToModel (connexion, exclude_question_list) {
        let where = '';
        if (exclude_question_list.length > 0)
            where = 'WHERE "idquestion" NOT IN (' + exclude_question_list.map((_, i) => '$' + (i + 1)).join(',')  +')';
        const db = DBModel.use (connexion);

        // we compute the information quantity for this subset
        const p_each_quest = (await db.query ({
            text : `SELECT * FROM "v_CountPossibilityNoZero" ${where}`,
            values : exclude_question_list
        })).rows;

        let questions = {};
        let total_possibilities = 0;
        for (let quest of p_each_quest) {
            if (questions[quest.idquestion] == undefined)
                questions[quest.idquestion] = {proba : 0, infos : 0, content : '', sharedWith : 0};
            const possibility = parseFloat(quest.possibility);
            questions[quest.idquestion].proba = possibility; // will be rescaled later
            questions[quest.idquestion].sharedWith = possibility;
            questions[quest.idquestion].content = quest.content;
            total_possibilities += possibility;
        }
        let list = [];
        for (let id in questions) {
            questions[id].proba /= total_possibilities;
            let p = questions[id].proba;
            questions[id].infos = -Math.log2(p);
            list.push ({ idquestion : id, ... questions[id]});
        }
        list = list.sort ((a, b) => b.infos - a.infos);
        let top = Math.max(1, Math.floor(list.length / config.constant.top_question_split));
        return Tools.pickTopRandomly (list, top) || null;
    }
};