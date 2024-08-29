import * as dotenv from "dotenv"
dotenv.config()

import express from "express"
import { google } from "googleapis"
import mongoose from "mongoose"
import { schedule } from "node-cron"
import { processNewEmailQueue } from "./core/queues"
import { AuthModel } from "./models/auth"
import { authRouter } from "./routes/auth"
import { rootLogin } from "./routes/login"

const app = express()

app.get("/", rootLogin)
app.use("/auth", authRouter)

const port = process.env.PORT || 3000

schedule("*/30 * * * * *", async () => {
	console.log("Starting to reply to emails")

	const gmail = google.gmail({ version: "v1" })
	const users = (await AuthModel.find()).map((x) => x.toObject())

	const newEmails = (
		await Promise.all(
			users.map(async (x) => {
				const mesages = await gmail.users.messages.list({
					userId: "me",
					access_token: x.tokens?.access_token ?? "",
					q: "is:unread",
				})
				return (
					mesages.data.messages?.map((y) => {
						return {
							threadID: y.id,
							accessToken: x.tokens?.access_token ?? "",
						}
					}) ?? []
				)
			})
		)
	).flat()

	processNewEmailQueue.addBulk(
		newEmails.map((x) => ({ name: "processNewEmail", data: x }))
	)
})

app.listen(port, async () => {
	await mongoose.connect(process.env.MONGODB_URI ?? "")
	console.log(`Server is running on http://localhost:${port}`)
})
