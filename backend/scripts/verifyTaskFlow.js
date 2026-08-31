import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { validateEnv } from '../src/config/env.js';
import Task from '../src/models/Task.js';
import User from '../src/models/User.js';
import Wedding from '../src/models/Wedding.js';

const API_URL = `http://127.0.0.1:${process.env.PORT || 5000}/api/v1`;
const PASSWORD = 'Phase3EPassword';
const accounts = [
  { firstName: 'Task', lastName: 'Owner', email: 'phase3e.owner@example.com', role: 'customer' },
  { firstName: 'Task', lastName: 'Other', email: 'phase3e.other@example.com', role: 'customer' },
  { firstName: 'No', lastName: 'Wedding', email: 'phase3e.no-wedding@example.com', role: 'customer' },
  { firstName: 'Task', lastName: 'Vendor', email: 'phase3e.vendor@example.com', role: 'vendor' },
  { firstName: 'Task', lastName: 'Planner', email: 'phase3e.planner@example.com', role: 'planner' },
];
const userIds = []; const weddingIds = []; const taskIds = [];
function assert(condition, message) { if (!condition) throw new Error(message); }
async function request(path, { token, ...options } = {}) { const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } }); return { response, data: await response.json() }; }
async function register(account) { const result = await request('/auth/register', { method: 'POST', body: JSON.stringify({ ...account, password: PASSWORD }) }); assert(result.response.status === 201, `Could not register ${account.email}: ${result.data.message}`); userIds.push(result.data.user._id); return result.data; }
async function createWedding(token, name) { const result = await request('/weddings', { method: 'POST', token, body: JSON.stringify({ weddingName: name, partner1Name: 'Partner One', partner2Name: 'Partner Two', weddingDate: '2027-12-20', city: 'Mogadishu', estimatedBudget: 1000, expectedGuests: 100 }) }); assert(result.response.status === 201, `Could not create ${name}`); weddingIds.push(result.data.wedding._id); return result.data.wedding; }

