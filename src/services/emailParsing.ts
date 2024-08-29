import { LLMResponse_t, ParsedEmail_t } from "./emailParsing.types"

export async function emailParsing(
	data: ParsedEmail_t[]
): Promise<LLMResponse_t> {
	return { reply: "", label: "Interested" }
}
