'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class TaskSchema extends Schema {
  up() {
    this.create('tasks', (table) => {
      table.bigIncrements()
      table.bigInteger('user_id').unsigned().notNullable()
      table.string('name', 255).notNullable()
      table.text('description', 'longtext').notNullable().defaultTo('')
      table.timestamp('deleted_at').nullable()
      table.timestamps()

      table.foreign('user_id').references('id').inTable('users').onDelete('cascade').onUpdate('cascade')
    })
  }

  down() {
    this.drop('tasks')
  }
}

module.exports = TaskSchema
