// const express = require('express');
// const multer = require('multer');
// const { google } = require('googleapis');
// const fs = require('fs');

// const app = express();
// const upload = multer({ dest: 'uploads/' });

// const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
// const CREDENTIALS_PATH = './cred.json'; // Replace with your actual credentials path

// const auth = new google.auth.GoogleAuth({
//     keyFile: CREDENTIALS_PATH,
//     scopes: SCOPES,
// });

// const drive = google.drive({ version: 'v3', auth });

// app.post('/upload', upload.single('file'), async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({ error: 'No file uploaded' });
//         }

//         const fileMetadata = { name: req.file.originalname };
//         const media = { mimeType: req.file.mimetype, body: fs.createReadStream(req.file.path) };

//         const response = await drive.files.create({
//             resource: fileMetadata,
//             media: media,
//             fields: 'id',
//         });
        
//         // fs.unlinkSync(req.file.path); // Delete local file after upload

//         res.status(200).json({ fileId: response.data.id, message: 'File uploaded successfully' });
//     } catch (error) {
//         console.error('Error uploading file:', error);
//         res.status(500).json({ error: 'Failed to upload file' });
//     }
// });

// app.listen(3001, () => console.log('Server running on port 3001'));

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const CREDENTIALS_PATH = path.join(__dirname, 'cred.json');

const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

async function setFilePermissions(fileId) {
    try {
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        console.log(`File ${fileId} is now publicly accessible.`);
    } catch (error) {
        console.error('Error setting permissions:', error.response?.data || error.message);
    }
}

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileMetadata = { name: req.file.originalname };
        const media = { mimeType: req.file.mimetype, body: fs.createReadStream(req.file.path) };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, name, createdTime',
        });

        fs.unlinkSync(req.file.path);

        const fileId = response.data.id;
        await setFilePermissions(fileId);

        res.status(200).json({
            fileId: fileId,
            fileName: response.data.name,
            createdTime: response.data.createdTime,
            link: `https://drive.google.com/file/d/${fileId}/view`,
            message: 'File uploaded successfully and made public.',
        });

    } catch (error) {
        console.error('Error uploading file:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

app.get('/getAllFiles', async (req, res) => {
    try {
        const response = await drive.files.list({
            fields: 'files(id, name, createdTime)',
        });

        const files = response.data.files.map(file => ({
            fileId: file.id,
            fileName: file.name,
            createdTime: file.createdTime, // Added createdTime
            link: `https://drive.google.com/file/d/${file.id}/view`,
        }));

        res.status(200).json({
            message: 'List of all files retrieved successfully.',
            files: files,
        });

    } catch (error) {
        console.error('Error retrieving files:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to retrieve files.' });
    }
});

app.listen(7410, () => console.log('Server running on port 7410'));