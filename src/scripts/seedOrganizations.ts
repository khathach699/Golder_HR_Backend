import mongoose from "mongoose";
import Organization from "../models/organization";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const seedOrganizations = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/golder_hr");
    console.log("Connected to MongoDB");

    // Clear existing organizations
    await Organization.deleteMany({});
    console.log("Cleared existing organizations");

    // Sample organizations/departments
    const organizations = [
      {
        name: "IT Department",
        description: "Information Technology Department",
        code: "IT",
        isActive: true,
        isdeleted: false,
        isdisable: false,
      },
      {
        name: "HR Department", 
        description: "Human Resources Department",
        code: "HR",
        isActive: true,
        isdeleted: false,
        isdisable: false,
      },
      {
        name: "Finance Department",
        description: "Finance and Accounting Department", 
        code: "FIN",
        isActive: true,
        isdeleted: false,
        isdisable: false,
      },
      {
        name: "Marketing Department",
        description: "Marketing and Sales Department",
        code: "MKT", 
        isActive: true,
        isdeleted: false,
        isdisable: false,
      },
      {
        name: "Operations Department",
        description: "Operations and Production Department",
        code: "OPS",
        isActive: true,
        isdeleted: false,
        isdisable: false,
      },
      {
        name: "Customer Service",
        description: "Customer Support Department",
        code: "CS",
        isActive: true,
        isdeleted: false,
        isdisable: false,
      }
    ];

    // Insert organizations
    const createdOrganizations = await Organization.insertMany(organizations);
    console.log(`Created ${createdOrganizations.length} organizations:`);
    createdOrganizations.forEach(org => {
      console.log(`- ${org.name} (${org.code})`);
    });

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Error seeding organizations:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run the seed function
if (require.main === module) {
  seedOrganizations();
}

export default seedOrganizations;
