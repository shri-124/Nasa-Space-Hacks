const { MongoClient } = require('mongodb');
const fs = require('fs');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const mongoUri = 'mongodb+srv://abhineti68:KT8NZ5cqjqxNh6ie@cluster0.xovyh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // Replace with your MongoDB connection string
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
        unique: true,  // Ensure that UID is unique
    },
    user: {
        name: {
            type: String,
            required: true, // Make the name field required
        },
        latitude: {
            type: Number,
        },
        longitude: {
            type: Number,
        },
        crops: [{
            name: {
                type: String,
                required: true  // Crop name is required
            },
            water: {
                type: Number,
                required: true  // Water value is required
            }
        }]
    }
});

const User = mongoose.model('User', userSchema);

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'welcome.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/newuser', (req, res) => {
    res.sendFile(path.join(__dirname, 'newuser.html'))
});

app.get('/authenticate', (req, res) => {
    res.sendFile(path.join(__dirname, 'authenticate.html'))
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'))
});

app.get('/api/users/:uid', async (req, res) => {
    const uid = req.params.uid; // Get the UID from the URL parameters
    try {
        // Find the user by UID in the collection
        const user = await mongoose.connection.collection('users').findOne({ uid: uid });

        console.log('Fetched User:', user); // Log the fetched user object for debugging

        if (user) {
            // Respond with name, latitude, and longitude
            res.json({
                name: user.user.name,
                latitude: user.user.latitude,
                longitude: user.user.longitude
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/newuser/:uid', async (req, res) => {
    const uid = req.params.uid;
    const name = req.query.name;
    const latitude = req.query.latitude;
    const longitude = req.query.longitude;
    try {
        const newUser = new User({
            uid: uid,
            user: {
                name: name,  // Or any other fields you want
                latitude: latitude,
                longitude: longitude
            }
        });

        console.log(newUser);

        // Save the new user to MongoDB
        await newUser.save();

        res.status(200).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/newcrop/:uid', async (req, res) => {
    const { uid } = req.params;
    const { name, water } = req.body; // Assuming the crop data is sent in the request body

    // Validate the input data
    if (!name || water === undefined) {
        return res.status(400).json({ message: 'Crop name and water value are required' });
    }

    try {
        // Find the user by UID and update the crops array
        const updatedUser = await User.findOneAndUpdate(
            { uid: uid }, // Filter by UID
            { $push: { 'user.crops': { name, water } } }, // Push new crop into the crops array
            { new: true, useFindAndModify: false } // Options: return the new document, prevent deprecated warnings
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        await updatedUser.save();

        return res.status(200).json({ message: 'Crop added successfully', user: updatedUser });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/getcrops/:uid', async (req, res) => {
    const { uid } = req.params; // Extract the UID from the request parameters

    try {
        // Find the user by UID and select the crops field
        const user = await User.findOne({ uid: uid }, { 'user.crops': 1 }); // Only retrieve crops field

        // Check if the user exists
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Send back the crops data
        return res.status(200).json({ crops: user.user.crops });
    } catch (error) {
        console.error('Error while fetching crops:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.put('/api/updatelocation/:uid', async (req, res) => {
    const { uid } = req.params;
    const { latitude, longitude } = req.body; // Get latitude and longitude from the request body

    // Validate the input data
    if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    try {
        // Find the user by UID and update the location fields
        const updatedUser = await User.findOneAndUpdate(
            { uid: uid }, // Filter by UID
            {
                'user.latitude': latitude,
                'user.longitude': longitude,
            }, // Update the user's location
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ message: 'Location updated successfully', user: updatedUser });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});