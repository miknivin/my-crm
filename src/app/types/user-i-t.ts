export interface IUser {
    _id: string;
    name?: string;
    email: string;
    password?: string;
    avatar?: {
      public_id: string;
      url: string;
    };
    uid?: number;
    role: 'user' | 'employee' | 'admin';
    resetPasswordToken?: string;
    resetPasswordExpire?: Date;
    signupMethod: 'OTP' | 'Email/Password' | 'OAuth';
    createdAt?: Date;
    updatedAt?: Date;
  }