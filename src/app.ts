import * as dotenv from "dotenv"
dotenv.config()

import express from "express"
import { google } from "googleapis"
import { schedule } from "node-cron"
import { processNewEmailQueue } from "./core/queues"
import { AuthModel } from "./models/auth"
import { authRouter } from "./routes/auth"
import { rootLogin } from "./routes/login"

const app = express()

app.get("/", rootLogin)
app.use("/auth", authRouter)

const port = process.env.PORT || 3000

schedule("10 0 * * *", async () => {
	const gmail = google.gmail({ version: "v1" })
	const users = (await AuthModel.find()).map((x) => x.toObject())

	const newEmails = users.map(async (x) => {
		const mesages = await gmail.users.threads.list({
			userId: "me",
			access_token: x.tokens?.access_token ?? "",
			q: "is:unread",
		})
		return (
			mesages.data.threads?.map((y) => {
				return {
					threadID: y.id,
					accessToken: x.tokens?.access_token ?? "",
				}
			}) ?? []
		)
	})

	processNewEmailQueue.addBulk(
		newEmails.map((x) => ({ name: "processNewEmail", data: x }))
	)
})

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`)
})
