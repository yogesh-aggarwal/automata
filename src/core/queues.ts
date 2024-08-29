import { Job, Queue, Worker } from "bullmq"
import { google } from "googleapis"

const REDIS_URI = process.env.REDIS_URI

export const processNewEmailQueue = new Queue("processNewEmail", {
	connection: {
		host: REDIS_URI,
		port: 6379,
	},
})

async function processNewEmail(job: Job<any, any, string>) {
	const gmail = google.gmail({ version: "v1" })

	// Fetch the latest 10 emails
	const response = await gmail.users.messages.list({
		userId: "me", // 'me' refers to the authenticated user
		maxResults: 10, // Limit the number of emails fetched,
		access_token: userAuthToken.access_token,
		q: "",
	})

	const firstMessage = response.data.messages?.[0]
	{
		const message = await gmail.users.threads.get({
			id: firstMessage?.threadId as string,
			userId: "me",
			access_token: userAuthToken.access_token,
		})
		const parsedMessage = message.data.messages?.map((x) => {
			;(x as any)["subject"] = x.payload?.headers?.filter(
				(x) => x.name === "Subject"
			)[0].value
			delete x.payload
			delete x.sizeEstimate
			delete x.historyId
			delete x.internalDate
			return x
		})
		console.log(parsedMessage)

		let messageGpt = parsedMessage?.map((x) => ({
			labelIds: x["labelIds"],
			subject: (x as any)["subject"],
			snippet: x["snippet"],
		}))
	}
}

export const worker = new Worker("processNewEmail", processNewEmail, {
	connection: {
		host: REDIS_URI,
		port: 6379,
	},
})
