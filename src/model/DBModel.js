const logger = require("../tools/logger").Create(__filename);
/**
 * @author afmika
 */
module.exports = class DBModel {
  /**
   * @param {object} connexion
   */
  constructor(connexion) {
    this.PGDefault = "__DEFAULT_VAL__";
    this.connexion = connexion;
  }

  /**
   * @param {object} connexion
   */
  static use(connexion) {
    if (connexion == null || connexion == undefined) {
      throw "YOU FORGOT TO OPEN A CONNECTION, got " + connexion;
    }
    this.connexion = connexion;
    return new DBModel(this.connexion);
  }

  /**
   * Ex: SomeTable => idsometable
   * @param {string} table
   */
  static makeIdAttribute(table) {
    return "id" + table.toLowerCase();
  }

  /**
   * Closes the current connexion
   */
  close() {
    if (this.connexion) {
      this.connexion.end();
    }
  }

  /**
   * Same as connexion.query
   * @param {string|JSON} sql_or_values
   */
  async query(sql_or_values) {
    // logger.info(sql_or_values);
    return await this.connexion.query(sql_or_values);
  }

  async nextval(seq_name) {
    const res = await this.query(`SELECT NEXTVAL('${seq_name}') as next`);
    return res.rows[0]["next"];
  }

  /**
   * Query all values
   * @param {string} table
   */
  async get(table) {
    let sql = `SELECT * FROM ${table}`;
    return await this.query(sql);
  }

  /**
   * Query with where
   * @param {*} table
   * @param {JSON} where_map {key1 : value, key2 : value}
   * @param {string?} cond 'AND' or 'OR'
   */
  async get_where(table, where_map, cond = "AND") {
    let where_list = [], value_list = [], i = 1;
    for (let key in where_map) {
      where_list.push(`${key} = $${i++}`); // ex : key = $3
      value_list.push(where_map[key]);
    }

    const where = where_list.join(" " + cond + " ");
    const values = {
      text: `SELECT * FROM ${table} WHERE ${where}`,
      values: value_list,
    };

    return await this.query(values);
  }

  /**
   * Query with where like (useful for multicriteria search)
   * Works only on string fields !
   * @param {*} table
   * @param {JSON} where_map {key1 : value, key2 : value}
   * @param {string?} cond 'AND' or 'OR'
   */
  async get_like(table, where_map, cond = "AND") {
    let where_list = [], value_list = [], i = 1;
    for (let key in where_map) {
      where_list.push(`CAST(${key} AS TEXT) LIKE $${i++}`); // ex : key = $3
      value_list.push("%" + where_map[key] + "%");
    }

    const where = where_list.join(" " + cond + " ");
    const values = {
      text: `SELECT * FROM ${table} WHERE ${where}`,
      values: value_list,
    };

    return await this.query(values);
  }

  /**
   * @param {string} table
   * @param {JSON} update_map
   * @param {JSON} where_map
   * @param {string?} cond 'AND' or 'OR'
   */
  async update(table, update_map, where_map = undefined, cond = undefined) {
    let where_str = "";
    let update_str = "";
    let update_list = [], where_list = [], value_list = [];
    let i = 1;

    // update
    for (let key in update_map) {
      update_list.push(`${key} = $${i++}`);
      value_list.push(update_map[key]);
    }
    update_str = " SET " + update_list.join(", ");

    // where
    if (where_map) {
      for (let key in where_map) {
        where_list.push(`${key} = $${i++}`);
        value_list.push(where_map[key]);
      }
      cond = "AND" || cond;
      where_str = " WHERE " + where_list.join(" " + cond + " ");
    }

    const values = {
      text: `UPDATE ${table}${update_str}${where_str}`,
      values: value_list,
    };

    // logger.info(values);

    return await this.query(values);
  }

  /**
   * @param {string} table
   * @param {JSON} where_map
   * @param {string} cond 'AND' or 'OR'
   */
  async delete(table, where_map = undefined, cond = "AND") {
    if (where_map == undefined) {
      return await this.query(`DELETE FROM ${table}`);
    }

    let where_list = [], value_list = [], i = 1;
    for (let key in where_map) {
      where_list.push(`${key} = $${i++}`); // ex : key = $3
      value_list.push(where_map[key]);
    }

    const where = where_list.join(" " + cond + " ");
    const values = {
      text: `DELETE FROM ${table} WHERE ${where}`,
      values: value_list,
    };

    return await this.query(values);
  }

  /**
   * @param {string} table
   * @param {string} id
   */
  async deleteById(table, id) {
    const id_key = "id" + DBModel.cleanTab(table.toLowerCase());
    const where = {};
    where[id_key] = id;
    return await this.delete(table, where);
  }

  /**
   * @param {string} table a table or a view
   * @param {string} id the input id
   * @param {string?} real_name if we target a view, we must define this value
   * @returns {JSON|null}
   */
  async getById(table, id, real_name = null) {
    const id_key = "id" +
      DBModel.cleanTab(
        real_name == null ? table.toLowerCase() : real_name.toLowerCase(),
      );
    const where = {};
    where[id_key] = id;
    const result = await this.get_where(table, where);
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  }

  /**
   * @param {string} table
   * @param {JSON} new_values
   * @param {string} id
   * @returns {JSON|null}
   */
  async updateById(table, new_values, id) {
    const id_key = "id" + DBModel.cleanTab(table.toLowerCase());
    const where = {};
    where[id_key] = id;
    return await this.update(table, new_values, where);
  }

  static cleanTab(str) {
    return str.replace(/"/g, "");
  }

  /**
   * @param {string} table
   * @param {JSON} insert_map
   */
  async insert(table, insert_map) {
    let value_list = [], columns = [], str_list = [], i = 1;
    for (let key in insert_map) {
      if (insert_map[key] == this.PGDefault) {
        str_list.push("DEFAULT");
        continue;
      }

      str_list.push("$" + (i++));
      value_list.push(insert_map[key]);
    }

    // this will make our program to support unordered columns
    columns = Object.keys(insert_map);

    const values = {
      text: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${
        str_list.join(", ")
      })`,
      values: value_list,
    };

    return (await this.query(values)).rowCount;
  }

  /**
   * Rollback a transactional operation
   */
  async rollback() {
    await this.query("ROLLBACK");
  }
};
