import mongoose from "mongoose";
import User from "../models/user";
import Organization from "../models/organization";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const updateUsersWithOrganization = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/golder_hr");
    console.log("Connected to MongoDB");

    // Get all users without organization
    const usersWithoutOrg = await User.find({ 
      organization: { $in: [null, undefined] },
      isdeleted: false 
    });
    
    console.log(`Found ${usersWithoutOrg.length} users without organization`);

    if (usersWithoutOrg.length === 0) {
      console.log("All users already have organization assigned");
      return;
    }

    // Get the first organization (IT Department) as default
    const defaultOrg = await Organization.findOne({ 
      code: "IT",
      isActive: true,
      isdeleted: false 
    });

    if (!defaultOrg) {
      console.log("No default organization found. Please run seedOrganizations first.");
      return;
    }

    console.log(`Using ${defaultOrg.name} as default organization`);

    // Update all users without organization
    const updateResult = await User.updateMany(
      { 
        organization: { $in: [null, undefined] },
        isdeleted: false 
      },
      { 
        organization: defaultOrg._id 
      }
    );

    console.log(`Updated ${updateResult.modifiedCount} users with default organization`);

    // Show updated users
    const updatedUsers = await User.find({ 
      organization: defaultOrg._id,
      isdeleted: false 
    }).select("fullname email");

    console.log("Updated users:");
    updatedUsers.forEach(user => {
      console.log(`- ${user.fullname} (${user.email})`);
    });

    console.log("Update completed successfully!");
  } catch (error) {
    console.error("Error updating users:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run the update function
if (require.main === module) {
  updateUsersWithOrganization();
}

export default updateUsersWithOrganization;
