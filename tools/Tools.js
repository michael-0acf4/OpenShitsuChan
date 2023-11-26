module.exports = class Tools {
  /**
   * @params {number} n
   * @returns {string}
   */
  static addZero(n) {
    return n < 10 ? `0${n}` : n;
  }

  /**
   * @params {Date} date
   * @params {number} days
   * @returns {Date}
   */
  static addDays(date, days) {
    const result = new Date();
    result.setDate(date.getDate() + days);
    return result;
  }

  /**
   * @returns {boolean} true if the given input is an empty quote, null or undefined
   */
  static isEmpty(input) {
    return input == undefined || input == null || input == "";
  }

  static randomSeed () {
		let a = Math.random (), b = Math.random ();
		return (a + '' + b).replace (/\./g, '');
	}

  static pickTopRandomly(sorted_arr, top) {
    if (top < 0) {
      throw Error("<top> is negative");
    }
    let n = Math.min(top, sorted_arr.length);
    let idx = Math.floor(Math.random() * n);
    return sorted_arr[idx];
  }
};
