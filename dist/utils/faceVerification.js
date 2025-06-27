"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyFace = void 0;
const axios_1 = __importDefault(require("axios"));
const verifyFace = async (capturedImageUrl, referenceImageUrl) => {
    try {
        const response = await axios_1.default.post('http://localhost:5000/verify', {
            capturedImageUrl,
            referenceImageUrl,
        });
        return response.data.match;
    }
    catch (error) {
        throw new Error('Lỗi khi gọi API xác thực khuôn mặt');
    }
};
exports.verifyFace = verifyFace;
