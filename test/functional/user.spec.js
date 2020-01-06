const { test, trait } = use('Test/Suite')('User');
const User = use('App/Models/User');
const PasswordReset = use('App/Models/PasswordReset');
const Hash = use('Hash');
const crypto = use('crypto');

trait('DatabaseTransactions');
trait('Test/ApiClient');
trait('Auth/Client');

test('user is signed up', async ({ client }) => {
  const email = 'test@test.com';

  const response = await client
    .post('api/v1/signup')
    .field('email', email)
    .field('password', 'password')
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

  const response = await client
    .post('api/v1/signup')
    .field('email', email)
    .field('password', 'password')
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    data: {
      email
    },
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

  const user = await User.create({ email, password: 'password' });

  const response = await client
    .get('api/v1/profile')
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
  await User.create({ email: 'test@test.com', password: 'password' });

  const response = await client
    .post('api/v1/profile')
    .end();

  response.assertStatus(401);
});

test('user can change password', async ({ assert, client }) => {
  const email = 'test@test.com';
  const password = 'password';

  let user = await User.create({ email, password });

  const response = await client
    .post('api/v1/change_password')
    .loginVia(user, 'jwt')
    .field('password', password)
    .field('new_password', email)
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    message: 'Password updated.'
  });

  user = await User.find(user.id);

  assert.isTrue(await Hash.verify(email, user.password));
});

test('changing password fails if wrong current password is provided', async ({ client }) => {
  const email = 'test@test.com';

  const user = await User.create({ email, password: 'password' });

  const response = await client
    .post('api/v1/change_password')
    .loginVia(user, 'jwt')
    .field('password', 'wrongpassword')
    .field('new_password', email)
    .end();

  response.assertStatus(400);
  response.assertJSONSubset({
    success: false,
    message: 'Current password could not be verified. Please try again.'
  });
});

test('user can update profile', async ({ client }) => {
  const email = 'test@test.com';
  const username = 'new username';

  const user = await User.create({ email, password: 'password' });

  const response = await client
    .put('api/v1/profile')
    .loginVia(user, 'jwt')
    .field('username', username)
    .field('email', email)
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    message: 'Profile updated.',
    data: {
      username,
      email
    }
  });
});

test('sending a password reset link for an existing account succeeds', async ({ client }) => {
  const email = 'test@test.com';

  await User.create({ email, password: 'password' });

  const response = await client
    .post('api/v1/forgot')
    .field('email', email)
    .end();

  response.assertStatus(200);
  response.assertJSON({
    success: true,
    message: 'Password reset email sent'
  });
}).timeout(0);

test('sending a password reset link fails for a non-existent account', async ({ client }) => {
  const response = await client
    .post('api/v1/forgot')
    .field('email', 'test@test.com')
    .end();

  response.assertStatus(422);
  response.assertJSONSubset({
    success: false,
    message: 'Validation failed'
  });
});

test('password reset with valid token succeeds', async ({ client }) => {
  const email = 'test@test.com';

  await User.create({ email, password: 'password' });

  const token = crypto.randomBytes(20).toString('hex');
  await PasswordReset.create({ email, token: await Hash.make(token) });

  const response = await client
    .post('api/v1/reset')
    .field('email', email)
    .field('token', token)
    .field('password', 'newpassword')
    .end();

  response.assertStatus(200);
  response.assertJSONSubset({
    success: true,
    data: {
      email
    },
    token: {
      type: 'bearer'
    }
  });
});
