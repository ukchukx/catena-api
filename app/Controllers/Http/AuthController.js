const User = use('App/Models/User');
const { validate, sanitize } = use('Validator');

/* eslint-disable class-methods-use-this */
class AuthController {
  async signup({ request, auth, response }) {
    // get user data from the request and sanitize
    const sanitizationRules = {
      email: 'trim|normalize_email'
    };
    const userData = sanitize(request.only(['email', 'password']), sanitizationRules);

    // Validate user input
    const validationRules = {
      email: 'required|email|unique:users,email',
      password: 'required|min:6'
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
      // save user to database
      const user = await User.create(userData);
      // generate JWT token for user
      const token = await auth.generate(user);

      return response.json({
        success: true,
        data: user,
        token
      });
    } catch (error) {
      return response.status(400).json({
        success: false,
        message: 'There was a problem creating the user, please try again later.'
      });
    }
  }

  async authenticate({ request, auth, response }) {
    // get user data from the request and sanitize
    const sanitizationRules = {
      email: 'trim|normalize_email'
    };
    const userData = sanitize(request.only(['email', 'password']), sanitizationRules);

    try {
      // validate the user credentials and generate a JWT token
      const token = await auth.attempt(
        userData.email,
        userData.password
      );

      const data = await User.query()
        .where('email', userData.email)
        .with('tasks.schedules')
        .firstOrFail();

      return response.json({
        success: true,
        data,
        token
      });
    } catch (error) {
      return response.status(403).json({
        success: false,
        message: 'Invalid email/password'
      });
    }
  }
}

module.exports = AuthController;
