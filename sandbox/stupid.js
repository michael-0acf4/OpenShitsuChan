const ArticleServices = require ('../services/CoreServices');
const Connection = require ('../services/Connection');
const CoreServices = require('../services/CoreServices');
const QuestServices = require('../services/QuestServices');

( async () => {


	const con = Connection ();
	// await CoreServices.incrementPlayCount (con, 'CHR_3');
	// await CoreServices.incrementPlayCount (con, 'CHR_4');
	// await CoreServices.incrementPlayCount (con, 'CHR_5');
	// await CoreServices.incrementPlayCount (con, 'CHR_5');
	// const exclude_all = [1, 2, 3, 4, 5, 6, 7, 8].map(x => 'QST_' + x);
	// const qst = await QuestServices.getSingleQuestion (con, ['QST_8', 'QST_1']);
	// console.log(qst);

	// const res = await CoreServices.getCharacterSetAsMap (con);
	// const pmap = [1, 0.7, 0.5, 0.3, 0];
	// const choose = x => pmap[x - 1];
	// const res = await CoreServices.computeProbForAllCharacters (con, {
	// 	'QST_1' : choose (1), 
	// 	'QST_2' : choose (2), 
	// 	'QST_3' : choose (3), 
	// 	'QST_4' : choose (4), 
	// 	'QST_5' : choose (5), 
	// 	'QST_6' : choose (1), 
	// 	'QST_7' : choose (2)
	// });

	// console.log(res);

	con.end ();
}) ();

