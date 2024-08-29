import { Job, Queue, Worker } from "bullmq"
import { google } from "googleapis"
import { AuthModel } from "../models/auth"
import { emailParsing } from "../services/emailParsing"
import { ParsedEmail_t } from "../services/emailParsing.types"

const REDIS_URI = process.env.REDIS_URI

namespace WorkerFn {
	async function assignLabel(threadID: string, label: string, auth: any) {
		const gmail = google.gmail({ version: "v1", auth })

		// Get all labels
		const res = await gmail.users.labels.list({ userId: "me" })
		let labelId = res.data.labels?.find((l) => l.name === label)?.id

		// Create label if it doesn't exist
		if (!labelId) {
			const labelRes = await gmail.users.labels.create({
				userId: "me",
				requestBody: {
					name: label,
					labelListVisibility: "labelShow",
					messageListVisibility: "show",
				},
			})
			labelId = labelRes.data.id
		}
		if (!labelId) return

		// Assign label to the thread
		await gmail.users.threads.modify({
			userId: "me",
			id: threadID,
			requestBody: {
				addLabelIds: [labelId],
			},
		})
	}

	async function sendReply(threadID: string, reply: string, auth: any) {
		const gmail = google.gmail({ version: "v1", auth })

		// Get the thread to find the last message
		const thread = await gmail.users.threads.get({
			userId: "me",
			id: threadID,
		})

		const lastMessage = thread.data.messages?.pop()
		if (!lastMessage) return

		const rawMessage = [
			`From: me`,
			`To: ${
				lastMessage.payload?.headers?.find((h) => h.name === "From")?.value
			}`,
			`Subject: Re: ${
				lastMessage.payload?.headers?.find((h) => h.name === "Subject")?.value
			}`,
			`In-Reply-To: ${lastMessage.id}`,
			`References: ${lastMessage.id}`,
			"",
			reply,
		].join("\n")

		const encodedMessage = Buffer.from(rawMessage)
			.toString("base64")
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "")

		await gmail.users.messages.send({
			userId: "me",
			requestBody: {
				raw: encodedMessage,
				threadId: threadID,
			},
		})
	}


	export async function processNewEmail(job: Job<any, any, string>) {
		const threadID: string = job.data.threadID

		const tokens = await AuthModel.findOne({ email: "YOUR_EMAIL" })
		if (!tokens) return

		const accessToken = tokens.toObject().tokens?.access_token
		if (!accessToken) return

		const gmail = google.gmail({ version: "v1" })

		const thread = await gmail.users.threads.get({
			id: threadID,
			userId: "me",
			access_token: accessToken,
		})
		const threadMessages =
			thread.data.messages?.map((x) => {
				const data: ParsedEmail_t = {
					id: x.id ?? "",
					threadID: threadID,
					subject:
						x.payload?.headers?.filter((x) => x.name === "Subject")[0].value ??
						"",
					content: x.snippet ?? "",
				}

				return data
			}) ?? []

		const response = await emailParsing(threadMessages)

		// Process the response
		const jobs = []
		// Apply label
		jobs.push(assignLabel(threadID, response.label))
		// Send reply (if applicable)
		if (response.reply) jobs.push(sendReply(threadID, response.reply))
		await Promise.all(jobs)
	}
}

export const processNewEmailQueue = new Queue("processNewEmail", {
	connection: {
		host: REDIS_URI,
		port: 6379,
	},
})

export const worker = new Worker("processNewEmail", WorkerFn.processNewEmail, {
	connection: {
		host: REDIS_URI,
		port: 6379,
	},
})
