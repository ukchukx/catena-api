/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class TaskSchedule extends Model {
  static boot() {
    super.boot();
    this.addTrait('SoftDeletes');
  }

  static get dates() {
    return super.dates.concat(['due_date']);
  }

  static castDates(field, value) {
    return value.toISOString();
  }

  user() {
    return this.belongsTo('App/Models/User');
  }

  task() {
    return this.belongsTo('App/Models/Task');
  }
}

module.exports = TaskSchedule;
