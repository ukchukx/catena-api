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
}

module.exports = UserController;
