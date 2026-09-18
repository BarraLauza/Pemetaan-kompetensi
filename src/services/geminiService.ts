import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export async function analyzeTalentData(promptText: string, dataKaryawan: any) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // atau model lain yang sesuai
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${promptText}\n\nData Karyawan:\n${JSON.stringify(dataKaryawan)}` }
          ]
        }
      ]
    });
    return response.text;
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return 'Gagal memproses analisis AI. Pastikan API Key valid.';
  }
}
