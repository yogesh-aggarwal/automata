import * as dotenv from "dotenv"
dotenv.config()

import { Job, Queue, Worker } from "bullmq"
import { google } from "googleapis"
import { emailParsing } from "../services/emailParsing"
import { ParsedEmail_t } from "../services/emailParsing.types"

const REDIS_URI = process.env.REDIS_URI

const gmail = google.gmail({ version: "v1" })

namespace WorkerFn {
	async function assignLabel(
		threadID: string,
		label: string,
		accessToken: string
	) {
		// Get all labels
		const res = await gmail.users.labels.list({
			userId: "me",
			access_token: accessToken,
		})
		let labelId = res.data.labels?.find((l) => l.name === label)?.id

		// Create label if it doesn't exist
		if (!labelId) {
			const labelRes = await gmail.users.labels.create({
				userId: "me",
				access_token: accessToken,
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
			access_token: accessToken,
			requestBody: {
				addLabelIds: [labelId],
			},
		})
	}

	async function sendReply(
		threadID: string,
		reply: string,
		accessToken: string
	) {
		// Get the thread to find the last message
		const thread = await gmail.users.threads.get({
			userId: "me",
			id: threadID,
			access_token: accessToken,
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
			access_token: accessToken,
			requestBody: {
				raw: encodedMessage,
				threadId: threadID,
			},
		})
	}

	export async function processNewEmail(job: Job<any, any, string>) {
		const threadID: string = job.data.threadID
		const accessToken: string = job.data.accessToken

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
		jobs.push(assignLabel(threadID, response.label, accessToken))
		if (response.reply)
			jobs.push(sendReply(threadID, response.reply, accessToken))
		await Promise.all(jobs)
	}
}

export const processNewEmailQueue = new Queue("processNewEmail", {
	connection: {
		host: REDIS_URI,
		port: 6379,
	},
})

new Worker("processNewEmail", WorkerFn.processNewEmail, {
	connection: {
		host: REDIS_URI,
		port: 6379,
	},
})
