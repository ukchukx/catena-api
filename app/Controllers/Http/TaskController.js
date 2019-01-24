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
            const obj = { due_date: schedule.due_date, remarks: schedule.remarks || '', done: false };
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

  async get({ params: { id }, auth, response }) {
    try {
      // get currently authenticated user
      const { current: { user } } = auth;

      const data = await Task.query()
        .where({ id, user_id: user.id })
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
      const tasks = await Task
        .query()
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

  async update({ params: { id }, request, auth, response }) {
    // get data from the request and sanitize
    const sanitizationRules = {
      name: 'trim|strip_tags|strip_links',
      description: 'trim'
    };
    const userData = sanitize(request.only(['name', 'description']), sanitizationRules);

    // Validate user input
    const validationRules = {
      name: 'string|max:255',
      description: 'string'
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
        .where({ id, user_id: user.id })
        .firstOrFail();

      // Update task fields with provided values
      task.merge(userData);

      await task.save();
      await task.load('schedules');

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

  async delete({ params: { id }, auth, response }) {
    try {
      // get currently authenticated user
      const { current: { user } } = auth;

      const task = await Task
        .query()
        .where({ id, user_id: user.id })
        .firstOrFail();

      await task.forceDelete();

      return response.status(204).json({});
    } catch (error) {
      return response.status(400).json({
        success: false,
        message: 'There was a problem deleting task, please try again later.'
      });
    }
  }

  async doneToday({ params: { id }, auth, response }) {
    try {
      // get currently authenticated user
      const { current: { user } } = auth;
      const dueDate = new Date();
      dueDate.setUTCHours(12, 0, 0, 0); // Can only mark schedules for today

      const schedule = await TaskSchedule
        .query()
        .where({ task_id: id, user_id: user.id, due_date: dueDate, done: false })
        .first();

      if (!schedule) {
        return response.status(401).json({
          success: false,
          message: 'Schedules can only be marked on their due date.'
        });
      }

      // mark schedule as done
      schedule.done = true;
      await schedule.save();

      const task = await Task.query()
        .where({ id, user_id: user.id })
        .with('schedules')
        .firstOrFail();

      return response.status(200).json({
        success: true,
        data: task
      });
    } catch (error) {
      return response.status(400).json({
        success: false,
        message: 'There was a problem marking task, please try again later.'
      });
    }
  }

  async updateSchedule({ params: { id }, request, response }) {
    // get data from the request and sanitize
    const sanitizationRules = {
      remarks: 'trim'
    };
    const userData = sanitize(request.only(['remarks']), sanitizationRules);

    // Validate user input
    const validationRules = {
      remarks: 'string'
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
      const schedule = await TaskSchedule.findOrFail(id);

      // Update schedule fields with provided values
      schedule.merge(userData);

      await schedule.save();

      return response.json({
        success: true,
        message: 'Schedule updated.',
        data: schedule
      });
    } catch (error) {
      return response.status(400).json({
        success: false,
        message: 'There was a problem updating schedule, please try again later.'
      });
    }
  }
}

module.exports = TaskController;
