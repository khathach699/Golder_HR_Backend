import mongoose from "mongoose";
import User from "../models/user";
import Organization from "../models/organization";
import DepartmentSalary from "../models/departmentSalary";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const seedDepartmentSalaries = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/golder_hr");
    console.log("Connected to MongoDB");

    // Clear existing department salaries
    await DepartmentSalary.deleteMany({});
    console.log("Cleared existing department salaries");

    // Get all active users
    const users = await User.find({ 
      isdeleted: false, 
      isdisable: false 
    }).select("_id fullname");

    // Get all organizations
    const organizations = await Organization.find({ 
      isActive: true, 
      isdeleted: false, 
      isdisable: false 
    }).select("_id name code");

    if (users.length === 0 || organizations.length === 0) {
      console.log("No users or organizations found");
      return;
    }

    console.log(`Found ${users.length} users and ${organizations.length} organizations`);

    const departmentSalaries = [];

    // Create department salary records for each user
    for (const user of users) {
      // Set first organization as default with higher rate
      const defaultOrg = organizations[0];
      departmentSalaries.push({
        employeeId: user._id,
        departmentId: defaultOrg._id,
        hourlyRate: 75000, // 75k VND/hour for default department
        isDefault: true,
        isActive: true,
        effectiveFrom: new Date(),
      });

      // Add additional departments with different rates
      if (organizations.length > 1) {
        const secondOrg = organizations[1];
        departmentSalaries.push({
          employeeId: user._id,
          departmentId: secondOrg._id,
          hourlyRate: 60000, // 60k VND/hour for secondary department
          isDefault: false,
          isActive: true,
          effectiveFrom: new Date(),
        });
      }

      if (organizations.length > 2) {
        const thirdOrg = organizations[2];
        departmentSalaries.push({
          employeeId: user._id,
          departmentId: thirdOrg._id,
          hourlyRate: 55000, // 55k VND/hour for third department
          isDefault: false,
          isActive: true,
          effectiveFrom: new Date(),
        });
      }
    }

    // Insert department salaries
    const createdSalaries = await DepartmentSalary.insertMany(departmentSalaries);
    console.log(`Created ${createdSalaries.length} department salary records`);

    // Show summary
    const summary = await DepartmentSalary.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "employeeId",
          foreignField: "_id",
          as: "employee"
        }
      },
      {
        $lookup: {
          from: "organizations",
          localField: "departmentId",
          foreignField: "_id",
          as: "department"
        }
      },
      {
        $project: {
          employeeName: { $arrayElemAt: ["$employee.fullname", 0] },
          departmentName: { $arrayElemAt: ["$department.name", 0] },
          hourlyRate: 1,
          isDefault: 1
        }
      },
      { $limit: 10 }
    ]);

    console.log("\nSample department salary records:");
    summary.forEach(record => {
      console.log(`- ${record.employeeName} @ ${record.departmentName}: ${record.hourlyRate} VND/hour ${record.isDefault ? '(Default)' : ''}`);
    });

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Error seeding department salaries:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run the seed function
if (require.main === module) {
  seedDepartmentSalaries();
}

export default seedDepartmentSalaries;
