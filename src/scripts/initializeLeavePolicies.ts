import mongoose from "mongoose";
import LeavePolicy, { DEFAULT_LEAVE_POLICIES } from "../models/leavePolicy";
import { config } from "dotenv";

// Load environment variables
config();

async function initializeLeavePolicies() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/golder_hr";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Check if policies already exist
    const existingPolicies = await LeavePolicy.find();
    
    if (existingPolicies.length > 0) {
      console.log("📋 Leave policies already exist:");
      existingPolicies.forEach(policy => {
        console.log(`   - ${policy.leaveType}: ${policy.maxDaysPerYear} days/year, ${policy.maxDaysPerRequest} days/request`);
      });
      
      // Ask if user wants to update
      console.log("\n🔄 Do you want to update existing policies? (This will replace all existing policies)");
      console.log("   Type 'yes' to continue or any other key to exit:");
      
      // For script execution, we'll skip the interactive part and just show info
      console.log("   Skipping update. Use the admin API endpoint to update policies.");
      await mongoose.disconnect();
      return;
    }

    // Insert default policies
    console.log("🚀 Initializing default leave policies...");
    await LeavePolicy.insertMany(DEFAULT_LEAVE_POLICIES);
    
    console.log("✅ Successfully initialized leave policies:");
    DEFAULT_LEAVE_POLICIES.forEach(policy => {
      console.log(`   - ${policy.leaveType}: ${policy.maxDaysPerYear} days/year, ${policy.maxDaysPerRequest} days/request, ${policy.advanceNoticeDays} days notice`);
    });

    console.log("\n📊 Leave Policy Summary:");
    console.log("┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐");
    console.log("│ Leave Type  │ Max/Year    │ Max/Request │ Notice Days │ Carry Over  │");
    console.log("├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤");
    
    DEFAULT_LEAVE_POLICIES.forEach(policy => {
      const type = policy.leaveType.padEnd(11);
      const maxYear = policy.maxDaysPerYear.toString().padEnd(11);
      const maxRequest = policy.maxDaysPerRequest.toString().padEnd(11);
      const notice = policy.advanceNoticeDays.toString().padEnd(11);
      const carryOver = (policy.carryOverDays || 0).toString().padEnd(11);
      
      console.log(`│ ${type} │ ${maxYear} │ ${maxRequest} │ ${notice} │ ${carryOver} │`);
    });
    
    console.log("└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘");

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    console.log("\n🎉 Leave policies initialization completed successfully!");
    
  } catch (error) {
    console.error("❌ Error initializing leave policies:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  initializeLeavePolicies();
}

export default initializeLeavePolicies;
