const express = require('express');
const { Client } = require('pg');
const path = require('path');

const app = express();
const PORT = 5500; // Ensure this matches the port in your docker-compose.yml

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL client
const client = new Client({
  host: 'localhost', // Replace with the correct hostname
  user: 'postgres',
  password: 'yourpassword',
  database: 'UCC'
});
client.connect().catch(err => console.error('Connection error', err.stack)); // Ensure only one connection attempt

// Route to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/data', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM ucccollegerepository');
    console.log("Server-side data:", result.rows); // Log the data to inspect its structure on the server side
    res.json(result.rows); // Ensure the response is an array
  } catch (error) {
    console.error("Server-side error:", error); // Log the error details
    res.status(500).json({ message: 'Error fetching data', error });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
