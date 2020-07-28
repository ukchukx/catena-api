
const Logger = use('Logger');
const Ws = use('Ws');
const { validate, sanitize } = use('Validator');
const Task = use('App/Models/Task');
const TaskSchedule = use('App/Models/TaskSchedule');
const { dateEqualsNoTime, utcNow, twelveUTC, timeAsInt } = require('../../../utils/date');

class TaskController {
  async create({ request, auth: { current: { user } }, response }) {
    // get data from the request and sanitize
    const sanitizationRules = {
      name: 'trim|strip_tags|strip_links',
      description: 'trim',
      visibility: 'trim'
    };
    const validationRules = {
      name: 'string|required|max:255',
      description: 'string',
      visibility: 'string|required|in:private,public',
      schedules: 'array'
    };
    const userData = sanitize(request.only(['name', 'description', 'schedules', 'visibility']), sanitizationRules);
    if (!userData.visibility) userData.visibility = 'private';

    const validation = await validate(userData, validationRules);

    if (validation.fails()) {
      return response.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: validation.messages()
      });
    }

    try {
      const task = await Task.create({
        name: userData.name,
        description: userData.description || '',
        visibility: userData.visibility,
        user_id: user.id
      });

      if (userData.schedules) { // If schedules were supplied, create them now
        userData.schedules = userData.schedules
          .map(schedule => (
            {
              due_date: schedule.due_date,
              from: schedule.from || '00:00:00',
              to: schedule.to || '23:59:59',
              remarks: schedule.remarks || '',
              done: false,
              task_id: task.id,
              user_id: user.id
            }));

        await TaskSchedule.createMany(userData.schedules);
      }

      await task.load('schedules');

      const topic = Ws.getChannel('users').topic('users');
      if (topic) {
        topic.broadcast('task_created', { task });
      }

      return response.json({ success: true, message: 'Task created.', data: task });
    } catch (error) {
      Logger.error('task create %j', { url: request.url(), user: user.username(), error });

      return response.status(400).json({
        success: false,
        message: 'There was a problem creating task, please try again later.'
      });
    }
  }

  async get({ params: { id }, auth: { current: { user } }, response }) {
    try {
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

  async getPublic({ params: { id }, response }) {
    try {
      const data = await Task.query()
        .where({ id, visibility: 'public' })
        .with('schedules')
        .with('user')
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

  async list({ auth: { current: { user } }, response }) {
    try {
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

  async update({ params: { id }, request, auth: { current: { user } }, response }) {
    // get data from the request and sanitize
    const sanitizationRules = {
      name: 'trim|strip_tags|strip_links',
      description: 'trim',
      visibility: 'trim'
    };
    const validationRules = {
      name: 'string|max:255',
      description: 'string',
      visibility: 'string|in:private,public',
      schedules: 'array'
    };
    const taskData = sanitize(request.only(['name', 'description', 'visibility']), sanitizationRules);
    const validation = await validate(taskData, validationRules);
    const scheduleValidation = await validate(request.only(['schedules']), validationRules);
    let newSchedules = request.only(['schedules']).schedules || [];

    if (validation.fails() || scheduleValidation.fails()) {
      return response.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: validation.messages()
      });
    }

    try {
      const task = await Task
        .query()
        .where({ id, user_id: user.id })
        .firstOrFail();

      // Update task fields with provided values
      task.merge(taskData);

      await task.save();

      if (newSchedules.length) {
        newSchedules = newSchedules
          .map(schedule => (
            {
              due_date: schedule.due_date,
              from: schedule.from || '00:00:00',
              to: schedule.to || '23:59:59',
              remarks: schedule.remarks || '',
              done: false,
              task_id: task.id,
              user_id: user.id
            }));

        const date = new Date();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dateStr = `${date.getFullYear()}-${month >= 10 ? month : `0${month}`}-${day >= 10 ? day : `0${day}`}`;

        Logger.info(`Deleting undone schedules from ${dateStr} for task ${id}`);

        // Remove today's schedule if not done
        const todaySchedule = await TaskSchedule
          .query()
          .where({ task_id: id, user_id: user.id })
          .where('due_date', 'like', `${dateStr}%`)
          .first();

        if (todaySchedule) {
          if (!todaySchedule.done) {
            Logger.info(`Deleting undone schedule for today ${dateStr} for task ${id}`);

            todaySchedule.forceDelete();
          } else {
            // Remove today from `newSchedules` since it's done
            newSchedules = newSchedules.filter(({ due_date }) => !dateEqualsNoTime(new Date(due_date), date));
          }
        }

        await TaskSchedule
          .query()
          .where({ task_id: id, user_id: user.id, done: false })
          .where('due_date', '>=', dateStr)
          .delete();

        await TaskSchedule.createMany(newSchedules);
      }

      await task.load('schedules');

      const topic = Ws.getChannel('users').topic('users');
      if (topic) {
        topic.broadcast('task_updated', { task });
      }

      return response.json({
        success: true,
        message: 'Task updated.',
        data: task
      });
    } catch (error) {
      error = error.toString();
      Logger.warning(`Error updating task ${id} for ${user.email}`, { email: user.email, error, id });
      return response.status(400).json({
        success: false,
        message: 'There was a problem updating task, please try again later.'
      });
    }
  }

  async delete({ params: { id }, auth: { current: { user } }, response }) {
    try {
      const task = await Task
        .query()
        .where({ id, user_id: user.id })
        .withTrashed()
        .firstOrFail();

      await task.forceDelete();

      const topic = Ws.getChannel('users').topic('users');
      if (topic) {
        topic.broadcast('task_deleted', { task });
      }

      return response.status(204).json({});
    } catch (error) {
      return response.status(400).json({
        success: false,
        message: 'There was a problem deleting task, please try again later.'
      });
    }
  }

  async archive({ params: { id }, auth: { current: { user } }, response }) {
    try {
      const date = new Date();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const dateStr = `${date.getFullYear()}-${month >= 10 ? month : `0${month}`}-${day >= 10 ? day : `0${day}`}`;

      const task = await Task
        .query()
        .where({ id, user_id: user.id })
        .firstOrFail();

      Logger.info(`Archiving task ${id} from ${dateStr}`);

      await task.delete();
      await TaskSchedule
        .query()
        .where({ task_id: task.id, user_id: user.id, done: false })
        .where('due_date', '>=', dateStr)
        .update({ deleted_at: new Date() });

      const data = await Task.query()
        .where({ id, user_id: user.id })
        .onlyTrashed()
        .with('schedules')
        .firstOrFail();

      const topic = Ws.getChannel('users').topic('users');
      if (topic) {
        topic.broadcast('task_updated', { task: data });
      }

      return response.status(200).json({ success: true, data });
    } catch (error) {
      return response.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }
  }

  async restore({ params: { id }, auth: { current: { user } }, response }) {
    try {
      const date = new Date();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const dateStr = `${date.getFullYear()}-${month >= 10 ? month : `0${month}`}-${day >= 10 ? day : `0${day}`}`;

      const task = await Task
        .query()
        .where({ id, user_id: user.id })
        .withTrashed()
        .firstOrFail();

      if (!task.deleted_at) { // Task does not need restoration
        await task.load('schedules');

        return response.status(200).json({ success: true, data: task });
      }

      Logger.info(`Restoring task ${id} from ${dateStr}`);

      await task.restore();
      await TaskSchedule
        .query()
        .where({ task_id: task.id, user_id: user.id, done: false })
        .where('due_date', '>=', dateStr)
        .onlyTrashed()
        .update({ deleted_at: null });

      const data = await Task.query()
        .where({ id, user_id: user.id })
        .with('schedules')
        .firstOrFail();

      const topic = Ws.getChannel('users').topic('users');
      if (topic) {
        topic.broadcast('task_updated', { task: data });
      }

      return response.status(200).json({ success: true, data });
    } catch (error) {
      return response.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }
  }

  async doneToday({ params: { id }, auth: { current: { user } }, request, response }) {
    const time = timeAsInt();
    const now = new Date();
    const midday = twelveUTC();

    const logData = { id, user: user.email, now, midday, time };

    try {
      Logger.info(`Attempting to mark task ${id} on ${now} for ${user.email}`, logData);

      const schedule = await TaskSchedule
        .query()
        .where({ task_id: id, user_id: user.id, done: false })
        .where('due_date', '=', midday)
        .where('from', '<=', time)
        .where('to', '>=', time)
        .first();

      if (!schedule) {
        Logger.info(`No schedule found for task ${id} on ${now} for ${user.email}`, logData);

        return response.status(400).json({
          success: false,
          message: 'Schedules can only be marked on their due date.'
        });
      }

      // mark schedule as done
      schedule.done = true;
      await schedule.save();

      Logger.info(`Task ${id} on ${now} marked for ${user.email}.`, logData);

      const task = await Task.query()
        .where({ id, user_id: user.id })
        .with('schedules')
        .firstOrFail();

      const topic = Ws.getChannel('users').topic('users');
      if (topic) {
        topic.broadcast('task_updated', { task });
      }

      return response.status(200).json({ success: true, data: task });
    } catch (error) {
      Logger.error(`Could not mark task ${id} on ${now} due to: ${error}`, logData);
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

      const topic = Ws.getChannel('users').topic('users');
      if (topic) {
        topic.broadcast('schedule_updated', { schedule });
      }

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
