/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from "@/app/lib/db/connection";
import Contact from "@/app/models/Contact";
import User from "@/app/models/User";
import mongoose from "mongoose";

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFrom = <T,>(list: T[]) => list[randomInt(0, list.length - 1)];

const randomDateWithinDays = (days: number) => {
  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - days);
  const ts = randomInt(past.getTime(), now.getTime());
  return new Date(ts);
};

const sampleFirst = ["Aarav", "Meera", "Dev", "Anaya", "Vikram", "Priya", "Kiran", "Neha", "Rohan", "Sana"];
const sampleLast = ["Patel", "Sharma", "Iyer", "Das", "Singh", "Kumar", "Gupta", "Nair", "Joshi", "Rao"];
const sampleSource = ["website", "referral", "campaign", "manual"];

async function getSeedUserId() {
  const envId = process.env.SEED_USER_ID;
  if (envId && mongoose.isValidObjectId(envId)) {
    return new mongoose.Types.ObjectId(envId);
  }

  const admin = await User.findOne({ role: "admin" }).select("_id");
  if (admin?._id) return new mongoose.Types.ObjectId(String(admin._id));

  throw new Error("No admin user found. Set SEED_USER_ID env var.");
}

async function seedContacts(count: number) {
  await dbConnect();
  const userId = await getSeedUserId();

  const payload = Array.from({ length: count }).map((_, idx) => {
    const first = randomFrom(sampleFirst);
    const last = randomFrom(sampleLast);
    const name = `${first} ${last}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}.${idx}@example.com`;
    const phone = `9${randomInt(100000000, 999999999)}`;
    const createdAt = randomDateWithinDays(180);
    const updatedAt = randomDateWithinDays(30);

    return {
      name,
      email,
      phone,
      user: userId,
      source: randomFrom(sampleSource),
      value: randomInt(1000, 50000),
      probability: randomInt(10, 95),
      createdAt,
      updatedAt,
    };
  });

  await Contact.insertMany(payload);
  console.log(`Seeded ${count} contacts`);
}

const count = Number(process.env.SEED_CONTACT_COUNT || 200);
seedContacts(count)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
