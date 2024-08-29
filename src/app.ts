import express from "express";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import * as dotenv from "dotenv";
import { clouddebugger } from "googleapis/build/src/apis/clouddebugger";

const gmail = google.gmail("v1");

dotenv.config();

let userAuthToken = {
  access_token:
    "ya29.a0AcM612wKr0nogqj3i1T0f6NnEpaAgoMGAKbMUqcAEq1g7w2v05rIjLb4Yrobal4XVRIhHzOcC69bmyln-YSla-kUJzApbqw00fF6HjDCl_36UCN6MVN6doX9olzDIXp_M8q_y9PgPaOPLdhYiQkkiuwSK8H1MsiQ2jRYsbMUaCgYKAegSARISFQHGX2Mizm9MF-ieO5dq8I5TM8-WTQ0175",
  refresh_token:
    "1//0gp5TIbFsi7HsCgYIARAAGBASNwF-L9IrDAJUg4FK3sGG6ZHdzZjn84dXNclZ-3lFU3F0upQdS1AvfrXFLunYHXFSHFZ6Kc8bjDc",
  scope: "https://www.googleapis.com/auth/gmail.readonly",
  token_type: "Bearer",
  expiry_date: 1724948554297,
};

const app = express();
const port = 3000;

// Initialize the OAuth2Client with credentials from the .env file
const client = new OAuth2Client({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
});
// Root endpoint - Welcome message
app.get("/", (req, res) => {
  res.send("Welcome to the OAuth 2.0 Demo!");
});

// Endpoint to initiate OAuth flow
app.get("/auth/google", (req, res) => {
  const authUrl = client.generateAuthUrl({
    access_type: "offline", // Request offline access to get a refresh token
    scope: ["https://www.googleapis.com/auth/gmail.readonly"], // Specify the scope of access
  });
  res.status(200).send(authUrl);
});

// Callback endpoint for handling Google's response
app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code as string; // Extract authorization code from query params

  if (!code) {
    res.status(400).send("No authorization code found in the request");
    return;
  }

  try {
    // Exchange authorization code for access and refresh tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens); // Set the tokens on the client for authenticated requests

    // Successful authorization message
    res.send("Authorization successful! You can now access Gmail API.");
    console.log("Authorization successful! You can now access Gmail API.");
    console.log(tokens);

    userAuthToken = tokens as any;
  } catch (error: any) {
    // Error handling for token exchange
    res
      .status(500)
      .send(
        "Error while trying to exchange authorization code for tokens: " +
          error.message
      );
    console.log(error);
  }
});

// Endpoint to fetch emails from the authenticated user's Gmail account
async function mail() {
  const gmail = google.gmail({ version: "v1" });

  // Fetch the latest 10 emails
  const response = await gmail.users.messages.list({
    userId: "me", // 'me' refers to the authenticated user
    maxResults: 10, // Limit the number of emails fetched,
    access_token: userAuthToken.access_token,
    q: "",
  });

  const firstMessage = response.data.messages?.[0];
  {
    const message = await gmail.users.threads.get({
      id: firstMessage?.threadId as string,
      userId: "me",
      access_token: userAuthToken.access_token,
    });
    const parsedMessage = message.data.messages?.map((x) => {
      (x as any)["subject"] = x.payload?.headers?.filter(
        (x) => x.name === "Subject"
      )[0].value;
      delete x.payload;
      delete x.sizeEstimate;
      delete x.historyId;
      delete x.internalDate;
      return x;
    });
    console.log(parsedMessage);

    let messageGpt = parsedMessage?.map((x) => ({
      labelIds: x["labelIds"],
      subject: (x as any)["subject"],
      snippet: x["snippet"],
    }));
  }
}

// mail();

// Start the Express server
// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });
