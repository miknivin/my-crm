// scripts/migrate-contact-order.ts
import mongoose from "mongoose";
import dbConnect from "../db/connection";
import Contact from "@/app/models/Contact";


async function migrateContactOrder() {
  try {
    // Connect to the database
    await dbConnect();
    console.log("Connected to MongoDB");

    // Fetch all contacts
    const contacts = await Contact.find({});
    console.log(`Found ${contacts.length} contacts to migrate`);

    let updatedCount = 0;

    // Iterate through each contact
    for (const contact of contacts) {
      let needsUpdate = false;

      // Check each pipelinesActive entry
      for (let i = 0; i < contact.pipelinesActive.length; i++) {
        if (typeof contact.pipelinesActive[i].order === "undefined") {
          contact.pipelinesActive[i].order = i; // Set order based on current index
          needsUpdate = true;
        }
      }

      // Save the contact if updates were made
      if (needsUpdate) {
        await contact.save();
        updatedCount++;
        console.log(`Updated contact ${contact._id} with order values`);
      }
    }

    console.log(`Migration completed. Updated ${updatedCount} contacts.`);
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

migrateContactOrder().catch((error) => {
  console.error("Error running migration:", error);
  process.exit(1);
});