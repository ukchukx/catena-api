'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddScheduleTimesSchema extends Schema {
  up () {
    this.table('task_schedules', (table) => {
      table.time('from').notNullable().defaultTo('00:00:00')
      table.time('to').notNullable().defaultTo('23:59:59')
    })
  }

  down () {
    this.table('task_schedules', (table) => {
      table.dropColumn('from')
      table.dropColumn('to')
    })
  }
}

module.exports = AddScheduleTimesSchema
