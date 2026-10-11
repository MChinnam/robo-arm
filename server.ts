import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Initialize server-side Gemini client with user-agent header
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Robot Natural Language Command processing endpoint
  app.post('/api/robot/command', async (req, res) => {
    try {
      const { command, currentJoints, currentTcp, blocks } = req.body;
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Command text is required' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          fallback: true,
          message: 'No GEMINI_API_KEY configured; client fallback will handle command.',
        });
      }

      const prompt = `You are an AI Kinematics Motion Controller for a 6-DOF industrial robot arm.
Interpret the following user instruction and return an array of sequential motion steps/keyframes for the robot to execute.

User Instruction: "${command}"

Current Robot Joint Angles:
- J1 (Base Yaw, -180° to 180°): ${currentJoints?.j1 ?? 0}°
- J2 (Shoulder Pitch, -60° to 120°): ${currentJoints?.j2 ?? 35}°
- J3 (Elbow Pitch, -150° to 150°): ${currentJoints?.j3 ?? -40}°
- J4 (Wrist Pitch, -110° to 110°): ${currentJoints?.j4 ?? 5}°
- J5 (Wrist Roll, -180° to 180°): ${currentJoints?.j5 ?? 0}°
- Gripper (0=closed clamp, 100=open): ${currentJoints?.gripper ?? 60}%

Key Coordinate & Pose references:
- "turn right": Increases J1 angle (+35°).
- "turn left": Decreases J1 angle (-35°).
- "down" / "lower": Lowers arm towards table (J2: +18°, J3: +5°, J4: -20°).
- "up" / "raise" / "lift": Raises arm (J2: -20°, J3: -10°, J4: +15°).
- "pick up" / "grab": Hover -> Descend -> Clamp -> Lift.
- "release" / "open gripper": Sets gripper: 90.
- "clamp" / "close gripper": Sets gripper: 15.
- "home": Returns joints to [0, 35, -40, 5, 0, 60].
- "wave": Sequence oscillating J1 and J4.

Provide 1 to 4 sequential keyframe steps. Ensure joint limits are strictly respected.`;

      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: { type: Type.STRING, description: 'Short summary of intent' },
              explanation: { type: Type.STRING, description: 'Explanation of executed trajectory' },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: 'Step description' },
                    joints: {
                      type: Type.OBJECT,
                      properties: {
                        j1: { type: Type.NUMBER },
                        j2: { type: Type.NUMBER },
                        j3: { type: Type.NUMBER },
                        j4: { type: Type.NUMBER },
                        j5: { type: Type.NUMBER },
                        gripper: { type: Type.NUMBER },
                      },
                      required: ['j1', 'j2', 'j3', 'j4', 'j5', 'gripper'],
                    },
                    durationMs: { type: Type.NUMBER, description: 'Duration in ms' },
                  },
                  required: ['name', 'joints'],
                },
              },
            },
            required: ['intent', 'explanation', 'steps'],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI_TIMEOUT')), 3500)
      );

      const response = await Promise.race([geminiPromise, timeoutPromise]);
      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } catch (err: any) {
      console.warn('Falling back to local kinematics solver:', err.message);
      return res.json({ fallback: true, error: err.message });
    }
  });

  // Mount Vite dev server in development, or serve static dist in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RoboArm Studio server listening on port ${PORT}`);
  });
}

startServer();
