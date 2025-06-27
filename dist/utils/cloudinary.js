"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = void 0;
// File: src/utils/cloudinary.ts
const cloudinary_1 = require("cloudinary");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const uploadToCloudinary = async (file, folder = "employee_faces") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({ folder, resource_type: "image" }, (error, result) => {
            if (error)
                return reject(error);
            resolve(result?.secure_url || "");
        });
        stream.end(file);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
