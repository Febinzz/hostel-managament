const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();

// Serve frontend files from 'public' folder
app.use(express.static(path.join(__dirname, "public")));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "admin123", // your MySQL password
    database: "hostel"
});

db.connect(err => {
    if (err) throw err;
    console.log("✅ MySQL Connected...");
});

// Serve index.html on root URL
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ------------------ STUDENT ROUTES ------------------

// Get all students
app.get("/students", (req, res) => {
    db.query("SELECT * FROM students", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Add new student
app.post("/students", (req, res) => {
    const { name, roll_no, course } = req.body;
    const query = "INSERT INTO students (name, roll_no, course) VALUES (?, ?, ?)";
    db.query(query, [name, roll_no, course], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Student added", studentId: result.insertId });
    });
});

// Get allocation for a student
app.get("/allocation/:studentId", (req, res) => {
    const studentId = req.params.studentId;
    const query = `
        SELECT r.room_number
        FROM allocation a
        JOIN rooms r ON a.room_id = r.room_id
        WHERE a.student_id = ?`;
    db.query(query, [studentId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || {});
    });
});

// ------------------ ROOM ROUTES ------------------

// Get all rooms
app.get("/rooms", (req, res) => {
    db.query("SELECT * FROM rooms", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Add new room
app.post("/rooms", (req, res) => {
    const { room_number, capacity } = req.body;
    const query = "INSERT INTO rooms (room_number, capacity) VALUES (?, ?)";
    db.query(query, [room_number, capacity], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Room added", roomId: result.insertId });
    });
});

// ------------------ ALLOCATION ROUTES ------------------

// Allocate student to room
app.post("/allocation", (req, res) => {
    const { student_id, room_id } = req.body;

    // Check if student is already allocated
    db.query("SELECT * FROM allocation WHERE student_id = ?", [student_id], (err, studentAlloc) => {
        if (err) return res.status(500).json({ error: err.message });
        if (studentAlloc.length > 0) {
            return res.status(400).json({ error: "Student is already allocated a room" });
        }

        // Check room capacity
        db.query("SELECT capacity, occupied FROM rooms WHERE room_id = ?", [room_id], (err, rooms) => {
            if (err) return res.status(500).json({ error: err.message });
            const room = rooms[0];
            if (room.occupied >= room.capacity) return res.status(400).json({ error: "Room is full" });

            // Insert allocation
            db.query("INSERT INTO allocation (student_id, room_id) VALUES (?, ?)", [student_id, room_id], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                // Update room occupancy
                db.query("UPDATE rooms SET occupied = occupied + 1 WHERE room_id = ?", [room_id], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: "Student allocated successfully" });
                });
            });
        });
    });
});

// Delete allocation
app.delete("/allocation/:studentId", (req, res) => {
    const studentId = req.params.studentId;

    // Find allocation
    db.query("SELECT room_id FROM allocation WHERE student_id = ?", [studentId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "Allocation not found" });

        const roomId = results[0].room_id;

        // Delete allocation
        db.query("DELETE FROM allocation WHERE student_id = ?", [studentId], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Update room occupancy
            db.query("UPDATE rooms SET occupied = occupied - 1 WHERE room_id = ?", [roomId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Allocation deleted successfully" });
            });
        });
    });
});

// Get all allocations
app.get("/allocations", (req, res) => {
    const query = `
        SELECT a.alloc_id, s.student_id, s.name AS student_name, s.roll_no, r.room_number
        FROM allocation a
        JOIN students s ON a.student_id = s.student_id
        JOIN rooms r ON a.room_id = r.room_id
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ------------------ ADMIN LOGIN ------------------
const adminUser = { username: "admin", password: "admin123" };
app.post("/admin/login", (req, res) => {
    const { username, password } = req.body;
    if (username === adminUser.username && password === adminUser.password) {
        res.json({ message: "Login successful" });
    } else {
        res.status(401).json({ error: "Invalid username or password" });
    }
});
app.get("/allocation/name/:studentName", (req, res) => {
    const studentName = req.params.studentName;
    const query = `
        SELECT s.name, s.roll_no, r.room_number
        FROM allocation a
        JOIN students s ON a.student_id = s.student_id
        JOIN rooms r ON a.room_id = r.room_id
        WHERE s.name = ?
    `;
    db.query(query, [studentName], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.json({ message: "No allocation found" });
        res.json(results[0]);
    });
});
// 1. Get all students with their allocations
app.get("/report/students", (req, res) => {
    const query = `
        SELECT s.student_id, s.name, s.roll_no, s.course, r.room_number
        FROM students s
        LEFT JOIN allocation a ON s.student_id = a.student_id
        LEFT JOIN rooms r ON a.room_id = r.room_id
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 2. Get rooms status
app.get("/report/rooms", (req, res) => {
    const query = `
        SELECT room_id, room_number, capacity, occupied,
        CASE 
            WHEN occupied = 0 THEN 'Vacant'
            WHEN occupied < capacity THEN 'Partially Filled'
            WHEN occupied = capacity THEN 'Full'
        END AS status
        FROM rooms
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 3. Get students without allocation
app.get("/report/unallocated", (req, res) => {
    const query = `
        SELECT s.student_id, s.name, s.roll_no, s.course
        FROM students s
        LEFT JOIN allocation a ON s.student_id = a.student_id
        WHERE a.student_id IS NULL
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
// Delete student completely
app.delete("/students/:studentId", (req, res) => {
    const studentId = req.params.studentId;

    // Remove allocation first (if exists)
    db.query("DELETE FROM allocation WHERE student_id = ?", [studentId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Delete student
        db.query("DELETE FROM students WHERE student_id = ?", [studentId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Student deleted successfully" });
        });
    });
});

// ------------------ START SERVER ------------------
app.listen(5000, () => console.log("✅ Server running at http://localhost:5000"));
