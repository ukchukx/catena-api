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
  Route.post('me', 'AuthController.me').as('auth.me')
}).prefix('api/v1').formats(['json']).middleware(['auth:jwt'])

