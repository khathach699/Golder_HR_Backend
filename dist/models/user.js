"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoosePaginate = require("mongoose-paginate-v2");
const userSchema = new mongoose_1.Schema({
    fullname: { type: String, required: true },
    password: { type: String, required: true },
    avatar: { type: String },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    department: { type: String },
    position: { type: String },
    point: { type: Number, default: 0 },
    isdisable: { type: Boolean, default: false },
    role: { type: mongoose_1.Schema.Types.ObjectId, ref: "Role", required: true },
    organization: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        default: null,
    },
    referenceImageUrl: { type: String, default: null },
    otpCode: { type: String },
    otpExpires: { type: Number },
    isdeleted: { type: Boolean, default: false },
    IdMapper: { type: Number, default: null },
    CodeMapper: { type: String, maxlength: 50, default: null },
}, { timestamps: true });
userSchema.plugin(mongoosePaginate);
userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt_1.default.hash(this.password, 10);
    }
    next();
});
exports.default = (0, mongoose_1.model)("User", userSchema);
