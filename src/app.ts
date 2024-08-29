import * as dotenv from "dotenv"
dotenv.config()

import express from "express"
import { authRouter } from "./routes/auth"
import { rootLogin } from "./routes/login"

const app = express()

app.get("/", rootLogin)
app.use("/auth", authRouter)

const port = process.env.PORT || 3000
app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`)
})
