const { test, trait } = use('Test/Suite')('Task');
const User = use('App/Models/User');
const Task = use('App/Models/Task');
const TaskSchedule = use('App/Models/TaskSchedule');
const { dateEqualsNoMilliseconds } = require('../../utils/date');

trait('DatabaseTransactions');
trait('Test/ApiClient');
trait('Auth/Client');

test('User can create tasks', async ({ client }) => {
  const name = 'Task #1';

  const user = await User.create({ email: 'test@test.com', password: 'password' });

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

test('Tasks can be created with the same name', async ({ client }) => {
  const name = 'Task #1';

  const user = await User.create({ email: 'test@test.com', password: 'password' });
  const task = await Task.create({ name, description: '', user_id: user.id });

  const response = await client
    .post('api/v1/tasks')
    .loginVia(user, 'jwt')
    .field('name', task.name)
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

test('Tasks can be created with schedules', async ({ client }) => {
  const name = 'Task #1';

  const user = await User.create({ email: 'test@test.com', password: 'password' });
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

test('schedules created without from and to times have defaults', async ({ client }) => {
  const name = 'Task #1';

  const user = await User.create({ email: 'test@test.com', password: 'password' });
  const schedules = [
    { due_date: new Date().toISOString(), remarks: 'Schedule #1' },
    { due_date: new Date().toISOString(), remarks: 'Schedule #2' }
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
      schedules: [
        { from: '00:00:00', to: '23:59:59', remarks: 'Schedule #1' },
        { from: '00:00:00', to: '23:59:59', remarks: 'Schedule #2' }
      ]
    }
  });
});

test('user can update tasks', async ({ client }) => {
  const newName = 'Task #0';
  const description = 'Task description@@>$?#';

  const user = await User.create({ email: 'test@test.com', password: 'password' });
  const task = await Task.create({ name: 'Task #1', description: '', user_id: user.id });

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

test("user can update task schedules, including today's undone schedule", async ({ assert, client }) => {
  const user = await User.create({ email: 'test@test.com', password: 'password' });
  const task = await Task.create({ name: 'Task #1', description: '', user_id: user.id });
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const yesterday = new Date(today.getTime() - 86400000);

  await TaskSchedule.createMany([
    {
      due_date: yesterday.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id
    },
    {
      due_date: today.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id
    },
    {
      due_date: tomorrow.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id
    }
  ]);
  const schedulesArgs = [
    {
      due_date: today.toISOString(),
      from: '12:00:00',
      to: '18:00:00',
      task_id: task.id,
      user_id: user.id
    },
    {
      due_date: tomorrow.toISOString(),
      from: '12:00:00',
      to: '18:00:00',
      task_id: task.id,
      user_id: user.id
    }
  ];

  const response = await client
    .put(`api/v1/tasks/${task.id}`)
    .loginVia(user, 'jwt')
    .send({ schedules: schedulesArgs })
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    message: 'Task updated.',
    data: {
      schedules: [
        { done: 0, from: '00:00:00', to: '23:59:59', remarks: '' },
        { done: 0, from: '12:00:00', to: '18:00:00', remarks: '' },
        { done: 0, from: '12:00:00', to: '18:00:00', remarks: '' }
      ]
    }
  });

  const { body: { data: { schedules } } } = response;

  assert.isTrue(dateEqualsNoMilliseconds(new Date(schedules[0].due_date), yesterday));
  assert.isTrue(dateEqualsNoMilliseconds(new Date(schedules[1].due_date), today));
  assert.isTrue(dateEqualsNoMilliseconds(new Date(schedules[2].due_date), tomorrow));
});

test("user can update task schedules, excluding today's done schedule", async ({ assert, client }) => {
  const user = await User.create({ email: 'test@test.com', password: 'password' });
  const task = await Task.create({ name: 'Task #1', description: '', user_id: user.id });
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const yesterday = new Date(today.getTime() - 86400000);

  await TaskSchedule.createMany([
    {
      due_date: yesterday.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id
    },
    {
      due_date: today.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id,
      done: true
    },
    {
      due_date: tomorrow.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id
    }
  ]);
  const schedulesArgs = [
    {
      due_date: today.toISOString(),
      from: '12:00:00',
      to: '18:00:00',
      task_id: task.id,
      user_id: user.id
    },
    {
      due_date: tomorrow.toISOString(),
      from: '12:00:00',
      to: '18:00:00',
      task_id: task.id,
      user_id: user.id
    }
  ];

  const response = await client
    .put(`api/v1/tasks/${task.id}`)
    .loginVia(user, 'jwt')
    .send({ schedules: schedulesArgs })
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    message: 'Task updated.',
    data: {
      schedules: [
        { done: 0, from: '00:00:00', to: '23:59:59', remarks: '' },
        { done: 1, from: '00:00:00', to: '23:59:59', remarks: '' },
        { done: 0, from: '12:00:00', to: '18:00:00', remarks: '' }
      ]
    }
  });

  const { body: { data: { schedules } } } = response;

  assert.isTrue(dateEqualsNoMilliseconds(new Date(schedules[0].due_date), yesterday));
  assert.isTrue(dateEqualsNoMilliseconds(new Date(schedules[1].due_date), today));
  assert.isTrue(dateEqualsNoMilliseconds(new Date(schedules[2].due_date), tomorrow));
});

test('user can get tasks', async ({ client }) => {
  const name = 'Task #1';

  const user = await User.create({ email: 'test@test.com', password: 'password' });
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
  const name = 'Task #1';

  const user = await User.create({ email: 'test@test.com', password: 'password' });
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

test('users can get public tasks without authentication', async ({ client }) => {
  const name = 'Public';

  const user = await User.create({ email: 'test@test.com', password: 'password' });
  const publicTask = await Task.create({ name, description: '', visibility: 'public', user_id: user.id });
  const privateTask = await Task.create({ name: 'Private', description: '', visibility: 'private', user_id: user.id });

  let response = await client
    .get(`api/v1/public/tasks/${publicTask.id}`)
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
    .get(`api/v1/public/tasks/${privateTask.id}`)
    .end();

  response.assertStatus(404);
  response.assertJSONSubset({
    success: false,
    message: 'Task not found'
  });
});

test('user can delete tasks', async ({ client }) => {
  const user = await User.create({ email: 'test@test.com', password: 'password' });
  const task = await Task.create({ name: 'Task #1', description: '', user_id: user.id });

  const response = await client
    .delete(`api/v1/tasks/${task.id}`)
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(204);
});

test('user can archive tasks', async ({ assert, client }) => {
  const user = await User.create({ email: 'test@test.com', password: 'password' });
  const task = await Task.create({ name: 'Task #1', description: '', user_id: user.id });

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const yesterday = new Date(today.getTime() - 86400000);

  await TaskSchedule.createMany([
    {
      due_date: tomorrow.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id
    },
    {
      due_date: today.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id
    },
    {
      due_date: yesterday.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id
    }
  ]);

  const response = await client
    .post(`api/v1/tasks/${task.id}/archive`)
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    data: {
      schedules: []
    }
  });
  assert.equal(1, response.body.data.schedules.length);
  assert.isNotNull(response.body.data.deleted_at);

  const undeletedCount = await TaskSchedule.query().where('task_id', task.id).getCount();
  const totalCount = await TaskSchedule.query().where('task_id', task.id).withTrashed().getCount();

  assert.equal(1, undeletedCount);
  assert.equal(3, totalCount);
});

test('user can restore tasks', async ({ assert, client }) => {
  const user = await User.create({ email: 'test@test.com', password: 'password' });
  const task = await Task.create({ name: 'Task #1', description: '', user_id: user.id });

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const yesterday = new Date(today.getTime() - 86400000);

  await TaskSchedule.createMany([
    {
      due_date: tomorrow.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id
    },
    {
      due_date: today.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id
    },
    {
      due_date: yesterday.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id
    }
  ]);

  let response = await client
    .post(`api/v1/tasks/${task.id}/archive`)
    .loginVia(user, 'jwt')
    .end();

  response = await client
    .post(`api/v1/tasks/${task.id}/restore`)
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    data: {
      schedules: []
    }
  });
  assert.equal(3, response.body.data.schedules.length);
  assert.isNull(response.body.data.deleted_at);

  const undeletedCount = await TaskSchedule.query().where('task_id', task.id).getCount();
  const totalCount = await TaskSchedule.query().where('task_id', task.id).withTrashed().getCount();

  assert.equal(3, undeletedCount);
  assert.equal(3, totalCount);
});

