interface CreateUserRequest {
  name?: string;
  email: string;
  password?: string;
  signupMethod?: 'OTP' | 'Email/Password' | 'OAuth';
  avatar?: {
    public_id: string;
    url: string;
  };
}

export function validateUserInput(body: CreateUserRequest): void {
  const { email, password, signupMethod = 'Email/Password', avatar } = body;

  // Validate required fields
  if (!email) {
    throw new Error('Email is required');
  }

  if (signupMethod === 'Email/Password' && !password) {
    throw new Error('Password is required for Email/Password signup');
  }

  // Validate signupMethod
  if (!['OTP', 'Email/Password', 'OAuth'].includes(signupMethod)) {
    throw new Error('Invalid signup method');
  }

  // Validate avatar if provided
  if (avatar && (!avatar.public_id || !avatar.url)) {
    throw new Error('Avatar must include public_id and url');
  }
}