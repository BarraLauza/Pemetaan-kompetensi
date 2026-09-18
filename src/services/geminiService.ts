import { GoogleGenAI } from '@google/genai';

export async function analyzeTalentData(promptText: string, dataKaryawan: any) {
  try {
    // Ambil API Key langsung dari environment variable Vite di browser
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
    
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY belum terbaca di environment browser.');
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
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
    throw error;
  }
}
