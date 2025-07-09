"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const organizationSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { timestamps: true });
organizationSchema.index({ name: 1 });
organizationSchema.index({ isActive: 1, isdeleted: 1, isdisable: 1 });
organizationSchema.index({ parentId: 1 });
exports.default = (0, mongoose_1.model)("Organization", organizationSchema);