test('restoring unarchived tasks does nothing', async ({ assert, client }) => {
  const user = await User.create({ email: 'test@test.com', password: 'password' });
  const task = await Task.create({ name: 'Task #1', description: '', user_id: user.id });

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const yesterday = new Date(today.getTime() - 86400000);

  await TaskSchedule.createMany([
    {
      due_date: tomorrow.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id
    },
    {
      due_date: today.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id
    },
    {
      due_date: yesterday.toISOString(),
      from: '00:00:00',
      to: '23:59:59',
      remarks: '',
      task_id: task.id,
      user_id: user.id
    }
  ]);

  const response = await client
    .post(`api/v1/tasks/${task.id}/restore`)
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    data: {
      schedules: []
    }
  });
  assert.equal(3, response.body.data.schedules.length);

  const undeletedCount = await TaskSchedule.query().where('task_id', task.id).getCount();
  const totalCount = await TaskSchedule.query().where('task_id', task.id).withTrashed().getCount();

  assert.equal(3, undeletedCount);
  assert.equal(3, totalCount);
});

test('Tasks can be marked as done within the due date', async ({ client }) => {
  const name = 'Task #1';

  const user = await User.create({ email: 'test@test.com', password: 'password' });
  const task = await Task.create({ name, description: '', user_id: user.id });

  const date = new Date();
  let hours = date.getHours();
  hours = hours >= 10 ? hours : `0${hours}`;
  date.setUTCHours(12, 0, 0, 0);

  const schedules = [
    {
      due_date: date.toISOString(),
      from: `${hours}:00:00`,
      to: `${hours}:59:59`,
      remarks: 'test schedule #2',
      task_id: task.id,
      user_id: user.id
    }
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
      schedules: [Object.assign(schedules[0], { done: 1 })]
    }
  });
});

