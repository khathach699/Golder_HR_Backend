import axios from 'axios';

export const verifyFace = async (capturedImageUrl: string, referenceImageUrl: string): Promise<boolean> => {
  try {
    const response = await axios.post('http://localhost:5000/verify', {
      capturedImageUrl,
      referenceImageUrl,
    });
    return response.data.match;
  } catch (error) {
    throw new Error('Lỗi khi gọi API xác thực khuôn mặt');
  }
};