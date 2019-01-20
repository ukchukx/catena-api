/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URLs and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.0/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route')

Route.group(() => {
  Route.post('signup', 'AuthController.signup').as('auth.signup')
  Route.post('authenticate', 'AuthController.authenticate').as('auth.authenticate')
}).prefix('api/v1').formats(['json'])

Route.group(() => {
  Route.route('me', 'UserController.me', ['GET', 'POST']).as('user.me')
  Route.post('update_profile', 'UserController.updateProfile').as('user.update_profile')
  Route.post('change_password', 'UserController.changePassword').as('user.change_password')
}).prefix('api/v1').formats(['json']).middleware(['auth:jwt'])

Route.group(() => {
  Route.post('tasks', 'TaskController.create').as('task.create')
  Route.get('tasks/:id', 'TaskController.get').as('task.get')
  Route.get('tasks', 'TaskController.list').as('task.list')
  Route.put('tasks/:id', 'TaskController.update').as('task.update')
  Route.delete('tasks/:id', 'TaskController.delete').as('task.delete')
  Route.post('tasks/:id/done', 'TaskController.doneToday').as('task.done_today')
  Route.put('tasks/update_schedule/:id', 'TaskController.updateSchedule').as('task.update_schedule')
}).prefix('api/v1').formats(['json']).middleware(['auth:jwt'])

