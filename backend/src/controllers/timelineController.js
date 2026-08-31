import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import TimelineEvent from '../models/TimelineEvent.js';
import { assertWeddingAccess, loadAccessibleWedding } from '../utils/weddingAccess.js';
import { syncWeddingTimeline, withTimelineDisplay } from '../utils/workspaceOverview.js';

const editable = ['title', 'description', 'dueDate', 'status', 'sortOrder'];

export const listTimeline = asyncHandler(async (req, res) => {
  const wedding = await loadAccessibleWedding(req, res, { required: false });
  if (!wedding) return res.json({ success: true, events: [] });
  const events = await syncWeddingTimeline(wedding._id);
  res.json({ success: true, events: withTimelineDisplay(events) });
});

export const createTimelineEvent = asyncHandler(async (req, res) => {
  if (!['customer', 'planner', 'admin'].includes(req.user.role)) {
    res.status(403);
    throw new Error('Not allowed');
  }
  const wedding = await loadAccessibleWedding(req, res, { write: true });
  const event = await TimelineEvent.create({
    wedding: wedding._id,
    title: req.body.title,
    description: req.body.description,
    dueDate: req.body.dueDate || null,
    status: req.body.status || 'upcoming',
    sortOrder: req.body.sortOrder || 0,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, event });
});

export const updateTimelineEvent = asyncHandler(async (req, res) => {
  const event = mongoose.isValidObjectId(req.params.id) ? await TimelineEvent.findById(req.params.id) : null;
  if (!event) {
    res.status(404);
    throw new Error('Timeline event not found');
  }
  await assertWeddingAccess(req, res, event.wedding, { write: true });
  for (const field of editable) {
    if (req.body[field] !== undefined) event[field] = req.body[field];
  }
  await event.save();
  res.json({ success: true, event });
});

export const deleteTimelineEvent = asyncHandler(async (req, res) => {
  const event = mongoose.isValidObjectId(req.params.id) ? await TimelineEvent.findById(req.params.id) : null;
  if (!event) {
    res.status(404);
    throw new Error('Timeline event not found');
  }
  await assertWeddingAccess(req, res, event.wedding, { write: true });
  await event.deleteOne();
  res.json({ success: true, message: 'Timeline event deleted' });
});
