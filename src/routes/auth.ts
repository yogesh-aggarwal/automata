import * as dotenv from "dotenv"
dotenv.config()

import { Router } from "express"
import { OAuth2Client } from "google-auth-library"
import mongoose from "mongoose"
import { AuthModel } from "../models/auth"

export const authRouter = Router()

const client = new OAuth2Client({
	clientId: process.env.CLIENT_ID,
	clientSecret: process.env.CLIENT_SECRET,
	redirectUri: process.env.REDIRECT_URI,
})

authRouter.get("/google", (req, res) => {
	const authUrl = client.generateAuthUrl({
		access_type: "offline",
		scope: ["https://www.googleapis.com/auth/gmail.readonly"],
	})

	res.status(200).send(authUrl)
})

authRouter.get("/google/callback", async (req, res) => {
	const code = req.query.code as string
	if (!code) {
		res.status(400).send("No authorization code found in the request")
		return
	}

	try {
		const { tokens } = await client.getToken(code)

		await new AuthModel({
			_id: new mongoose.Types.ObjectId(),
			email: "",
			...tokens,
		}).save()

		console.log(tokens)

		res.send("Authorization successful! You can now access Gmail API.")
	} catch (error) {
		console.log(error)
		res
			.status(500)
			.send("Error while trying to exchange authorization code for tokens")
	}
})
