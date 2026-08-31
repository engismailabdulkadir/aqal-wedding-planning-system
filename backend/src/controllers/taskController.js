import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import { loadAccessibleWedding, assertWeddingAccess, requireStaffWeddingScope } from '../utils/weddingAccess.js';

const editableFields = ['title', 'description', 'category', 'priority', 'dueDate', 'status', 'assignedTo'];

function validateRequestBody(body, res) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400);
    throw new Error('Please provide valid task details');
  }
}

function parseDueDate(value, res) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' && !(value instanceof Date)) {
    res.status(400);
    throw new Error('Please provide a valid due date');
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    res.status(400);
    throw new Error('Please provide a valid due date');
  }
  return date;
}

function validateDueDate(dueDate, weddingDate, res) {
  if (dueDate && weddingDate && dueDate.getTime() > new Date(weddingDate).getTime()) {
    res.status(400);
    throw new Error('Task due date cannot be after the wedding date');
  }
}

function normalizeStatus(status) {
  if (status === 'pending') return 'todo';
  return status;
}

function isOpen(task) {
  return task.status !== 'completed';
}

function summarizeTasks(tasks) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const summary = { total: tasks.length, todo: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0, completionPercentage: 0 };
  for (const task of tasks) {
    const status = normalizeStatus(task.status);
    if (status === 'todo') { summary.todo += 1; summary.pending += 1; }
    if (status === 'in_progress') summary.inProgress += 1;
    if (status === 'completed') summary.completed += 1;
    if (isOpen(task) && task.dueDate && new Date(task.dueDate) < startOfToday) summary.overdue += 1;
  }
  summary.completionPercentage = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0;
  return summary;
}

function orderTasks(tasks) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const group = (task) => {
    if (task.status === 'completed') return 3;
    if (task.dueDate && new Date(task.dueDate) < startOfToday) return 0;
    if (task.dueDate) return 1;
    return 2;
  };
  return tasks.sort((left, right) => {
    const groupDifference = group(left) - group(right);
    if (groupDifference) return groupDifference;
    if (left.dueDate && right.dueDate) return new Date(left.dueDate) - new Date(right.dueDate);
    return new Date(right.createdAt) - new Date(left.createdAt);
  });
}

async function findAccessibleTask(id, req, res) {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid task ID');
  }
  const task = await Task.findById(id).populate('assignedTo', 'firstName lastName role');
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  const wedding = await assertWeddingAccess(req, res, task.wedding, { write: true });
  return { task, wedding };
}

export const getTasks = asyncHandler(async (req, res) => {
  requireStaffWeddingScope(req, res);
  const wedding = await loadAccessibleWedding(req, res, { required: false });
  if (!wedding) return res.json({ success: true, wedding: null, summary: null, tasks: [] });
  const filter = { wedding: wedding._id };
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status === 'pending' ? { $in: ['pending', 'todo'] } : req.query.status;
  if (req.query.priority && req.query.priority !== 'all') filter.priority = req.query.priority;
  const tasks = orderTasks(await Task.find(filter).populate('assignedTo', 'firstName lastName role'));
  return res.json({
    success: true,
    wedding: { _id: wedding._id, weddingDate: wedding.weddingDate },
    summary: summarizeTasks(await Task.find({ wedding: wedding._id })),
    tasks,
  });
});

export const createTask = asyncHandler(async (req, res) => {
  validateRequestBody(req.body, res);
  const wedding = await loadAccessibleWedding(req, res, { write: true });
  const taskData = { wedding: wedding._id, createdBy: req.user._id, status: 'pending' };
  for (const field of editableFields) {
    if (field === 'status') continue;
    if (req.body[field] !== undefined) taskData[field] = req.body[field];
  }
  if (req.body.dueDate !== undefined) taskData.dueDate = parseDueDate(req.body.dueDate, res);
  validateDueDate(taskData.dueDate, wedding.weddingDate, res);
  const task = await Task.create(taskData);
  res.status(201).json({ success: true, task });
});

export const getTask = asyncHandler(async (req, res) => {
  const { task } = await findAccessibleTask(req.params.id, req, res);
  res.json({ success: true, task });
});

export const updateTask = asyncHandler(async (req, res) => {
  validateRequestBody(req.body, res);
  const { task, wedding } = await findAccessibleTask(req.params.id, req, res);
  for (const field of editableFields) if (req.body[field] !== undefined) task[field] = req.body[field];
  if (req.body.status) {
    if (!['todo', 'pending', 'in_progress', 'completed'].includes(req.body.status)) {
      res.status(400);
      throw new Error('Invalid task status');
    }
    task.status = req.body.status;
  }
  if (req.body.dueDate !== undefined) task.dueDate = parseDueDate(req.body.dueDate, res);
  validateDueDate(task.dueDate, wedding.weddingDate, res);
  await task.save();
  res.json({ success: true, task });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const { task } = await findAccessibleTask(req.params.id, req, res);
  await task.deleteOne();
  res.json({ success: true, message: 'Task deleted successfully.' });
});

export const listVendorTasks = asyncHandler(async (req, res) => {
  if (req.user.role !== 'vendor') {
    res.status(403);
    throw new Error('Vendor access required');
  }
  const tasks = await Task.find({
    $or: [{ assignedTo: req.user._id }, { vendor: req.user._id }],
  })
    .populate('wedding', 'weddingName weddingDate')
    .populate('createdBy', 'firstName lastName role')
    .sort({ dueDate: 1, createdAt: -1 });
  res.json({ success: true, tasks, summary: summarizeTasks(tasks) });
});

export const updateVendorTask = asyncHandler(async (req, res) => {
  if (req.user.role !== 'vendor') {
    res.status(403);
    throw new Error('Vendor access required');
  }
  const task = mongoose.isValidObjectId(req.params.id)
    ? await Task.findOne({ _id: req.params.id, $or: [{ assignedTo: req.user._id }, { vendor: req.user._id }] })
    : null;
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  const next = req.body.status;
  if (!['todo', 'pending', 'in_progress', 'completed'].includes(next)) {
    res.status(400);
    throw new Error('Vendors can only update task status');
  }
  task.status = next;
  await task.save();
  res.json({ success: true, task });
});
