/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Database = use('Database');
const Model = use('Model');

class PasswordReset extends Model {
  static get updatedAtColumn() {
    return null;
  }

  static baseQuery() {
    return Database.from('password_resets');
  }
}

module.exports = PasswordReset;
