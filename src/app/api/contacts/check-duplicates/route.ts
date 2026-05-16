/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db/connection';
import Contact, { IContact } from '@/app/models/Contact';
import User from '@/app/models/User';
import Pipeline from '@/app/models/Pipeline';
import Stage from '@/app/models/Stage';

interface ContactPayload {
  contacts: Partial<IContact>[];
}

export async function POST(request: Request) {
  try {
    const { contacts }: ContactPayload = await request.json();

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty contacts array' },
        { status: 400 }
      );
    }

    const incomingEmails = contacts
      .map((contact) => contact.email?.trim().toLowerCase())
      .filter((email): email is string => !!email);

    if (incomingEmails.length !== contacts.length) {
      return NextResponse.json(
        { error: 'All contacts must have an email' },
        { status: 400 }
      );
    }
    User
    Pipeline
    Stage
    await dbConnect();

    const existingContacts = await Contact.find({
      email: { $in: incomingEmails },
    })
      .collation({ locale: 'en', strength: 2 })
      .select('email assignedTo');
    console.log(existingContacts.length);

    const existingEmails = new Set(existingContacts.map((contact) => contact.email.toLowerCase()));

    const duplicateContacts = contacts.filter((contact) => {
      const isEmailDuplicate = existingEmails.has(contact.email!.toLowerCase());
      const hasAssignedUsers = Array.isArray(contact.assignedTo) && contact.assignedTo.length > 0;
      const existingContact = existingContacts.find(
        (c) => c.email.toLowerCase() === contact.email!.toLowerCase()
      );
      const isExistingAssigned = existingContact
        ? Array.isArray(existingContact.assignedTo) && existingContact.assignedTo.length > 0
        : false;

      return isEmailDuplicate || hasAssignedUsers || isExistingAssigned;
    });

    const newContacts = contacts.filter(
      (contact) => !duplicateContacts.includes(contact)
    );

    const response = {
      totalContacts: contacts.length,
      duplicateCount: duplicateContacts.length,
      newCount: newContacts.length,
      duplicates: duplicateContacts.map((contact) => ({
        email: contact.email,
        name: contact.name,
        phone: contact.phone,
      })),
      newContacts: newContacts.map((contact) => ({
        email: contact.email,
        name: contact.name,
        phone: contact.phone,
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error checking duplicate contacts:', error);
    return NextResponse.json(
      { error: 'Failed to process contacts', details: error.message },
      { status: 500 }
    );
  }
}