const tracer = require("dd-trace").init({
  service: "college-enrollment-system",
  env: "production",
  version: "1.0.0"
});

const StatsD = require('hot-shots'); 
const dogstatsd = new StatsD({
  host: '127.0.0.1',
  port: 8125,
  globalTags: { service: "college-enrollment-system", env: "production" },
});

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const { GridFsStorage } = require('multer-gridfs-storage');
const { MongoClient, ObjectId } = require('mongodb');
const mongoose = require('mongoose');
require('dotenv').config({ path: 'CollegeEnrollmenSystem/mongo.env' });

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;

    dogstatsd.timing("api.request.latency", duration, {
      route: req.path,
      method: req.method,
      status_code: res.statusCode,
    });

    if (res.statusCode >= 200 && res.statusCode < 400) {
      dogstatsd.increment("api.request.success", 1, { route: req.path });
    } else {
      dogstatsd.increment("api.request.failure", 1, { route: req.path, status_code: res.statusCode });
    }
  });
  next();
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/UCC_College_Repository';
if (!uri.startsWith("mongodb")) {
    console.error("Invalid or undefined MongoDB URI. Please check your .env file.");
    process.exit(1);
}
console.log("Connecting to MongoDB with URI:", uri);

let db, studentsCollection, requirementsCollection, bucket;

async function connectToDatabase() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        console.log("Connected to MongoDB successfully.");
        const db = client.db('UCC_College_Repository');
        const studentsCollection = db.collection('Collge_Student_Repository');
        const requirementsCollection = db.collection('UCC_Requirements_Repository');
        const bucket = new GridFSBucket(db, { bucketName: 'photos' });
        return { db, studentsCollection, requirementsCollection, bucket };
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1);
    }
}

connectToDatabase().then(connection => {
    db = connection.db;
    studentsCollection = connection.studentsCollection;
    requirementsCollection = connection.requirementsCollection;
    bucket = new GridFSBucket(db, { bucketName: 'photos' });
});

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Mongoose connected to MongoDB'))
  .catch(err => console.error('Mongoose connection error:', err));

mongoose.set("debug", function (collectionName, method, query, doc) {
  const start = Date.now();
  return function () {
    const duration = Date.now() - start;
    dogstatsd.timing("db.query.execution_time", duration, {
      collection: collectionName,
      method,
    });
  };
});

const storage = new GridFsStorage({
    url: uri,
    file: (req, file) => {
        return {
            filename: `${Date.now()}-${file.originalname}`,
            bucketName: 'photos',
        };
    }
});
const upload = multer({ storage });

let activityLog = [
  { message: 'System started', time: new Date().toISOString() }
];

function broadcastActivity(activity) {
  activityLog.unshift(activity);
  if (activityLog.length > 20) activityLog = activityLog.slice(0, 20);
  io.emit('activity', activityLog);
}

io.on('connection', (socket) => {
  socket.emit('activity', activityLog);
});

app.post('/api/students', async (req, res) => {
    try {
        const result = await studentsCollection.insertOne(req.body);
        broadcastActivity({ message: `Student ${req.body.name || 'added'} registered`, time: new Date().toISOString() });
        res.status(201).json({ message: 'Student added successfully!', id: result.insertedId });
    } catch (error) {
        console.error("Error saving student:", error);
        res.status(500).json({ error: error.message || 'Failed to add student' });
    }
});

app.post('/api/upload', upload.any(), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        const metadata = req.files.map((file) => ({
            studentId: req.body.studentId || null,
            filename: file.filename,
            fileId: file.id,
            uploadedAt: new Date(),
            description: file.fieldname,
        }));
        const result = await requirementsCollection.insertMany(metadata);
        res.status(201).json({ message: 'Files uploaded successfully!', result });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

app.get('/api/image/:filename', async (req, res) => {
    try {
        const downloadStream = bucket.openDownloadStreamByName(req.params.filename);
        downloadStream.pipe(res);
    } catch (error) {
        console.error("Error retrieving image:", error);
        res.status(404).json({ error: 'Image not found' });
    }
});

app.get('/api/students', async (req, res) => {
    try {
        const students = await studentsCollection.find({}).toArray();
        res.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

app.get('/api/requirements', async (req, res) => {
    try {
        const requirements = await requirementsCollection.find({}).toArray();
        res.status(200).json(requirements);
    } catch (error) {
        console.error("Error fetching requirements:", error);
        res.status(500).json({ error: 'Failed to fetch requirements' });
    }
});

app.put('/api/students/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        if (!ObjectId.isValid(studentId)) {
            return res.status(400).json({ error: 'Invalid ObjectId' });
        }
        const result = await studentsCollection.updateOne(
            { _id: new ObjectId(studentId) },
            { $set: req.body }
        );
        res.status(200).json({ message: 'Student updated successfully!', result });
    } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({ error: 'Failed to update student' });
    }
});

