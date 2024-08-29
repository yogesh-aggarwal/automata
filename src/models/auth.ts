import mongoose from "mongoose"

const tokenSchema = new mongoose.Schema({
	access_token: String,
	refresh_token: String,
	scope: String,
	token_type: String,
	expiry_date: Number,
})

const schema = new mongoose.Schema({
	_id: mongoose.Types.ObjectId,
	email: String,
	tokens: tokenSchema,
})

export const AuthModel = mongoose.model("Auth", schema, "auth")
