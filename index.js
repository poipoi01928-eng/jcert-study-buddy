import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const port = Number(process.env.PORT || 8787);

function aiClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error('Gemini API key is missing on the server. Add GEMINI_API_KEY to the server environment.');
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'JCERT Study Buddy AI' }));

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a PDF file first.' });
  try {
    const parser = new PDFParse({ data: req.file.buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const text = (parsed.text || '').trim();
    if (!text) return res.status(422).json({ error: 'I could not find selectable text in this PDF. Try a text-based PDF or a clearer copy.' });
    if (text.length > 180000) return res.status(413).json({ error: 'This chapter is very large. Please upload one chapter or a smaller PDF.' });
    res.json({ name: req.file.originalname.replace(/\.pdf$/i, ''), subject: 'Class 9', text, pages: parsed.total });
  } catch (err) {
    console.error('PDF error:', err);
    res.status(422).json({ error: 'Could not read this PDF. Please try another PDF file.' });
  }
});

app.post('/api/study', async (req, res) => {
  try {
    const { task, language = 'both', chapterText = '', chapterName = '', subject = '', question = '', topic = '', image, mimeType } = req.body || {};
    const langInstruction = language === 'hindi' ? 'Reply in simple Hindi.' : language === 'english' ? 'Reply in simple English.' : 'Reply in a natural mix of simple Hindi and English (Hinglish), keeping key academic terms in English and explaining them simply.';
    const chapterContext = chapterText ? `\n\nUPLOADED TEXTBOOK CHAPTER (${chapterName || subject}):\n${chapterText.slice(0, 100000)}\nUse this as the primary reference when relevant. If the answer is not in the chapter, clearly say so and then explain using general Class 9 knowledge.` : '\nNo chapter PDF is currently uploaded. Use general Class 9-level knowledge.';
    let prompt = '';
    if (task === 'solve') prompt = `You are a patient Class 9 JCERT teacher. Solve the student's question step by step. Explain what is given, what is asked, the formula/rule used, each calculation, and the final answer. For non-maths doubts, explain in small clear steps. Do not skip reasoning. ${langInstruction}${chapterContext}\nSTUDENT QUESTION: ${question || 'Read the attached image and solve the problem.'}`;
    else if (task === 'notes') prompt = `Create useful Class 9 chapter notes from the uploaded textbook. Organize with headings: 1) Chapter overview 2) Important definitions 3) Important formulas (if any) and what each symbol means 4) Key points in bullets 5) Important exam reminders. Be accurate and do not invent facts. ${langInstruction}${chapterContext}`;
    else if (task === 'explain') prompt = `Act as a friendly Class 9 teacher. Explain this topic from the very beginning as if the student is new to it. Use a simple definition, step-by-step explanation, relatable examples, a small recap, and 3 quick questions to check understanding. Explain the uploaded chapter too if it is relevant. ${langInstruction}${chapterContext}\nTOPIC: ${topic}`;
    else if (task === 'quiz') prompt = `Create exactly 5 Class 9 multiple-choice questions. Base them on the uploaded chapter if provided; otherwise use the topic. Mix easy and medium questions. Return ONLY valid JSON, no markdown, with this exact shape: {"questions":[{"question":"...","options":["A...","B...","C...","D..."],"answerIndex":0,"explanation":"..."}]}. answerIndex must be 0,1,2,or 3. Explanations should teach, not just say correct. ${langInstruction}${chapterContext}\nTOPIC: ${topic || 'the uploaded chapter'}`;
    else return res.status(400).json({ error: 'Unknown study task.' });

    const ai = aiClient();
    const parts = [{ text: prompt }];
    if (image && mimeType?.startsWith('image/')) parts.push({ inlineData: { data: image, mimeType } });
    const response = await ai.models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', contents: [{ role: 'user', parts }] });
    const output = response.text || '';
    if (task === 'quiz') {
      const cleaned = output.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const quiz = JSON.parse(cleaned);
      return res.json({ quiz });
    }
    res.json({ text: output });
  } catch (err) {
    console.error('AI error:', err);
    const message = err?.message?.includes('API key') ? err.message : 'The AI request failed. Check your Gemini API key, model name and internet connection, then try again.';
    res.status(500).json({ error: message });
  }
});

app.listen(port, '0.0.0.0', () => console.log(`JCERT Study Buddy API listening on ${port}`));