async function verifyTaskFlow() {
  try {
    validateEnv(); await connectDatabase();
    assert(!(await User.exists({ email: { $in: accounts.map(({ email }) => email) } })), 'Verification accounts already exist; existing records were not modified');
    const owner = await register(accounts[0]); const other = await register(accounts[1]); const noWedding = await register(accounts[2]); const vendor = await register(accounts[3]); const planner = await register(accounts[4]);
    const ownerWedding = await createWedding(owner.token, 'Task Owner Wedding'); await createWedding(other.token, 'Task Other Wedding');

    const noWeddingList = await request('/tasks', { token: noWedding.token }); const orphan = await request('/tasks', { method: 'POST', token: noWedding.token, body: JSON.stringify({ title: 'Orphan' }) });
    assert(noWeddingList.response.ok && noWeddingList.data.wedding === null && orphan.response.status === 400, `No-wedding handling failed (GET ${noWeddingList.response.status}: ${JSON.stringify(noWeddingList.data)}, POST ${orphan.response.status}: ${JSON.stringify(orphan.data)})`);
    console.log('PASS: no-wedding state returned and orphan task rejected');

    const dates = ['2020-01-01', '2027-10-15', null, '2027-11-01'];
    const payloads = [
      { title: 'Overdue task', description: 'Find venue', category: 'venue', priority: 'high', dueDate: dates[0], status: 'completed', wedding: weddingIds[1], completedAt: '2020-01-01' },
      { title: 'Upcoming task', category: 'photography', priority: 'medium', dueDate: dates[1] },
      { title: 'No date task', category: 'other', priority: 'low', dueDate: dates[2] },
      { title: 'Complete task', category: 'guests', priority: 'high', dueDate: dates[3] },
    ];
    for (const payload of payloads) { const result = await request('/tasks', { method: 'POST', token: owner.token, body: JSON.stringify(payload) }); assert(result.response.status === 201, `Task creation failed: ${result.data.message}`); assert(result.data.task.wedding === ownerWedding._id && result.data.task.status === 'pending' && result.data.task.completedAt === null, 'Backend trusted protected create fields'); taskIds.push(result.data.task._id); }
    assert(await Task.countDocuments({ _id: { $in: taskIds }, wedding: ownerWedding._id }) === 4, 'Tasks were not stored under the owner wedding');
    console.log('PASS: task creation persisted with server-assigned wedding and pending status');

    const edited = await request(`/tasks/${taskIds[1]}`, { method: 'PATCH', token: owner.token, body: JSON.stringify({ title: 'Updated upcoming task', description: 'Edited', priority: 'high', category: 'catering', wedding: weddingIds[1], completedAt: '2020-01-01' }) });
    const single = await request(`/tasks/${taskIds[1]}`, { token: owner.token });
    assert(edited.response.ok && single.data.task.title === 'Updated upcoming task' && single.data.task.wedding === ownerWedding._id && single.data.task.completedAt === null, 'Single retrieval, edit, or protected fields failed');
    console.log('PASS: single retrieval and editable allowlist work');

    const completed = await request(`/tasks/${taskIds[3]}`, { method: 'PATCH', token: owner.token, body: JSON.stringify({ status: 'completed' }) });
    assert(completed.response.ok && completed.data.task.completedAt, 'Completion did not set completedAt');
    const completedAt = completed.data.task.completedAt;
    const unchanged = await request(`/tasks/${taskIds[3]}`, { method: 'PATCH', token: owner.token, body: JSON.stringify({ title: 'Completed and edited' }) });
    assert(unchanged.data.task.completedAt === completedAt, 'Editing a completed task changed completedAt');
    const reopened = await request(`/tasks/${taskIds[3]}`, { method: 'PATCH', token: owner.token, body: JSON.stringify({ status: 'in_progress', completedAt: '2020-01-01' }) });
    assert(reopened.response.ok && reopened.data.task.completedAt === null && reopened.data.task.status === 'in_progress', 'Reopen did not clear completedAt');
    await request(`/tasks/${taskIds[3]}`, { method: 'PATCH', token: owner.token, body: JSON.stringify({ status: 'completed' }) });
    console.log('PASS: complete, stable completedAt, and reopen logic work');

    const list = await request('/tasks', { token: owner.token });
    assert(list.response.ok && list.data.tasks.length === 4 && list.data.summary.total === 4 && list.data.summary.pending === 3 && list.data.summary.completed === 1 && list.data.summary.inProgress === 0 && list.data.summary.overdue === 1 && list.data.summary.completionPercentage === 25, 'Summary, overdue, or percentage calculation failed');
    assert(list.data.tasks[0]._id === taskIds[0] && list.data.tasks.at(-1)._id === taskIds[3], 'Default task ordering failed');
    console.log('PASS: summary, 25% completion, overdue calculation, and ordering are correct');

    const otherList = await request('/tasks', { token: other.token }); const otherGet = await request(`/tasks/${taskIds[0]}`, { token: other.token }); const otherPatch = await request(`/tasks/${taskIds[0]}`, { method: 'PATCH', token: other.token, body: JSON.stringify({ title: 'Stolen' }) }); const otherDelete = await request(`/tasks/${taskIds[0]}`, { method: 'DELETE', token: other.token });
    assert(otherList.data.tasks.length === 0 && otherGet.response.status === 404 && otherPatch.response.status === 404 && otherDelete.response.status === 404, 'Customer B accessed Customer A task');
    console.log('PASS: Customer A/B list, get, patch, and delete isolation');

    for (const session of [vendor, planner]) { const denied = await request('/tasks', { token: session.token }); assert(denied.response.status === 403, `${session.user.role} accessed tasks`); }
    assert((await request('/tasks')).response.status === 401, 'Anonymous task request accepted');
    console.log('PASS: vendor, planner, and anonymous restrictions');

    const invalidPayloads = [{ title: '   ' }, { title: 'Bad category', category: 'bad' }, { title: 'Bad priority', priority: 'extreme' }, { title: 'Bad date', dueDate: 'not-a-date' }, { title: 'After wedding', dueDate: '2028-01-01' }];
    for (const payload of invalidPayloads) { const result = await request('/tasks', { method: 'POST', token: owner.token, body: JSON.stringify(payload) }); assert(result.response.status === 400, `Invalid payload accepted: ${JSON.stringify(payload)}`); }
    const badStatus = await request(`/tasks/${taskIds[0]}`, { method: 'PATCH', token: owner.token, body: JSON.stringify({ status: 'done' }) }); const invalidId = await request('/tasks/not-an-id', { token: owner.token }); const missing = await request(`/tasks/${new mongoose.Types.ObjectId()}`, { token: owner.token });
    assert(badStatus.response.status === 400 && invalidId.response.status === 400 && missing.response.status === 404, 'Status, invalid ID, or missing task validation failed');
    console.log('PASS: required, enum, date, wedding-date, ID, and missing-task validation');

    const deleted = await request(`/tasks/${taskIds[2]}`, { method: 'DELETE', token: owner.token }); assert(deleted.response.ok, 'Owner delete failed'); taskIds.splice(2, 1);
    const afterDelete = await request('/tasks', { token: owner.token }); assert(afterDelete.data.summary.total === 3 && afterDelete.data.summary.completionPercentage === 33, 'Delete summary did not recalculate');
    console.log('PASS: owner delete and dynamic summary recalculation');
  } finally {
    if (mongoose.connection.readyState === 1) { if (weddingIds.length) await Task.deleteMany({ wedding: { $in: weddingIds } }); if (weddingIds.length) await Wedding.deleteMany({ _id: { $in: weddingIds }, customer: { $in: userIds } }); if (userIds.length) await User.deleteMany({ _id: { $in: userIds }, email: { $in: accounts.map(({ email }) => email) } }); console.log('PASS: cleaned exact Phase 3E test records'); }
    await disconnectDatabase();
  }
}

verifyTaskFlow().catch((error) => { console.error(`Task verification failed: ${error.message}`); process.exitCode = 1; });
