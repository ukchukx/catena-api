const Config = use('Config');
const Hash = use('Hash');
const Mail = use('Mail');
const crypto = use('crypto');
const PasswordReset = use('App/Models/PasswordReset');
const User = use('App/Models/User');
const { validate, sanitize } = use('Validator');

class PasswordResetController {
  async forgot({ request, response }) {
    // get user data from the request and sanitize
    const sanitizationRules = {
      email: 'trim|normalize_email'
    };
    const requestData = sanitize(request.only(['email']), sanitizationRules);

    // Validate user input
    const validationRules = {
      email: 'required|email|exists:users,email'
    };
    const validation = await validate(requestData, validationRules);
    if (validation.fails()) {
      return response.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: validation.messages()
      });
    }

    const token = await Hash.make(crypto.randomBytes(20).toString('hex'));
    requestData.token = token;

    // Delete any previous reset tokens for this email,
    // then save a reset token for this email
    await PasswordReset
      .query()
      .where('email', requestData.email)
      .delete()
      .then(() => PasswordReset.create(requestData));

    this._sendResetLink(requestData);

    return response.json({
      success: true,
      message: 'Password reset email sent'
    });
  }

  async reset({ auth, request, response }) {
    // get user data from the request and sanitize
    const sanitizationRules = {
      email: 'trim|normalize_email',
      password: 'trim',
      token: 'trim'
    };
    const requestData = sanitize(request.only(['email', 'password', 'token']), sanitizationRules);

    const record = await PasswordReset.query()
      .where('email', requestData.email)
      .firstOrFail();

    // delete token
    await record.delete();

    const verified = await this._verifyToken(requestData.token, record.token, record.created_at);

    if (verified) {
      const user = await User.query().where('email', requestData.email).firstOrFail();
      user.password = requestData.password;
      await user.save();
      const token = await auth.generate(user);
      await user.load('tasks.schedules');

      return response.json({
        success: true,
        data: user,
        token
      });
    }

    return response.status(406).json({
      success: false,
      message: 'Token has expired'
    });
  }

  async _sendResetLink(params) {
    await Mail.send(
      'emails.forgot',
      params,
      (message) => {
        message
          .subject('Password Reset')
          .from('noreply@catena.com.ng', 'Catena App')
          .to(params.email);
      }
    );
  }

  async _verifyToken(providedToken, recordToken, createdAt) {
    const validToken = await Hash.verify(providedToken, recordToken);
    return validToken && !this._isTokenExpired(createdAt);
  }

  _isTokenExpired(createdAt) {
    const MINUTE_IN_MILLIS = 6000;
    const expiryPeriod = Config.get('auth.password_reset.expires_in_minutes');
    const tokenValidSince = Date.now() - (MINUTE_IN_MILLIS * expiryPeriod);
    return createdAt <= tokenValidSince;
  }
}

module.exports = PasswordResetController;
