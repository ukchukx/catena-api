'use strict'

/*
|--------------------------------------------------------------------------
| Websocket
|--------------------------------------------------------------------------
|
| This file is used to register websocket channels and start the Ws server.
| Learn more about same in the official documentation.
| https://adonisjs.com/docs/websocket
|
| For middleware, do check `wsKernel.js` file.
|
*/
const Logger = use('Logger');
const Ws = use('Ws');

Ws.channel('users', ({ socket: { topic, id }, auth: { user: { email } } }) => {
  Logger.info(`user '${email}' joined topic '${topic}' with id '${id}'`);
})
.middleware(['socketAuth']);
