const Logger = use('Logger');
const { validate, sanitize } = use('Validator');
const Task = use('App/Models/Task');
const TaskSchedule = use('App/Models/TaskSchedule');

class TaskController {
  async create({ request, auth, response }) {
    // get data from the request and sanitize
    const sanitizationRules = {
      name: 'trim|strip_tags|strip_links',
      description: 'trim'
    };
    const userData = sanitize(request.only(['name', 'description', 'schedules']), sanitizationRules);

    // Validate user input
    const validationRules = {
      name: 'string|max:255',
      description: 'string',
      schedules: 'array'
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

      // Check if the user has a task with this name
      if (await Task.isDuplicate({ name: userData.name, user_id: user.id })) {
        return response.status(422).json({
          success: false,
          message: 'Name already used.'
        });
      }

      const task = await Task.create({
        name: userData.name,
        description: userData.description || '',
        user_id: user.id
      });

      if (userData.schedules) { // If schedules were supplied, create them now
        userData.schedules = userData.schedules
          .map((schedule) => { // Take only the due_date and remarks
            const obj = { due_date: schedule.due_date, remarks: schedule.remarks || '' };
            // add the necessary relations
            obj.task_id = task.id;
            obj.user_id = user.id;
            return obj;
          });
        await TaskSchedule.createMany(userData.schedules);
      }
      await task.load('schedules');

      return response.json({
        success: true,
        message: 'Task created.',
        data: task
      });
    } catch (error) {
      console.error('create', error);
      Logger.error('task create %j', {
        url: request.url(),
        user: auth.user.username(),
        error
      });

      return response.status(400).json({
        success: false,
        message: 'There was a problem creating task, please try again later.'
      });
    }
  }

  async get({ params, auth, response }) {
    try {
      // get currently authenticated user
      const { current: { user } } = auth;

      const data = await Task.query()
        .where('id', params.id)
        .where('user_id', user.id)
        .with('schedules')
        .firstOrFail();

      return response.json({
        success: true,
        data
      });
    } catch (error) {
      return response.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
  }

  async list({ auth, response }) {
    try {
      // get currently authenticated user
      const { current: { user } } = auth;
      const tasks = await Task.query()
        .where('user_id', user.id)
        .with('schedules')
        .fetch();

      return response.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      return response.status(400).json({
        success: false,
        message: 'Could not retrieve tasks'
      });
    }
  }

  async update({ params, request, auth, response }) {
    // get data from the request and sanitize
    const sanitizationRules = {
      name: 'trim|strip_tags|strip_links',
      description: 'trim'
    };
    const userData = sanitize(request.only(['name', 'description']), sanitizationRules);

    // Validate user input
    const validationRules = {
      name: 'string|max:255',
      description: 'string',
      schedules: 'array'
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

      const task = await Task
        .query()
        .where('id', params.id)
        .where('user_id', user.id)
        .firstOrFail();

      // Update task fields with provided values
      task.merge(userData);

      await task.save();

      return response.json({
        success: true,
        message: 'Task updated.',
        data: task
      });
    } catch (error) {
      return response.status(400).json({
        success: false,
        message: 'There was a problem updating task, please try again later.'
      });
    }
  }

  async delete({ params, auth, response }) {
    try {
      // get currently authenticated user
      const { current: { user } } = auth;

      const task = await Task
        .query()
        .where({ id: params.id, user_id: user.id })
        .firstOrFail();

      await task.delete();

      return response.status(204).json({});
    } catch (error) {
      return response.status(400).json({
        success: false,
        message: 'There was a problem deleting task, please try again later.'
      });
    }
  }
}

module.exports = TaskController;
