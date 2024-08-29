import * as dotenv from "dotenv"
dotenv.config()

import OpenAI from "openai"

const client = new OpenAI({
	apiKey: process.env.OPEN_AI_KEY,
})

export async function askLLM(
	systemPrompt: string,
	userPrompt: string
): Promise<string | null> {
	try {
		const chatCompletion = await client.chat.completions.create({
			model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
		})

		return chatCompletion.choices[0].message.content?.trim() || null
	} catch {
		return null
	}
}