app.delete('/api/students/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        if (!ObjectId.isValid(studentId)) {
            return res.status(400).json({ error: 'Invalid ObjectId' });
        }
        const result = await studentsCollection.deleteOne({ _id: new ObjectId(studentId) });
        broadcastActivity({ message: `Student deleted`, time: new Date().toISOString() });
        res.status(200).json({ message: 'Student deleted successfully!', result });
    } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ error: 'Failed to delete student' });
    }
});

app.delete('/api/requirements/:id', async (req, res) => {
    try {
        const requirementId = req.params.id;
        if (!ObjectId.isValid(requirementId)) {
            return res.status(400).json({ error: 'Invalid ObjectId' });
        }
        const result = await requirementsCollection.deleteOne({ _id: new ObjectId(requirementId) });
        res.status(200).json({ message: 'Requirement deleted successfully!', result });
    } catch (error) {
        console.error("Error deleting requirement:", error);
        res.status(500).json({ error: 'Failed to delete requirement' });
    }
});

const subjectSchema = new mongoose.Schema({
  course: String,
  year: String,
  semester: String,
  code: String,
  title: String,
  units: String,
});
const Subject = mongoose.model('Subject', subjectSchema, 'College_SubjectLists');

app.post('/api/subjects/migrate-to-strings', async (req, res) => {
  try {
    const allSubjects = await Subject.find({});
    let updatedCount = 0;
    for (const subj of allSubjects) {
      let needsUpdate = false;
      const update = {};
      ['course', 'year', 'semester', 'code', 'title', 'units'].forEach(field => {
        if (subj[field] !== undefined && typeof subj[field] !== 'string') {
          update[field] = subj[field] + '';
          needsUpdate = true;
        }
      });
      if (needsUpdate) {
        await Subject.updateOne({ _id: subj._id }, { $set: update });
        updatedCount++;
      }
    }
    res.json({ message: 'Migration complete', updatedCount });
  } catch (err) {
    res.status(500).json({ error: 'Migration failed', details: err.message });
  }
});

app.get('/api/subjects', async (req, res) => {
  try {
    const { course, year, semester } = req.query;
    const filter = {};
    if (course) filter.course = course;
    if (year) filter.year = year;
    if (semester) filter.semester = semester;
    const subjects = await Subject.find(filter).sort({ course: 1, year: 1, semester: 1, code: 1 });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

app.post('/api/subjects', async (req, res) => {
  try {
    const newSubject = new Subject(req.body);
    const saved = await newSubject.save();
    broadcastActivity({ message: `Subject ${req.body.code || ''} added`, time: new Date().toISOString() });
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: 'Failed to add subject', details: err.message });
  }
});

app.put('/api/subjects/:id', async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(subject);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update subject' });
  }
});

app.delete('/api/subjects/:id', async (req, res) => {
  try {
    await Subject.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete subject' });
  }
});

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'staff' },
});
const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

app.get('/api/activity', (req, res) => {
  res.json(activityLog);
});

app.use(express.static(path.join(__dirname, 'HTML')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'index2.html'));
});
app.get('/oldstudent', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'courses.html'));
});

app.post('/api/subjects/patch-missing-fields', async (req, res) => {
  try {
    const allSubjects = await Subject.find({});
    let patchedCount = 0;
    for (const subj of allSubjects) {
      let needsPatch = false;
      const update = {};
      ['course', 'year', 'semester', 'code', 'title', 'units'].forEach(field => {
        if (!subj[field] || typeof subj[field] !== 'string') {
          update[field] = '';
          needsPatch = true;
        }
      });
      if (needsPatch) {
        await Subject.updateOne({ _id: subj._id }, { $set: update });
        patchedCount++;
      }
    }
    res.json({ message: 'Patch complete', patchedCount });
  } catch (err) {
    res.status(500).json({ error: 'Patch failed', details: err.message });
  }
});

setInterval(() => {
  dogstatsd.increment("system.uptime.heartbeat");
}, 60000); // every 1 minute

const PORT = process.env.PORT || 5500;
const HOST = process.env.HOST || 'localhost';
server.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});
