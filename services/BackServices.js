const config = require("../tools/project.config.json");
const CoreServices = require("./CoreServices");
const DBModel = require("../model/DBModel");
const logger = require('../tools/logger').Create(__filename);
const crypto = require ('crypto');
const Tools = require("../tools/Tools");
const AnsServices = require("./AnsServices");


module.exports = class BackServices {
    /**
     * @param {string} password 
     */
    static validPassword (password) {
        const hash = crypto
                        .createHash('sha256')
                        .update(password)
                        .digest('hex');
        logger.warn ('Backoffice login by a user');
        for (let pass of config.backoffice.passwords)
            if (hash == pass)
                return true;
        logger.warn ('Backoffice login failed :)');
        return false;
    }

    /**
     * @param {*} con 
     * @param {string} name 
     */
    static async getCharacterByName (con, name) {
        const sql = {
            text : `SELECT * FROM "Character" WHERE LOWER(name) LIKE LOWER($1) LIMIT 10`,
            values : ['%' + name + '%']
        };
        const res = await con.query (sql);
        return res.rows || [];
    }

    /**
     * @param {*} con 
     * @param {string} content 
     */
    static async getQuestionByContent (con, content) {
        const sql = {
            text : `SELECT * FROM "Question" WHERE LOWER(content) LIKE LOWER($1) LIMIT 10`,
            values : ['%' + content + '%']
        };
        const res = await con.query (sql);
        return res.rows || [];
    }


    /**
     * @param {*} con 
     * @param {JSON} character {id, value}
     * @param {JSON[]} questions [{id, value, probability}, ...]
     */
    static async insertOrUpdateCharaFromPost (connexion, character, questions) {
        if (!questions || questions.length == 0)
            throw Error ('questions field is not defined or is an empty array');
        let cid = Tools.perfectTrimAndClean (character.id);
        cid = (cid == 'null' || Tools.isEmpty(cid)) ? null : cid;
        let cname = Tools.perfectTrimAndClean (character.value);
        const db = DBModel.use (connexion);

        // check chara
        if (Tools.isEmpty(cname))
            throw Error ('Character name is empty');
        
        // check questions
        for (let question of questions) {
            if (question.id == 'null')
                question.id = null;
            if (Tools.isEmpty(question.value))
                throw Error ('Character name is empty');
            question.probability = parseFloat (question.probability);
            if (isNaN(question.probability))
                throw Error ('Question "' + question.value + '" probability is not a number');
        }

        if (!cid) {
            const seq = await db.nextval ('"characterSeq"');
            cid = 'CHR_' + seq;
            // it exist
            await db.insert('"Character"', {
                idcharacter : cid,
                name : cname,
                play_count : 1,
                submitted_by : '@me',
                submit_time : db.PGDefault
            });
            character.id = cid;
            logger.warn ('Insert character ' + cid);
        }
        // use id question if null insert question, get then get the id

        for (let question of questions) {
            // == 'null' : just in case
            if (Tools.isEmpty(question.id) || question.id == 'null') {
                const seq = await db.nextval ('"questionSeq"');
                question.id = 'QST_' + seq;
                await db.insert ('"Question"', {
                    idquestion : question.id,
                    content : question.value,
                    weight : 5
                });
                logger.warn ('Insert question ' + question.id);
            }

            await BackServices.insertOrUpdateAnswerFor (connexion, question.id, character.id, question.probability);
        }
    }

    /**
     * @param {*} connexion 
     * @param {string} idquestion 
     * @param {string} idcharacter 
     * @param {number} probability 
     */
    static async insertOrUpdateAnswerFor (connexion, idquestion, idcharacter, probability) {
        const db = DBModel.use (connexion);
        // chara exists already
        const answer = await AnsServices.getAnswerByIdQuestionAndChara (connexion, idquestion, idcharacter);
        if (answer == null) {
            // must insert an answer for that question
            // now insert the corresponding answer for that question
            await db.insert('"Answer"', {
                idanswer : db.PGDefault,
                probability : probability,
                idquestion : idquestion,
                idcharacter : idcharacter
            });
            logger.warn ('Inserting answer for ' + idquestion);
        } else {
            // just update it !
            await db.updateById ('"Answer"', {probability : probability}, answer.idanswer);
            logger.warn ('Updating answer ' + answer.idanswer + ' new proba => ' + probability);
        }
    }

    /**
     * @param {*} connexion 
     */
    static async performEntropyStatistics (connexion) {
        const db = DBModel.use (connexion);
        const characters = (await db.get ('"Character"')).rows;

        let questions = {};
        for (let character of characters) {
            const p_each_quest = (await db.query ({
                text : 'SELECT * FROM "getAllProbaByIdChara" ($1)',
                values : [character.idcharacter]
            })).rows;
            for (let quest of p_each_quest) {
                if (questions[quest.idquestion] == undefined)
                    questions[quest.idquestion] = {proba : 0, count : 0, infos : 0, content : '', sharedWith : 0};
                questions[quest.idquestion].proba += parseFloat(quest.probability);
                questions[quest.idquestion].count++; // should be equal to the size of all characters
                questions[quest.idquestion].sharedWith += quest.idanswer ? 1 : 0;
                questions[quest.idquestion].content = quest.content; // should be equal to the size of all characters
            }
        }
    
        let list = [];
        let total_entropy = 0;
        for (let id in questions) {
            questions[id].proba /= questions[id].count; // average proba
            let p = questions[id].proba;
            questions[id].infos = -Math.log2(p);
            total_entropy += p * questions[id].infos;
            list.push ({ id : id,... questions[id]});
        }
    
        list = list.sort ((a, b) => b.infos - a.infos);

        return {
            list : list,
            total_entropy : total_entropy,
            total_charas : characters.length
        };
    }

    /**
     * @param {JSON[]} list_q 
     * @param {number} total_entropy 
     * @param {number} total_charas 
     */
    static formatStatString (list_q, total_entropy, total_charas) {
        let str = '';
        const date = new Date().toLocaleDateString () + ' ' + new Date().toLocaleTimeString ();
        str += 'Statistics generated --- ' + date + '\n';
        str += 'Total entropy (uncertainity) : ' + total_entropy + '\n';
        str += 'Total characters so far : ' + total_charas + '\n';
        str += 'Total questions so far : ' + list_q.length + '\n';
        str += 'Copyright afmika ' + new Date().getFullYear () + '\n';
        str += '-----' + '\n';
        str += '\n';
    
        for (let q of list_q) {
            str += 'Q : ' +  q.content + '\n';
            str += '> Info ' + q.infos + ', p(Q) ~ avg(pi) = ' + q.proba + '\n';
            str += '> ' + q.sharedWith + ' chr(s) is/are strongly related to this question\n';
            str += '\n';
        }
        return str;
    }
};