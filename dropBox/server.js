const express = require("express");
const multer = require("multer");
const { Dropbox } = require("dropbox");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const fetch = require("node-fetch");

dotenv.config();

const app = express();
const port = 7410;

// Ensure "uploads" folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// console.log(process.env.DROPBOX_ACCESS_TOKEN);
// console.log(process.env.DROPBOX_APP_KEY);
// console.log(process.env.DROPBOX_APP_SECRET);

// Get new Dropbox access token using refresh token
async function getAccessToken() {
    try {
        const response = await fetch("https://api.dropbox.com/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: process.env.DROPBOX_REFRESH_TOKEN,
                client_id: process.env.DROPBOX_APP_KEY,
                client_secret: process.env.DROPBOX_APP_SECRET,
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Dropbox Auth Error: ${data.error_description}`);
        }

        console.log("✅ New Access Token Acquired");
        return data.access_token;
    } catch (error) {
        console.error("❌ Error Fetching Access Token:", error.message);
        throw error;
    }
}


// Create Dropbox instance with a fresh access token
async function createDropboxInstance() {
    const accessToken = await getAccessToken();
    return new Dropbox({ accessToken, fetch });
}

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});
const upload = multer({ storage: storage });

// API Route for File Upload
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const dbx = await createDropboxInstance(); // Get new Dropbox instance with fresh token
        const filePath = req.file.path;
        const fileName = "/" + req.file.filename;
        const fileContent = fs.readFileSync(filePath);

        // Upload file to Dropbox
        const response = await dbx.filesUpload({
            path: fileName,
            contents: fileContent,
            mode: { ".tag": "add" }, // Ensure unique filenames
            autorename: true,
        });

        // Remove local file after uploading to Dropbox
        fs.unlinkSync(filePath);

        res.json({
            message: "File uploaded successfully!",
            dropboxPath: response.result.path_lower,
        });
    } catch (error) {
        console.error("❌ Dropbox Upload Error:", error);
        res.status(500).json({
            error: error.message,
        });
    }
});

// Start the Server
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
