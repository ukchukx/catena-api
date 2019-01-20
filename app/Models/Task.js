/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

const Database = use('Database');

class Task extends Model {
  static boot() {
    super.boot();
    this.addTrait('SoftDeletes');
  }

  static castDates(field, value) {
    return value.toISOString();
  }

  user() {
    return this.belongsTo('App/Models/User');
  }

  schedules() {
    return this.hasMany('App/Models/TaskSchedule');
  }

  static baseQuery() {
    return Database.from('tasks');
  }

  static async isDuplicate({ name, user_id, id = 0 }) {
    const tasks = await Task
      .baseQuery()
      .where({ name, user_id });

    if (!tasks || !tasks.length) return false;
    if (tasks.length > 1) return true;
    return id !== tasks[0].id;
  }
}

module.exports = Task;
