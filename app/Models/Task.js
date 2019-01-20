/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

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
}

module.exports = Task;
