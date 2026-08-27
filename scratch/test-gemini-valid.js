const { GoogleGenAI } = require('@google/genai');

async function testInvalidModel() {
  console.log('Testing invalid model name "Gemini 3.6 Flash"...');
  try {
    const ai = new GoogleGenAI({ apiKey: 'AIzaSyDummyKeyForTest' });
    await ai.models.generateContent({
      model: 'Gemini 3.6 Flash',
      contents: ['test']
    });
  } catch (err) {
    console.log('Error output from Google Gemini API:', err.message || err);
  }
}

testInvalidModel();
