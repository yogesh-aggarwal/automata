import * as dotenv from "dotenv"
dotenv.config()

import express from "express"
import { authRouter } from "./routes/auth"
import { rootLogin } from "./routes/login"
import { google } from "googleapis"

const app = express()

app.get("/", rootLogin)
app.use("/auth", authRouter)

const port = process.env.PORT || 3000

const gmail = google.gmail({ version: "v1", auth })
gmail.users.watch(
	{
		userId: "me",
		requestBody: {
			labelIds: ["INBOX"],
			topicName: "projects/YOUR_PROJECT_ID/topics/YOUR_TOPIC_NAME",
		},
	},
	(err, res) => {
		if (err) return console.error("The API returned an error: " + err)
		console.log("Watch response:", res.data)
	}
)

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`)
})
