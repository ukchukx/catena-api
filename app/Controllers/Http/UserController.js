const { validate, sanitize } = use('Validator');
const Hash = use('Hash');
const User = use('App/Models/User');

class UserController {
  async me({ auth, response }) {
    const data = await User.query()
      .where('id', auth.current.user.id)
      .with('tasks.schedules')
      .firstOrFail();

    try {
      return response.json({
        success: true,
        data
      });
    } catch (error) {
      return response.status(403).json({
        success: false,
        message: 'Invalid email/password'
      });
    }
  }

  async updateProfile({ request, auth, response }) {
    // get data from the request and sanitize
    const sanitizationRules = {
      email: 'trim|normalize_email',
      username: 'trim|strip_tags|strip_links'
    };
    const userData = sanitize(request.only(['email', 'username']), sanitizationRules);

    // Validate user input
    const validationRules = {
      email: `email|unique:users,email,id,${auth.current.user.id}`,
      username: 'string|max:254'
    };
    const validation = await validate(userData, validationRules);
    if (validation.fails()) {
      return response.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: validation.messages()
      });
    }

    try {
      // get currently authenticated user
      const { current: { user } } = auth;

      // Update user fields with provided values
      user.username = userData.username;
      user.email = userData.email;

      await user.save();

      return response.json({
        success: true,
        message: 'Profile updated.',
        data: user
      });
    } catch (error) {
      return response.status(400).json({
        success: false,
        message: 'There was a problem updating profile, please try again later.'
      });
    }
  }

  async changePassword({ request, auth, response }) {
    // get currently authenticated user
    const { current: { user } } = auth;

    // verify if current password matches
    const verifyPassword = await Hash.verify(request.input('password'), user.password);

    // display appropriate message
    if (!verifyPassword) {
      return response.status(400).json({
        success: false,
        message: 'Current password could not be verified. Please try again.'
      });
    }

    // hash and save new password
    user.password = await Hash.make(request.input('new_password'));
    await user.save();

    return response.json({
      success: true,
      message: 'Password updated.'
    });
  }
}

module.exports = UserController;
