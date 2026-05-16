import mongoose from 'mongoose';

interface UpdateContactBody {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  tags?: string[];
}

export function validateUpdateContact(id: string, body: UpdateContactBody): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid contact ID');
  }

  const { name, email, phone } = body;
  if (!name || !email || !phone) {
    throw new Error('Missing required fields: name, email, phone');
  }
}