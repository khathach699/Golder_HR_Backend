import { Schema, model, Document } from "mongoose";
import bcrypt from "bcrypt";
const mongoosePaginate = require("mongoose-paginate-v2");
import { IUserDocument } from "../types/user";

const userSchema = new Schema<IUserDocument>(
  {
    fullname: { type: String, required: true },
    password: { type: String, required: true },
    avatar: { type: String },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    department: { type: String },
    position: { type: String },
    point: { type: Number, default: 0 },
    isdisable: { type: Boolean, default: false },
    role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    referenceImageUrl: { type: String, default: null },
    otpCode: { type: String },
    otpExpires: { type: Number },
    isdeleted: { type: Boolean, default: false },
    IdMapper: { type: Number, default: null },
    CodeMapper: { type: String, maxlength: 50, default: null },
  },
  { timestamps: true }
);

userSchema.plugin(mongoosePaginate);

userSchema.pre("save", async function (this: IUserDocument, next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

export default model<IUserDocument>("User", userSchema);
