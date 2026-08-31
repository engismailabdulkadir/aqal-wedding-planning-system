import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { tryNormalizePhone } from '../utils/phone.js';
import { normalizeUsername } from '../utils/validation.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;
const PASSWORD_SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [USERNAME_PATTERN, 'Username can only contain letters, numbers, dots, and underscores'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [EMAIL_PATTERN, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    phoneNormalized: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'groom', 'bride', 'wedding_planner', 'vendor'],
      required: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'blocked'],
      default: 'active',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_document, returnedObject) => {
        delete returnedObject.password;
        delete returnedObject.__v;
        delete returnedObject.phoneNormalized;
        return returnedObject;
      },
    },
  },
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    name: 'email_1_partial_unique',
    partialFilterExpression: { email: { $type: 'string' } },
  },
);

userSchema.index(
  { phoneNormalized: 1 },
  {
    unique: true,
    name: 'phoneNormalized_1_partial_unique',
    partialFilterExpression: { phoneNormalized: { $type: 'string' } },
  },
);

userSchema.pre('validate', function normalizeUserFields() {
  if (this.username) this.username = normalizeUsername(this.username);

  if (this.email === '' || this.email === null || this.email === undefined) {
    this.email = undefined;
    if (this._doc) delete this._doc.email;
  } else {
    this.email = String(this.email).trim().toLowerCase();
  }

  const rawPhone = this.phone == null ? '' : String(this.phone).trim();
  this.phone = rawPhone;
  const normalizedPhone = rawPhone ? tryNormalizePhone(rawPhone) : null;
  if (normalizedPhone) {
    this.phoneNormalized = normalizedPhone;
  } else {
    this.phoneNormalized = undefined;
    if (this._doc) delete this._doc.phoneNormalized;
  }
});

userSchema.pre('save', function syncAccountStatusFields() {
  if (this.accountStatus) {
    this.isActive = this.accountStatus === 'active';
    return;
  }
  this.accountStatus = this.isActive ? 'active' : 'blocked';
});

userSchema.pre('save', async function hashModifiedPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, PASSWORD_SALT_ROUNDS);
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
