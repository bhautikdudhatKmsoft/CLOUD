const { google } = require("googleapis");
require("dotenv").config();

const auth = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const authUrl = auth.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/drive.file"],
  prompt: "consent", // Forces refresh_token generation
});

console.log("Authorize this app by visiting this URL:", authUrl);
