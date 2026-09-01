import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { tryNormalizePhone } from '../utils/phone.js';
import { normalizeUsername } from '../utils/validation.js';

// Email-ka waa inuu leeyahay format sax ah
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Username:
// - 3 ilaa 30 characters
// - letters
// - numbers
// - dot
// - underscore
const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;

// Tirada bcrypt salt rounds.
// Password-ka waxaa lagu hash gareynayaa 12 rounds.
const PASSWORD_SALT_ROUNDS = 12;


// ============================================================
// USER SCHEMA
// ============================================================

const userSchema = new mongoose.Schema(
  {
    // First name-ka user-ka
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },

    // Last name-ka user-ka
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },

    // Username-ka unique ayuu yahay
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [
        USERNAME_PATTERN,
        'Username can only contain letters, numbers, dots, and underscores',
      ],
    },

    // Email-ka user-ka
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [EMAIL_PATTERN, 'Please provide a valid email address'],
    },

    // Phone number-ka user-ka
    phone: {
      type: String,
      trim: true,
      default: '',
    },

    // Phone number normalized ah
    // Waxaa loo isticmaalaa uniqueness/checking.
    phoneNormalized: {
      type: String,
      trim: true,
    },

    // Password-ka user-ka
    // select: false = password-ka si default ah database-ka lagama soo qaado
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },

    // Role-ka user-ka
    role: {
      type: String,
      enum: [
        'admin',
        'groom',
        'bride',
        'wedding_planner',
        'vendor',
      ],
      required: true,
    },

    // Sawirka user-ka
    avatar: {
      type: String,
      default: null,
    },

    // Xaaladda account-ka
    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'blocked'],
      default: 'active',
    },

    // Boolean muujinaya account active/inactive
    isActive: {
      type: Boolean,
      default: true,
    },

    // Muujinaya in account-ka la verify gareeyay
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Waqtigii ugu dambeeyay ee login-ka
    lastLogin: {
      type: Date,
      default: null,
    },
  },

  {
    // createdAt iyo updatedAt si automatic ah ayaa loo sameynayaa
    timestamps: true,

    // Marka user-ka JSON loo beddelayo
    // xogaha xasaasiga ah waa la tirtirayaa
    toJSON: {
      transform: (_document, returnedObject) => {

        // Password-ka frontend-ka ha loo dirin
        delete returnedObject.password;

        // Mongoose version field-ka ha loo dirin
        delete returnedObject.__v;

        // Normalized phone-ka ha loo dirin
        delete returnedObject.phoneNormalized;

        return returnedObject;
      },
    },
  },
);


// ============================================================
// EMAIL UNIQUE INDEX
// ============================================================

// Laba user ma wada yeelan karaan email isku mid ah.
// Partial index wuxuu oggolaanayaa user aan email lahayn.
userSchema.index(
  { email: 1 },
  {
    unique: true,
    name: 'email_1_partial_unique',
    partialFilterExpression: {
      email: { $type: 'string' },
    },
  },
);


// ============================================================
// PHONE UNIQUE INDEX
// ============================================================

// Phone number normalized ah waa inuu unique noqdaa.
userSchema.index(
  { phoneNormalized: 1 },
  {
    unique: true,
    name: 'phoneNormalized_1_partial_unique',
    partialFilterExpression: {
      phoneNormalized: { $type: 'string' },
    },
  },
);


// ============================================================
// NORMALIZE USER FIELDS
// ============================================================

// Save/validate ka hor xogaha user-ka waa la normalize gareynayaa.
userSchema.pre(
  'validate',
  function normalizeUserFields() {

    // Username lowercase iyo format sax ah
    if (this.username) {
      this.username = normalizeUsername(this.username);
    }

    // Haddii email-ku madhan yahay
    if (
      this.email === '' ||
      this.email === null ||
      this.email === undefined
    ) {
      this.email = undefined;

      if (this._doc) delete this._doc.email;

    } else {

      // Email-ka lowercase iyo trim
      this.email = String(this.email).trim().toLowerCase();
    }

    // Phone-ka nadiifi
    const rawPhone =
      this.phone == null
        ? ''
        : String(this.phone).trim();

    this.phone = rawPhone;

    // Phone-ka normalize garee
    const normalizedPhone = rawPhone
      ? tryNormalizePhone(rawPhone)
      : null;

    if (normalizedPhone) {

      // Haddii phone sax yahay, normalized phone kaydi
      this.phoneNormalized = normalizedPhone;

    } else {

      // Haddii phone sax ahayn, normalized field-ka saar
      this.phoneNormalized = undefined;

      if (this._doc) {
        delete this._doc.phoneNormalized;
      }
    }
  }
);


// ============================================================
// ACCOUNT STATUS
// ============================================================

// accountStatus iyo isActive isku mid ha noqdaan.
userSchema.pre(
  'save',
  function syncAccountStatusFields() {

    if (this.accountStatus) {

      // active = true
      // inactive/blocked = false
      this.isActive = this.accountStatus === 'active';

      return;
    }

    // Haddii accountStatus uusan jirin
    this.accountStatus = this.isActive
      ? 'active'
      : 'blocked';
  }
);


// ============================================================
// PASSWORD HASHING
// ============================================================

// Save ka hor password-ka plain text-ka ah bcrypt ayaa hash gareynaya.
userSchema.pre(
  'save',
  async function hashModifiedPassword() {

    // Haddii password-ka aan la beddelin waxba ha sameyn
    if (!this.isModified('password')) return;

    // Password-ka hash garee
    this.password = await bcrypt.hash(
      this.password,
      PASSWORD_SALT_ROUNDS
    );
  }
);


// ============================================================
// COMPARE PASSWORD
// ============================================================

// Function-kan wuxuu barbar dhigaa password-ka user-ku qoray
// iyo password-ka hash-ka ah ee database-ka yaalla.
userSchema.methods.comparePassword =
  async function comparePassword(candidatePassword) {

    // Haddii password uusan jirin
    if (!this.password) return false;

    // bcrypt ayaa labada password isbarbar dhigaya
    return bcrypt.compare(
      candidatePassword,
      this.password
    );
  };


// User model-ka samee
const User = mongoose.model('User', userSchema);

export default User;