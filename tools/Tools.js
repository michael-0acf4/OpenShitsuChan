module.exports = class Tools {
	/**
	* @params {number} n
	* @returns {string}
	*/
	static addZero( n ) {
		return n < 10 ? `0${n}` : n;
	}

	/**
	* @params {Date} date
	* @params {number} days
	* @returns {Date}
	*/
	static addDays( date, days ) {
		const result = new Date();
		result.setDate(date.getDate() + days);
		return result;
	}
	
	/**
	* @params {Date} date
	* @returns {string} Timestamp format
	*/
	static toTimestamp( date ) {
		let [year, month, days, hour, min, sec] = [
			date.getFullYear(), date.getMonth() + 1, date.getDate(),
			date.getHours(), date.getMinutes(), date.getSeconds()
		].map( Tools.addZero );
		
		return `${year}-${month}-${days} ${hour}:${min}:${sec}`;
	}

	/**
	 * @returns {boolean} true if the given input is an empty quote, null or undefined
	 */
	static isEmpty ( input ) {
		return input == undefined || input == null || input == '';
	}

	/**
	 * Check if each key inside 'required_field' has non empty value, it will be pushed inside the result if not
	 * @param {JSON} input_object 
	 * @param {string[]} required_fields 
	 */
	static scanNonValidFields (input_object, required_fields) {
		let nonvalid = [];
		required_fields.forEach (key => {
			if (Tools.isEmpty(input_object[key]))
				nonvalid.push (key);
		});
		return nonvalid; 
	}

	/**
	 * Truncate a string to a maximum of 100 characters
	 * @param {JSON} input_object 
	 * @param {string[]} required_fields 
	 */
	static truncate (str, maxlength = 100) {
		const truncated = str.substring (0, Math.max(1, maxlength));
		if (truncated.length != str.length)
			return truncated + ' ...';
		return truncated;
	}

	/**
	 * Ex : text = 'Hello World', importants = ['Hello'] => output : '<strong>Hello</strong> World'
	 * @param {string} text input text to process
	 * @param {string[]} importants a list of words
	 * @param {string[]} custom_ignored_list articles and likes (du, les, ... ) if not given the default one will be used
	 */
	static makeStrong (text, importants, custom_ignored_list = null) {
		const ignored_tokens = custom_ignored_list || [
			'les', 'le', 'des', 'du', 'de', 'la', 'l'
		];

		const shouldIgnore = {}; 
		ignored_tokens.forEach (token => {
			shouldIgnore[token] = true;
		});

		const expressions = importants.map(item => new RegExp(item, 'gi'));
		
		// token-length * (log n) ~ O (tk_length * (log N))
		// will handle anything under 0.5s if its less than 100 000 words
		// [Note] the average article/blog/text message word doesnt exceed 300 words

		expressions.forEach ((expr, pos) => {
			let curr = importants [pos];

			// constant time check
			if (shouldIgnore [curr] || curr == '') return;

			// replacing the current expression properly
			// for example Dupont should be replaced with <strong>Dupont</strong> but not with <strong>dupont</strong>
			// [Note] callback executed if 'token' matches 'expr'

			text = text.replace(expr, token => {
				const isUpperCase = token[0].toLowerCase () != token[0];
				if (isUpperCase)
					curr = curr.substring(0, 1).toUpperCase() + curr.substr(1); 
				return `<strong>${curr}</strong>`;
			});
		
		});

		return text;
	}

	/**
	 * Tokenizes a string (by ignoring all punctuations)
	 * @param {string} str the text to process
	 */
	static tokenize (str) {
		let res = str.match(/[\w]+/ig);
		if (res != null)
			res = res.map(s => s.toLowerCase());
		return res;
	}

	static uppFirst (str) {
		if (str == '')
			return '';
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	static makePercent (number) {
		if (number < 0 || number > 100)
			throw Error ('value must be between 0 and 1');
		return Math.min(100, Math.round(number * 100));
	}

	static randomSeed () {
		let a = Math.random (), b = Math.random ();
		return (a + '' + b).replace (/\./g, '');
	}

	static perfectTrimAndClean (str) {
		if (!str) return str;
		return str.replace (/\s\s+|[\n\t\r]/g, ' ')
				.trim();
	}

	static pickTopRandomly (sorted_arr, top) {
		if (top < 0)
			throw Error ('<top> is negative');
		let n = Math.min (top, sorted_arr.length);
		let idx = Math.floor (Math.random () * n);
		return sorted_arr [ idx ];
	}
}