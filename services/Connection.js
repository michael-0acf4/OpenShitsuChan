const config = require("../tools/project.config.json");
const database = require('pg');
const configuration = config.DATABASE_CONF;

module.exports = () => {
	const connection = new database.Client(configuration);
    connection.connect(function(err){
		  if (err) console.log(err);
    });
    return connection;
};