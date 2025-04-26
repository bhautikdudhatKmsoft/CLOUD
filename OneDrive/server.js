require("dotenv").config();
const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

const {
  CLIENT_ID,
  CLIENT_SECRET,
  TENANT_ID,
  REFRESH_TOKEN,
  REDIRECT_URI,
} = process.env;

if (!CLIENT_ID || !CLIENT_SECRET || !TENANT_ID || !REFRESH_TOKEN || !REDIRECT_URI) {
  console.error("\u274C Missing required environment variables. Check your .env file.");
  process.exit(1);
}

// Function to get Access Token using Refresh Token
async function getAccessToken() {
  try {
    const response = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: "refresh_token",
        redirect_uri: REDIRECT_URI,
        scope: "https://graph.microsoft.com/.default" // 🔹 Add this line
      })
    );
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Error getting access token:", error.response?.data || error.message);
    throw new Error("Failed to get access token");
  }
}

// Route to Handle OneDrive File Upload
app.post("/upload", upload.single("file"), async (req, res) => {

  console.log("Received file:", req.file); // Debugging line

  if (!req.file) {
    return res.status(400).json({ error: "\u274C No file uploaded" });
  }

  try {
    const accessToken = await getAccessToken();
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileStream = fs.createReadStream(filePath);

    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}:/content`;

    const uploadResponse = await axios.put(uploadUrl, fileStream, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
      },
    });

    fs.unlinkSync(filePath); // Delete temp file after upload

    res.json({ message: "\u2705 File uploaded successfully!", data: uploadResponse.data });
  } catch (error) {
    console.error("\u274C Error uploading file:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// 🔹 New Route: Handle Authorization Callback (For Getting Auth Code)
app.get("/callback", (req, res) => {
  const authCode = req.query.code;
  if (!authCode) {
    return res.status(400).send("\u274C Authorization code not found. Try again.");
  }
  res.send(`\u2705 Authorization Code: ${authCode} <br> Copy this code and use it to generate a refresh token.`);
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
