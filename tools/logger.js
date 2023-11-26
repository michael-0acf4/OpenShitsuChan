const config = require('./project.config.json')
const winston = require('winston');
const error_log_path = config.ERROR_LOG || 'error.log';
const all_log_path = config.LOG || 'all.log';


function CustomLogger(logger) {
	this.path = '';
	this.logger = logger;

	this.initCallerSource = (source) => {
		let path = require('path');
		if ( source ) {
			this.path = path.basename(source);
		} else {
			this.path = path.basename(process.mainModule.filename);
		}
	}

	this.withCallerName = function(msg) {
		let label = `${process.pid}|${new Date().toLocaleTimeString()}`;
		if ( this.path != '') {
			if ( typeof msg != 'string' && typeof msg != 'number') {
				try {					
					return `[${label}] [${this.path}] ${ JSON.stringify(msg) }`;
				} catch(e) {
					return `[${label}] [${this.path}] ${ msg }`;
				}
			}
			return `[${label}] [${this.path}] ${msg}`;
		}
		return `[${label}] ${msg}`;
	}
	
	this.info = function(msg) {
		this.logger.info(this.withCallerName(msg));
	}
	
	/**
	 * Affiche un warning
	 * @param {string|number} msg 
	 */
	this.warn = function(msg) {
		this.logger.warn(this.withCallerName(msg));
	}

	this.error = function(msg) {
		this.logger.error(this.withCallerName(msg));
	}
	
	this.log = function(msg) {
		this.info(msg);
	}

	this.Create = function(filename) {
		let mylog = new CustomLogger(this.logger);
		try {
			mylog.initCallerSource(filename);
			return mylog;			
		} catch(e) {
			console.log(e);
		}
	}

	this.core = function() {
		return this.logger;
	}
}

module.exports = (() => {
	let logger = winston.createLogger({
		transports: [
			new winston.transports.Console({
				format : winston.format.combine(
					winston.format.colorize(),
					winston.format.simple()
				)
			}),
		],
		format : winston.format.combine(
			winston.format.colorize(),
			winston.format.prettyPrint()
		)
	});
	
	let custom = new CustomLogger(logger);
	return custom;
})();