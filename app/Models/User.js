/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

/** @type {import('@adonisjs/framework/src/Hash')} */
const Hash = use('Hash');

const Database = use('Database');

/* eslint-disable class-methods-use-this */
class User extends Model {
  static boot() {
    super.boot();
    this.addTrait('SoftDeletes');

    /**
     * A hook to hash the user password before saving
     * it to the database.
     */
    this.addHook('beforeSave', async (userInstance) => {
      if (userInstance.dirty.password) {
        userInstance.password = await Hash.make(userInstance.dirty.password);
      }
    });
  }

  static castDates(field, value) {
    return value.toISOString();
  }

  tasks() {
    return this.hasMany('App/Models/Task');
  }

  taskSchedules() {
    return this.hasMany('App/Models/TaskSchedule');
  }

  async verifyPassword(password) {
    return Hash.verify(password, this.password);
  }

  static baseQuery() {
    return Database.from('users');
  }
}

module.exports = User;
