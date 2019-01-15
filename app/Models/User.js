/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

/** @type {import('@adonisjs/framework/src/Hash')} */
const Hash = use('Hash');
const Database = use('Database');

/* eslint-disable class-methods-use-this */
class User extends Model {
  static boot() {
    super.boot();

    /**
     * A hook to hash the user password before saving
     * it to the database.
     */
    this.addHook('beforeSave', async (userInstance) => {
      if (userInstance.dirty.password) {
        userInstance.password = await Hash.make(userInstance.password);
      }
    });
  }

  async verifyPassword(password) {
    return Hash.verify(password, this.password);
  }

  static baseQuery() {
    return Database.from('users');
  }
}

module.exports = User;
