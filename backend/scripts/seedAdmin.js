import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

const {
  INITIAL_ADMIN_FIRST_NAME: firstName,
  INITIAL_ADMIN_LAST_NAME: lastName,
  INITIAL_ADMIN_USERNAME: username,
  INITIAL_ADMIN_EMAIL: email,
  INITIAL_ADMIN_PASSWORD: password,
} = process.env;

if (!firstName || !lastName || !password) {
  console.error('Set INITIAL_ADMIN_FIRST_NAME, INITIAL_ADMIN_LAST_NAME, and INITIAL_ADMIN_PASSWORD.');
  process.exit(1);
}

const normalizedUsername = (username || email?.split('@')[0] || 'admin').trim().toLowerCase();
const normalizedEmail = email?.trim().toLowerCase() || null;

if (password.length < 4) {
  console.error('INITIAL_ADMIN_PASSWORD must contain at least 4 characters.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI, { dbName: 'wedding_planning' });

try {
  if (await User.exists({ username: normalizedUsername })) {
    console.error('A user with that username already exists.');
    process.exitCode = 1;
  } else if (normalizedEmail && await User.exists({ email: normalizedEmail })) {
    console.error('A user with that email already exists.');
    process.exitCode = 1;
  } else {
    const user = await User.create({
      firstName,
      lastName,
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      role: 'admin',
    });
    console.log(`Initial admin created: ${user.username} (${user.email || 'no email'})`);
  }
} finally {
  await mongoose.disconnect();
}
