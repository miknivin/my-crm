import { toast } from 'react-toastify';
import { IContact } from '@/app/models/Contact';

// Validates an array of contacts for phone and email fields
export const validateContacts = (contacts: Partial<IContact>[]): boolean => {
  const invalidContacts: { contact: Partial<IContact>; errors: string[] }[] = [];
  
  contacts.forEach((contact, index) => {
    const errors: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const identifier = contact.email || contact.name || `contact ${index + 1}`;

    // Validate phone (more than 5 digits)
    if (contact.phone) {
      const digits = contact.phone.replace(/\D/g, ''); // Remove non-digits
      if (!/^\d{6,}$/.test(digits)) {
        errors.push(`Invalid phone format: ${contact.phone} (must have more than 5 digits)`);
      }
    }

    // Validate email (non-empty string)
    if (contact.email) {
      if (typeof contact.email !== 'string' || contact.email.trim() === '') {
        errors.push(`Invalid email: ${contact.email} (must be a non-empty string)`);
      }
    }

    if (errors.length > 0) {
      invalidContacts.push({ contact, errors });
    }
  });

  // Display warnings for invalid contacts
  if (invalidContacts.length > 0) {
    invalidContacts.forEach(({ contact, errors }) => {
      const identifier = contact.email || contact.name || 'contact';
      errors.forEach((error) => {
        toast.warning(`Failed to process ${identifier}: ${error}`);
      });
    });
    return false;
  }

  return true;
};