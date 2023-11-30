module.exports = class Tools {
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

  static randomSeed() {
    const a = Math.random(), b = Math.random();
    return (a + "" + b).replace(/\./g, "");
  }

  static pickTopRandomly(sorted_arr, top) {
    if (top < 0) {
      throw Error("<top> is negative");
    }
    const n = Math.min(top, sorted_arr.length);
    const idx = Math.floor(Math.random() * n);
    return sorted_arr[idx];
  }

  /**
   * @param {string} str 
   */
  static uppFirst(str) {
    return str.charAt(0).toLocaleUpperCase() + str.slice(1);
  }

  /**
   * @param {string} str 
   */
  static perfectTrimAndClean(str) {
		if (!str) return str;
		return str
      .replace (/\s+/g, ' ')
			.trim();
  }
};
