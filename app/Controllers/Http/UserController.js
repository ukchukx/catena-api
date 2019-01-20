const User = use('App/Models/User');
const Hash = use('Hash');

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
