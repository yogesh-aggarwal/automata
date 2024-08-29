import * as dotenv from "dotenv"
dotenv.config()

import { LLMResponse_t, ParsedEmail_t } from "./emailParsing.types"
import { askLLM } from "./openai"

export async function emailParsing(
	data: ParsedEmail_t[]
): Promise<LLMResponse_t> {
	const systemPrompt = `
You are an expert in writing email. 

Now that you have the proper context of the email (the whole thread), you need to write a reply if it is necessary. 
It is important to not that if the reply is not necessary, you don't need to reply but if it is, prepare a crisp short reply to the email. 

In addition to dad you will also need to be labelling the email only & only from the following labels: 
1. Interested
2. Not Interested
3. More information

The user will be providing you with the content of the email basically a whole thread and you will be providing me the response in the following format:
--- 
{reply: reply_in_string | null, label: most_appropriate_label} 
---

Don't say literally anything else other than the above JSON.
   `.trim()

	let userPrompt = ""
	userPrompt += "Subject: " + data[0].subject + "\n"
	for (const message of data) {
		userPrompt += `---\n${message.content}`
	}
	userPrompt += "\n---"

	const res = await askLLM(systemPrompt, userPrompt)
	if (!res) return { reply: null, label: "More Information" }

	const json: LLMResponse_t = JSON.parse(res)
	return json
}
