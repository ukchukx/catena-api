'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddVisibilityToTasksSchema extends Schema {
  up () {
    this.table('tasks', (table) => {
      table.string('visibility').notNullable().defaultTo('private')
    })
  }

  down () {
    this.table('tasks', (table) => {
      table.dropColumn('visibility')
    })
  }
}

module.exports = AddVisibilityToTasksSchema
