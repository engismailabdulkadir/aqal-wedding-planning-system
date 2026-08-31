import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { validateEnv } from '../src/config/env.js';
import User from '../src/models/User.js';

const TEST_EMAIL = 'testcustomer@example.com';
const TEST_PASSWORD = 'TestPassword123';
let createdUserId;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyUserModel() {
  try {
    validateEnv();
    await connectDatabase();
    await User.init();

    const existingTestUser = await User.findOne({ email: TEST_EMAIL }).lean();
    assert(!existingTestUser, `Verification stopped: ${TEST_EMAIL} already exists and will not be modified`);

    const createdUser = await User.create({
      firstName: 'Test',
      lastName: 'Customer',
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      role: 'customer',
    });
    createdUserId = createdUser._id;
    console.log('PASS: test user created');

    const normalQueryUser = await User.findById(createdUserId);
    assert(normalQueryUser, 'Created user could not be queried');
    assert(normalQueryUser.password === undefined, 'Password was returned by a normal query');
    assert(normalQueryUser.toJSON().password === undefined, 'Password was exposed by JSON serialization');
    console.log('PASS: password is excluded from normal queries and JSON output');

    const userWithPassword = await User.findById(createdUserId).select('+password');
    assert(userWithPassword?.password, 'Password hash could not be explicitly selected');
    assert(userWithPassword.password !== TEST_PASSWORD, 'Plain password was stored');
    assert(userWithPassword.password.startsWith('$2'), 'Stored password is not a bcrypt hash');
    console.log('PASS: stored password is a bcrypt hash, not plaintext');

    const originalHash = userWithPassword.password;
    userWithPassword.firstName = 'Test';
    await userWithPassword.save();
    assert(userWithPassword.password === originalHash, 'Unchanged password was hashed again');
    console.log('PASS: unchanged password is not hashed again');

    assert(await userWithPassword.comparePassword(TEST_PASSWORD), 'Correct password comparison failed');
    assert(!(await userWithPassword.comparePassword('WrongPassword')), 'Incorrect password comparison succeeded');
    console.log('PASS: password comparison accepts the correct password and rejects a wrong password');

    let duplicateRejected = false;
    try {
      await User.create({
        firstName: 'Duplicate',
        lastName: 'Customer',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
    } catch (error) {
      duplicateRejected = error?.code === 11000;
    }
    assert(duplicateRejected, 'Duplicate email was not rejected by the unique index');
    console.log('PASS: duplicate email is rejected');
  } finally {
    if (createdUserId && mongoose.connection.readyState === 1) {
      const cleanup = await User.deleteOne({ _id: createdUserId, email: TEST_EMAIL });
      console.log(`PASS: cleaned up ${cleanup.deletedCount} verification user`);
    }
    await disconnectDatabase();
  }
}

verifyUserModel().catch((error) => {
  console.error(`User model verification failed: ${error.message}`);
  process.exitCode = 1;
});
