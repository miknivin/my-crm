import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Interface for User document
export interface IUser {
  _id?:string
  name?: string;
  email: string;
  password?: string;
  avatar?: {
    public_id: string;
    url: string;
  };
  uid?: number;
  phone?: string;
  role: 'user' | 'employee' | 'team_member' | 'admin';
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  isNot?:boolean;
  signupMethod: 'OTP' | 'Email/Password' | 'OAuth';
  getJwtToken: () => string;
  comparePassword: (enteredPassword: string) => Promise<boolean>;
  getResetPasswordToken: () => string;
}

function generateRandomUid(): number {
  return Math.floor(100000 + Math.random() * 900000);
}

const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [false, "Please enter your name"],
      maxlength: [50, "Your name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
      validate: {
        validator: function (value: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: "Please enter a valid email address",
      },
    },
    phone: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: [false, "Please Enter your Password"],
      minlength: [6, "Your Password must be longer than 6 characters"],
      select: false,
    },
    avatar: {
      public_id: String,
      url: String,
    },
    uid: {
      type: Number,
      required: false,
    },
    role: {
      type: String,
      enum: ['user', 'employee','team_member' ,'admin'],
      default: 'user',
      immutable: true,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    signupMethod: {
      type: String,
      enum: ["OTP", "Email/Password", "OAuth"],
      default: "Email/Password",
    },
  },
  { timestamps: true }
);

// Pre-save hook for password hashing and UID generation
userSchema.pre('save', async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  if (this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  if (!this.uid) {
    this.uid = generateRandomUid();
  }

  next();
});

// Method to generate JWT token
userSchema.methods.getJwtToken = function (): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
  
    return jwt.sign(
      { id: this._id },
      secret as jwt.Secret,
      {
        expiresIn: process.env.JWT_EXPIRES_TIME || "7d",
      } as jwt.SignOptions
    );
  };

// Method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate password reset token
userSchema.methods.getResetPasswordToken = function (): string {
  const resetToken = crypto.randomBytes(20).toString('hex');

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000);
  return resetToken;
};

// Create and export User model
const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema); 

export default User;