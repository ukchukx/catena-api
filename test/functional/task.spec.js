const { test, trait } = use('Test/Suite')('Task');
const User = use('App/Models/User');
const Task = use('App/Models/Task');
const TaskSchedule = use('App/Models/TaskSchedule');

trait('DatabaseTransactions');
trait('Test/ApiClient');
trait('Auth/Client');


test('user can create task', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';
  const name = 'Task #1';

  const user = await User.create({ email, password });

  const response = await client
    .post('api/v1/tasks')
    .loginVia(user, 'jwt')
    .field('name', name)
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    message: 'Task created.',
    data: {
      name,
      description: '',
      schedules: []
    }
  });
});

test('user cannot create tasks with the same name', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';
  const name = 'Task #1';

  const user = await User.create({ email, password });
  const task = await Task.create({ name, description: '', user_id: user.id });

  const response = await client
    .post('api/v1/tasks')
    .loginVia(user, 'jwt')
    .field('name', task.name)
    .end();

  response.assertStatus(422);
  response.assertJSONSubset({
    success: false,
    message: 'Name already used.'
  });
});

test('user can create task  with schedules', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';
  const name = 'Task #1';

  const user = await User.create({ email, password });
  const schedules = [
    { due_date: new Date().toISOString(), remarks: 'test schedule #1' },
    { due_date: new Date().toISOString(), remarks: 'test schedule #2' }
  ];

  const response = await client
    .post('api/v1/tasks')
    .loginVia(user, 'jwt')
    .send({ name, schedules })
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    message: 'Task created.',
    data: {
      name,
      description: '',
      schedules: []
    }
  });
});

test('user can update tasks', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';
  const name = 'Task #1';
  const newName = 'Task #0';
  const description = 'Task description@@>$?#';

  const user = await User.create({ email, password });
  const task = await Task.create({ name, description: '', user_id: user.id });

  const response = await client
    .put(`api/v1/tasks/${task.id}`)
    .loginVia(user, 'jwt')
    .field('name', newName)
    .field('description', description)
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    message: 'Task updated.',
    data: {
      name: newName,
      description
    }
  });
});

test('user can get tasks', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';
  const name = 'Task #1';

  const user = await User.create({ email, password });
  const task = await Task.create({ name, description: '', user_id: user.id });

  let response = await client
    .get(`api/v1/tasks/${task.id}`)
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    data: {
      name,
      schedules: []
    }
  });

  response = await client
    .get(`api/v1/tasks/${task.id + 200}`)
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(404);
  response.assertJSONSubset({
    success: false,
    message: 'Task not found'
  });
});

test('user can list tasks', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';
  const name = 'Task #1';

  const user = await User.create({ email, password });
  const task = await Task.create({ name, description: '', user_id: user.id });

  const date1 = new Date();
  date1.setHours(12, 0, 0, 0);
  const date2 = new Date();
  date2.setHours(12, 0, 0, 0);

  const schedules = [
    { due_date: date1.toISOString(), remarks: 'test schedule #1', task_id: task.id, user_id: user.id },
    { due_date: date2.toISOString(), remarks: 'test schedule #2', task_id: task.id, user_id: user.id }
  ];
  await TaskSchedule.createMany(schedules);

  const response = await client
    .get('api/v1/tasks')
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    data: [{
      name,
      description: task.description,
      user_id: user.id,
      schedules: [
        schedules[0],
        schedules[1]
      ]
    }]
  });
});

test('user can delete tasks', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';
  const name = 'Task #1';

  const user = await User.create({ email, password });
  const task = await Task.create({ name, description: '', user_id: user.id });

  const response = await client
    .delete(`api/v1/tasks/${task.id}`)
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(204);
});

test('task deletion is soft', async ({ assert }) => {
  const email = 'test@test.com';
  const password = 'password';
  const name = 'Task #1';

  const user = await User.create({ email, password });
  const task = await Task.create({ name, description: '', user_id: user.id });
  await task.delete();

  const count = await Task.query().where('id', task.id).withTrashed().getCount();

  assert.isNull(await Task.find(task.id));
  assert.equal(1, count);
});

test('user can mark tasks as done on the due date', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';
  const name = 'Task #1';

  const user = await User.create({ email, password });
  const task = await Task.create({ name, description: '', user_id: user.id });

  const date1 = new Date();
  date1.setHours(12, 0, 0, 0);

  const schedules = [
    { due_date: date1.toISOString(), remarks: 'test schedule #2', task_id: task.id, user_id: user.id }
  ];
  await TaskSchedule.createMany(schedules);

  const response = await client
    .post(`api/v1/tasks/${task.id}/done`)
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    data: {
      name,
      description: task.description,
      user_id: user.id,
      schedules: [
        Object.assign(schedules[0], { done: 1 })
      ]
    }
  });
});

test('user cannot mark tasks as done before the due date', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';
  const name = 'Task #1';

  const user = await User.create({ email, password });
  const task = await Task.create({ name, description: '', user_id: user.id });

  const date1 = new Date();
  date1.setDate(date1.getDate() + 1);
  date1.setHours(12, 0, 0, 0);

  const schedules = [
    { due_date: date1.toISOString(), remarks: 'test schedule #2', task_id: task.id, user_id: user.id }
  ];
  await TaskSchedule.createMany(schedules);

  const response = await client
    .post(`api/v1/tasks/${task.id}/done`)
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(403);
  response.assertJSONSubset({
    success: false
  });
});

test('user cannot mark tasks as done after the due date', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';
  const name = 'Task #1';

  const user = await User.create({ email, password });
  const task = await Task.create({ name, description: '', user_id: user.id });

  const date1 = new Date();
  date1.setDate(date1.getDate() - 1);
  date1.setHours(12, 0, 0, 0);

  const schedules = [
    { due_date: date1.toISOString(), remarks: 'test schedule #2', task_id: task.id, user_id: user.id }
  ];
  await TaskSchedule.createMany(schedules);

  const response = await client
    .post(`api/v1/tasks/${task.id}/done`)
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(403);
  response.assertJSONSubset({
    success: false
  });
});

test('user can edit schedule remarks', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';
  const name = 'Task #1';
  const remarks = 'New remark';

  const user = await User.create({ email, password });
  const task = await Task.create({ name, description: '', user_id: user.id });

  const date1 = new Date();
  date1.setHours(12, 0, 0, 0);

  let schedule = {
    due_date: date1,
    remarks: 'test schedule #2',
    task_id: task.id,
    user_id: user.id
  };
  schedule = await TaskSchedule.create(schedule);

  const response = await client
    .put(`api/v1/tasks/update_schedule/${schedule.id}`)
    .loginVia(user, 'jwt')
    .field('remarks', remarks)
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    message: 'Schedule updated.',
    data: {
      remarks
    }
  });
});
