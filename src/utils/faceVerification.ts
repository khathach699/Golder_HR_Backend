// File: src/utils/faceVerification.ts
import axios from 'axios';

export const verifyFace = async (capturedImageUrl: string, referenceImageUrl: string): Promise<boolean> => {
  try {
    const response = await axios.post(
      process.env.PYTHON_API_URL!,
      {
        capturedImageUrl,
        referenceImageUrl,
      },
      { timeout: 10000 } // 10s timeout
    );
    return response.data.match; // Expecting { match: boolean }
  } catch (error) {
    throw new Error('Face verification failed');
  }
};