const { test, trait } = use('Test/Suite')('User registration/authentication');
const User = use('App/Models/User');

trait('DatabaseTransactions');
trait('Test/ApiClient');
trait('Auth/Client');

test('user is signed up', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';

  const response = await client
    .post('api/v1/signup')
    .field('email', email)
    .field('password', password)
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    data: {
      email
    }
  });
});

test('successful signup returns token', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';

  const response = await client
    .post('api/v1/signup')
    .field('email', email)
    .field('password', password)
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    token: {
      type: 'bearer'
    }
  });
});

test('sign up with duplicate email fails', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';

  await User.create({ email, password });

  const response = await client
    .post('api/v1/signup')
    .field('email', email)
    .field('password', password)
    .end();

  response.assertStatus(422);
  response.assertJSONSubset({
    success: false,
    message: 'Validation failed',
    errors: []
  });
});

test('authentication succeeds with right credentials', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';

  await User.create({ email, password });

  let response = await client
    .post('api/v1/authenticate')
    .field('email', email)
    .field('password', password)
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    token: {
      type: 'bearer'
    }
  });

  response = await client
    .post('api/v1/authenticate')
    .field('email', 'wrong@email.com')
    .field('password', password)
    .end();

  response.assertStatus(403);
  response.assertJSONSubset({
    success: false
  });
});

test('authentication fails with wrong credentials', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';

  await User.create({ email, password });

  let response = await client
    .post('api/v1/authenticate')
    .field('email', email)
    .field('password', 'anotherpassword')
    .end();

  response.assertStatus(403);
  response.assertJSONSubset({
    success: false
  });

  response = await client
    .post('api/v1/authenticate')
    .field('email', 'wrong@email.com')
    .field('password', password)
    .end();

  response.assertStatus(403);
  response.assertJSONSubset({
    success: false
  });
});

test('user can retrieve profile with valid token', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';

  const user = await User.create({ email, password });

  const response = await client
    .post('api/v1/me')
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    data: {
      email
    }
  });
});

test('user cannot retrieve profile with invalid token', async ({ client }) => {
  const email = 'test@test.com';
  const password = 'password';

  await User.create({ email, password });

  const response = await client
    .post('api/v1/me')
    .end();

  response.assertStatus(401);
});
