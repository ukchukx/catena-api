'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class TaskScheduleSchema extends Schema {
  up() {
    this.create('task_schedules', (table) => {
      table.bigIncrements()
      table.bigInteger('user_id').unsigned().notNullable()
      table.bigInteger('task_id').unsigned().notNullable()
      table.boolean('done').defaultTo(false)
      table.datetime('due_date').notNullable()
      table.text('remarks', 'longtext').notNullable().defaultTo('')
      table.timestamp('deleted_at').nullable()
      table.timestamps()

      table.foreign('user_id').references('id').inTable('users').onDelete('cascade').onUpdate('cascade')
      table.foreign('task_id').references('id').inTable('tasks').onDelete('cascade').onUpdate('cascade')
    })
  }

  down() {
    this.drop('task_schedules')
  }
}

module.exports = TaskScheduleSchema
