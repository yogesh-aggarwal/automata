export type ParsedEmail_t = {
	subject: string
	content: string
	id: string
	threadID: string
}

export type LLMLable = "Interested" | "Not Interested" | "More Information"

export type LLMResponse_t = {
	reply: string | null
	label: LLMLable
}
