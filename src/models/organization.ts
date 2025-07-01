import { Schema, model, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  description?: string;
  code?: string;
  isActive: boolean;
  isdeleted: boolean;
  isdisable: boolean;
  parentId?: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  IdMapper?: number;
  CodeMapper?: string;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isdeleted: {
      type: Boolean,
      default: false,
    },
    isdisable: {
      type: Boolean,
      default: false,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    IdMapper: {
      type: Number,
      default: null,
    },
    CodeMapper: {
      type: String,
      maxlength: 50,
      default: null,
    },
  },
  { timestamps: true }
);

organizationSchema.index({ name: 1 });
organizationSchema.index({ isActive: 1, isdeleted: 1, isdisable: 1 });
organizationSchema.index({ parentId: 1 });

export default model<IOrganization>("Organization", organizationSchema);
