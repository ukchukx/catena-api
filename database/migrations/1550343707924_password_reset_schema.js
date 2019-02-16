/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PasswordResetSchema extends Schema {
  up () {
    this.create('password_resets', (table) => {
      table.bigIncrements('id')
      table.string('email')
      table.string('token')
      table.timestamp('created_at')
    })
  }

  down () {
    this.drop('password_resets')
  }
}

module.exports = PasswordResetSchema
