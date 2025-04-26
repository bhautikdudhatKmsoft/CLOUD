const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { google } = require("googleapis");
require("dotenv").config();

const app = express();
const upload = multer({ dest: "uploads/" });

const auth = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);
auth.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const drive = google.drive({ version: "v3", auth });

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const fileMetadata = { name: req.file.originalname };
    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(req.file.path),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });

    fs.unlinkSync(req.file.path); // Remove file from local storage
    res.json({ fileId: response.data.id, message: "File uploaded!" });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(7410, () => console.log("Server running on port 7410"));
