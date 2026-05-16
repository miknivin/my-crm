/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import mongoose, { Types } from 'mongoose';
import dbConnect from '@/app/lib/db/connection';
import Contact, { IContact } from '@/app/models/Contact';
import User from '@/app/models/User';
import { authorizeRoles, isAuthenticatedUser } from '../../middlewares/auth';
import Pipeline from '@/app/models/Pipeline';
import Stage from '@/app/models/Stage';

interface PayloadContact {
  name: string;
  email: string;
  phone: string;
  tags?: string;
  isDuplicate?: boolean;
  businessName?: string;
}

interface ContactPayload {
  contacts: PayloadContact[];
  assignedUsers: string[];
  assignType: 'every' | 'equally' | 'roundRobin';
  addToPipeline: boolean;
}

const PIPELINE_ID = new mongoose.Types.ObjectId(process.env.DEFAULT_PIPELINE);
const STAGE_ID = new mongoose.Types.ObjectId(process.env.DEFAULT_STAGE);

export async function POST(request: NextRequest) {
  try {
    const currentUser = await isAuthenticatedUser(request);
    authorizeRoles(currentUser, 'admin');
    Pipeline
    Stage
    User
    await dbConnect();

    const payload: ContactPayload = await request.json();

    if (!payload.contacts || !Array.isArray(payload.contacts)) {
      return NextResponse.json({ error: 'Invalid contacts array' }, { status: 400 });
    }
    if (!payload.assignedUsers || !Array.isArray(payload.assignedUsers)) {
      return NextResponse.json({ error: 'Invalid assignedUsers array' }, { status: 400 });
    }
    if (!['every', 'equally', 'roundRobin'].includes(payload.assignType)) {
      return NextResponse.json({ error: 'Invalid assignType' }, { status: 400 });
    }

    const users = await User.find({ _id: { $in: payload.assignedUsers } });
    if (users.length !== payload.assignedUsers.length) {
      return NextResponse.json({ error: 'One or more assignedUsers not found' }, { status: 400 });
    }

    const processedContacts: IContact[] = [];
    const failedContacts: { contact: PayloadContact; error: string }[] = [];

    await Promise.all(
      payload.contacts.map(async (contact, index) => {
        try {
          const requiredFields = ['name', 'email', 'phone'];
          for (const field of requiredFields) {
            if (!contact[field as keyof PayloadContact]) {
              throw new Error(`Missing required field: ${field}`);
            }
          }

          if (!/^[^@]+@[^@]+\.[^@]+$/.test(contact.email)) {
            throw new Error(`Invalid email format: ${contact.email}`);
          }

          if (!/^\+?\d{10,15}$/.test(contact.phone.replace(/[\-\s()]/g, ''))) {
            throw new Error(`Invalid phone format: ${contact.phone}`);
          }

          const assignedTo: { user: Types.ObjectId; time: Date }[] = [];

          if (!contact.isDuplicate) {
            if (payload.assignType === 'every') {
              payload.assignedUsers.forEach((userId) => {
                assignedTo.push({
                  user: new mongoose.Types.ObjectId(userId),
                  time: new Date(),
                });
              });
            } else if (payload.assignType === 'equally') {
              const usersCount = payload.assignedUsers.length;
              const contactsPerUser = Math.floor(payload.contacts.length / usersCount);
              const remainderStartIndex = contactsPerUser * usersCount;

              if (index < remainderStartIndex) {
                const userIndex = Math.floor(index / contactsPerUser);
                assignedTo.push({
                  user: new mongoose.Types.ObjectId(payload.assignedUsers[userIndex]),
                  time: new Date(),
                });
              } else {
                const remainderIndex = index - remainderStartIndex;
                assignedTo.push({
                  user: new mongoose.Types.ObjectId(
                    payload.assignedUsers[remainderIndex % usersCount]
                  ),
                  time: new Date(),
                });
              }
            } else if (payload.assignType === 'roundRobin') {
              assignedTo.push({
                user: new mongoose.Types.ObjectId(
                  payload.assignedUsers[index % payload.assignedUsers.length]
                ),
                time: new Date(),
              });
            }
          }

          const contactData: Partial<IContact> = {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            businessName: contact.businessName || "Nil",
            source: 'bulk_import',
            tags: contact.tags
              ? new mongoose.Types.DocumentArray([
                  {
                    user: new mongoose.Types.ObjectId(currentUser._id),
                    name: contact.tags,
                  },
                ])
              : new mongoose.Types.DocumentArray([]),
            pipelinesActive: payload.addToPipeline
              ? new mongoose.Types.DocumentArray([
                  {
                    pipeline_id: PIPELINE_ID,
                    stage_id: STAGE_ID,
                    order: 0,
                  },
                ])
              : new mongoose.Types.DocumentArray([]),
          };

          if (!contact.isDuplicate) {
            contactData.assignedTo = new mongoose.Types.DocumentArray(assignedTo);
          }

          const updatedContact = await Contact.upsertContact(
            contactData,
            currentUser._id ? new Types.ObjectId(currentUser._id) : new Types.ObjectId("6847dc679c7418164de7d8f3")
          );

          processedContacts.push(updatedContact);
        } catch (error: any) {
          failedContacts.push({
            contact,
            error: error.message || 'Failed to process contact',
          });
        }
      })
    );

    return NextResponse.json(
      {
        message: `Processed ${processedContacts.length} contacts successfully, ${failedContacts.length} failed`,
        contacts: processedContacts,
        failed: failedContacts,
      },
      { status: failedContacts.length > 0 ? 207 : 201 }
    );
  } catch (error: any) {
    console.error('Error processing contacts:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}