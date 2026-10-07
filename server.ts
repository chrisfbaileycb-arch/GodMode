import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json());

// Initialize Google GenAI client if key is available
const getAIClient = () => {
	if (process.env.GEMINI_API_KEY) {
		try {
			return new GoogleGenAI({});
		} catch (e) {
			console.warn('[Server] Error initializing GoogleGenAI:', e);
		}
	}
	return null;
};

// Provider system prompts to give distinct flavors to the multi-provider view
const providerSystemInstructions: Record<string, string> = {
	webviewOAI: 'You are ChatGPT (GPT-4o style by OpenAI). Respond concisely, authoritatively, and clearly.',
	webviewBard: 'You are Google Gemini (formerly Bard). You are helpful, insightful, and offer balanced, structured insights.',
	webviewBing: 'You are Microsoft Copilot (Bing Chat). Provide informative answers with clear citations or bullet points where relevant.',
	webviewClaude: 'You are Claude 3.5 Sonnet by Anthropic. You are thoughtful, nuanced, articulate, and careful with reasoning.',
	webviewClaude2: 'You are Claude 2 by Anthropic. You provide deep, analytical responses with exceptional care.',
	webviewPerplexity: 'You are Perplexity AI. Provide direct, highly factual, search-grounded answers with numbered source citations format [1], [2].',
	webviewPhind: 'You are Phind. You are an AI search engine optimized for developers, providing code examples and technical explanations.',
	webviewHuggingChat: 'You are HuggingChat (powered by Open Source models). Enthusiastic, transparent, and open-source oriented.',
	webviewLlama: 'You are Llama 3 by Meta. You are fast, helpful, steerable, and open.',
	webviewPoe: 'You are Poe AI. Adaptable, multi-bot style assistant.',
	webviewInflection: 'You are Pi by Inflection. Warm, conversational, highly empathetic, and friendly.',
	webviewYouChat: 'You are YouChat. Fast, conversational search assistant.',
	webviewSmol: 'You are Smol Developer AI. Concise, highly functional code and direct actions without fluff.',
	webviewTogether: 'You are Together AI, powered by state-of-the-art open models.',
	webviewOpenRouter: 'You are OpenRouter unified assistant.',
};

// API: Multi-model chat endpoint
app.post('/api/chat', async (req, res) => {
	const { providerId, providerName, prompt } = req.body;
	if (!prompt) {
		return res.status(400).json({ error: 'Prompt is required' });
	}

	const ai = getAIClient();
	const systemInstruction = providerSystemInstructions[providerId] || `You are ${providerName || 'an AI assistant'}. Provide a distinct, high-quality answer.`;

	if (ai) {
		try {
			const response = await ai.models.generateContent({
				model: 'gemini-2.5-flash',
				contents: prompt,
				config: {
					systemInstruction,
				},
			});

			return res.json({
				text: response.text || 'No response generated.',
				providerId,
			});
		} catch (error: any) {
			console.error(`[Chat API] Gemini error for ${providerId}:`, error?.message || error);
			// Fallback if API fails
		}
	}

	// In-memory fallback if no API key or API call errors
	const fallbackResponse = `[${providerName || 'AI'}] Responses to "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}":\n\n` +
		`Here is the synthesized response from ${providerName || 'the provider'}:\n` +
		`1. Key insight: Exploring the query with ${providerName} analytical strengths.\n` +
		`2. Recommendation: Configure GEMINI_API_KEY in the environment for full real-time model synthesis across all panes.`;

	return res.json({
		text: fallbackResponse,
		providerId,
	});
});

// API: Prompt Critic endpoint
app.post('/api/prompt-critic', async (req, res) => {
	const { prompt } = req.body;
	if (!prompt) {
		return res.status(400).json({ error: 'Prompt is required' });
	}

	const ai = getAIClient();
	if (ai) {
		try {
			const response = await ai.models.generateContent({
				model: 'gemini-2.5-flash',
				contents: `I need to improve the original prompt:
--- Original Prompt ---
${prompt}
--- End Original Prompt ---

Analyze this prompt for LLM performance. Output in two parts:
Part 1: 3 concise bullet points with bold titles describing improvements (e.g. clarity, constraints, format).
Part 2: A single improved version of the prompt that is clear, specific, and optimized for LLMs.`,
			});

			return res.json({
				analysis: response.text || 'No critique available.',
			});
		} catch (error: any) {
			console.error('[Prompt Critic] Gemini error:', error?.message || error);
		}
	}

	// Fallback analysis
	return res.json({
		analysis: `1. **Add specific context**: Clarify target audience and required depth.\n` +
			`2. **Define output format**: Request step-by-step reasoning or bulleted list.\n` +
			`3. **Set role/persona**: Specify an expert perspective.\n\n` +
			`**Suggested Improved Prompt:**\n` +
			`"Act as an expert in this domain. ${prompt}. Provide a detailed explanation structured with key principles, practical examples, and actionable takeaways."`,
	});
});

// Setup Vite middleware in dev or static serve in prod
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
	if (!isProduction) {
		const { createServer: createViteServer } = await import('vite');
		const vite = await createViteServer({
			server: { middlewareMode: true },
			appType: 'spa',
		});
		app.use(vite.middlewares);
	} else {
		app.use(express.static(path.resolve(__dirname, 'dist')));
		app.get('*', (req, res) => {
			res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
		});
	}

	app.listen(PORT, HOST, () => {
		console.log(`GodMode Web running on http://${HOST}:${PORT}`);
	});
}

startServer().catch((err) => {
	console.error('Failed to start server:', err);
	process.exit(1);
});