test('Tasks cannot be marked as done outside the due date', async ({ client }) => {
  const user = await User.create({ email: 'test@test.com', password: 'password' });
  const task = await Task.create({ name: 'Task #1', description: '', user_id: user.id });

  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  let hours = date.getUTCHours();
  hours = hours >= 10 ? hours : `0${hours}`;

  const schedules = [
    {
      due_date: date.toISOString(),
      from: `${hours - 1}:00:00`,
      to: `${hours - 1}:59:59`,
      remarks: 'test schedule #2',
      task_id: task.id,
      user_id: user.id
    }
  ];
  await TaskSchedule.createMany(schedules);

  const response = await client
    .post(`api/v1/tasks/${task.id}/done`)
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(400);
  response.assertJSONSubset({ success: false });
});

test('user can edit schedule remarks', async ({ client }) => {
  const remarks = 'New remark';

  const user = await User.create({ email: 'test@test.com', password: 'password' });
  const task = await Task.create({ name: 'Task #1', description: '', user_id: user.id });

  const date1 = new Date();
  date1.setUTCHours(12, 0, 0, 0);

  let schedule = {
    due_date: date1,
    remarks: 'test schedule #2',
    task_id: task.id,
    user_id: user.id
  };
  schedule = await TaskSchedule.create(schedule);

  const response = await client
    .put(`api/v1/tasks/schedules/${schedule.id}`)
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
