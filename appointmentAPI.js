const e = require('express');
const express = require('express');
const mysql = require('mysql');

const app = express();
const PORT = 3000;
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'appointment'
});

db.connect((error) => {
    if (error){
        console.error("Failed to connect to database: ", error.message);
    }else{
        console.log("Connected to the database");
    }
});

// register new users
app.post('/appointment/register', (req, res) => {
    const { username, email, password } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Insert into users table with default role as 'User'
    const userSql = 'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
    db.query(userSql, [username, email, password, 'User'], (error, result) => {
        if (error) {
            console.error("Failed to register user: ", error.message);
            return res.status(500).json({ message: 'Failed to register user' });
        }

        const userId = result.insertId;

        // Insert into profile table
        const profileSql = 'INSERT INTO profile (userId, username, email) VALUES (?, ?, ?)';
        db.query(profileSql, [userId, username, email], (profileError) => {
            if (profileError) {
                console.error("Failed to create user profile: ", profileError.message);
                return res.status(500).json({ message: 'Failed to create profile' });
            }

            res.status(200).json({ message: 'Successfully registered with role "User"' });
        });
    });
});


// login existing users
app.post('/appointment/login', (req, res) => {
    const { username, password } = req.body;

    // Validate username and password are not empty
    if (!username || !password) {
        return res.json({
            status: 'failed',
            message: 'Username and password are required',
        });
    }

    // Query with BINARY to enforce case-sensitive username matching
    const sql = 'SELECT * FROM users WHERE BINARY username = ?';
    db.query(sql, [username], (error, result) => {
        if (error) {
            console.error("Failed to login user: ", error.message);
            return res.status(500).json({ status: 'failed', message: 'Server error' });
        }

        // Check if username exists
        if (result.length === 0) {
            console.log(`Login failed: Username "${username}" not found`);
            return res.json({ status: 'failed', message: 'Invalid username or password' });
        }

        const user = result[0];

        // Compare passwords (case-sensitive)
        if (user.password === password) {
            console.log(`User "${username}" logged in successfully`);

            // Return user details including user_id
            return res.json({
                status: 'success',
                message: 'Login successful',
                userId: user.userId,  // Send the user_id back to the client
                username: user.username  // Optionally send the username
            });
        } else {
            console.log(`Login failed: Password mismatch for user "${username}"`);
            return res.json({ status: 'failed', message: 'Invalid username or password' });
        }
    });
});


// // insert new appointment service into database
// app.post('/appointment/service', (req, res) => {
//     const { title, description } = req.body;
//     const sql = 'INSERT INTO services (title, description) VALUES (?, ?)';
//     db.query(sql, [title, description], (error, result) => {
//         if(error){
//             console.error("Failed to register user: ", error.message);
//             res.status(500).send('Failed to insert data');
//         }else{
//             res.status(200).send('Successfully insert data')
//         }
//     });
// });

// // insert new appointment location into database
// app.post('/appointment/location', (req, res) => {
//     const { title, address } = req.body;
//     const sql = 'INSERT INTO location (title, address) VALUES (?, ?)';
//     db.query(sql, [title, address], (error, result) => {
//         if(error){
//             console.error("Failed to register user: ", error.message);
//             res.status(500).send('Failed to insert data');
//         }else{
//             res.status(200).send('Successfully insert data')
//         }
//     });
// });

// // insert new appointment time slots into database
// app.post('/appointment/slot', (req, res) => {
//     const { time } = req.body;
//     const sql = 'INSERT INTO slots (time) VALUES (?)';
//     db.query(sql, [time], (error, result) => {
//         if(error){
//             console.error("Failed to register user: ", error.message);
//             res.status(500).send('Failed to insert data');
//         }else{
//             res.status(200).send('Successfully insert data')
//         }
//     });
// });

// display all the appointment services
app.get('/appointment/serviceList', (req, res) => {
    const sql = 'SELECT * FROM services';
    db.query(sql, (error, result) => {
        if(error){
            console.error("Failed to get data: ", error.message);
            res.status(500).send('Failed to fetch data');
        }else{
            res.status(200).send(result);
        }
    });
});

// display all the appointment locations
app.get('/appointment/locationList', (req, res) => {
    const sql = 'SELECT * FROM location';
    db.query(sql, (error, result) => {
        if(error){
            console.error("Failed to get data: ", error.message);
            res.status(500).send('Failed to fetch data');
        }else{
            res.status(200).send(result);
        }
    });
})

// display all the appointment time slots
app.get('/appointment/TimeSlots', (req, res) => {
    const sql = 'SELECT * FROM slots';
    db.query(sql, (error, result) => {
        if(error){
            console.error("Failed to get data: ", error.message);
            res.status(500).send('Failed to fetch data');
        }else{
            res.status(200).send(result);
        }
    });
})

// confirm appointment and sent the data to the database
app.post('/appointment/confirm', (req, res) => {
    const { userId, service, location, address, booking_date, booking_time } = req.body;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }

    const sql = `
        INSERT INTO booking (userId, service, location, address, booking_date, booking_time)
        VALUES (?, ?, ?, ?, ?, ?)`;

    db.query(sql, [userId, service, location, address, booking_date, booking_time], (error, result) => {
        if (error) {
            console.error("Failed to book appointment:", error.message);
            return res.status(500).json({ message: 'Failed to book appointment' });
        } else {
            res.status(200).json({ message: 'Appointment booked successfully' });
        }
    });
});


// display new appointment from database
app.get('/appointment/fetchAppointment', (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Fetch the next appointment after today
    const sql = `
        SELECT service, location, address, DATE_FORMAT(booking_date, "%d %M %Y") AS booking_date, booking_time 
        FROM booking 
        WHERE userid = ? AND booking_date >= CURDATE()
        ORDER BY STR_TO_DATE(booking_date, '%Y-%m-%d') ASC, STR_TO_DATE(booking_time, '%h:%i %p') ASC 
        LIMIT 1;
    `;

    db.query(sql, [userId], (error, result) => {
        if (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch appointment', error });
        }

        if (result.length > 0) {
            res.status(200).json({ success: true, appointment: result[0] });
        } else {
            res.status(404).json({ success: false, message: 'No upcoming appointments found' });
        }
    });
});


// Display user information in Profile Page.
app.get('/appointment/displayProfile', (req, res) => {
    const { userId } = req.query;

    if(!userId){
        return res.status(400).json({ error:'User ID is required' });
    }

    const query = 'SELECT username, email, age, address, hp_number, gender FROM profile WHERE userid = ?';

    db.query(query, [userId], (error, result) => {
        if(error){
            return res.status(500).json({ error: 'Database query failed', details: error.message });
        }

        if (result.length > 0) {
            res.status(200).json(result[0]);
        }else{
            res.status(404).json({ message: 'User not found' });
        }
    });
});

// update user information in Profile Page.
app.post('/appointment/editProfile', (req, res) => {
    const { Age, Address, HP, Gender, userId } = req.body;  // Added userId to the request body

    // Ensure that all fields are provided
    if (!Age || !Address || !HP || !Gender || !userId) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Update query with placeholders
    const query = 'UPDATE profile SET age = ?, address = ?, hp_number = ?, gender = ? WHERE userid = ?';

    // Execute the query
    db.query(query, [Age, Address, HP, Gender, userId], (error, result) => {
        if (error) {
            return res.status(500).json({ error: 'Could not edit user profile', details: error.message });
        } else {
            return res.status(200).json({ success: true, message: "Profile updated successfully" });
        }
    });
});


// display appointment history from database
app.get('/appointment/history', (req, res) => {
    const { userId } = req.query;
    const showPastAppointments = req.query.past === 'true';  // If 'true', fetch past appointments only
  
    // Ensure 'userId' exists in the query
    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Adjust the SQL query based on the 'past' query parameter
    let sql = `
      SELECT service, DATE_FORMAT(booking_date, "%d %M %Y") AS booking_date, booking_time 
      FROM booking
      WHERE userId = ?
      ${showPastAppointments ? 'AND booking_date < CURDATE()' : 'AND booking_date >= CURDATE()'}
      ORDER BY booking_date DESC;
    `;
  
    console.log("SQL Query:", sql); // Log the SQL query for debugging
    console.log("Query Params:", [userId]); // Log the userId parameter
  
    db.query(sql, [userId], (error, result) => {
      if (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
      } else {
        console.log("Query Result:", result); // Log the result to check if it's empty
        res.status(200).json({ success: true, appointments: result || [] });
      }
    });
});


  
// display all the appointments that users make
app.get('/appointment/listAppointments', (req, res) => {
    const { userId } = req.query;
    
    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }

    const sql = 
        `SELECT service, DATE_FORMAT(booking_date, "%d %M %Y") as booking_date, booking_time FROM booking 
        WHERE userId = ? AND DATE(booking_date) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) 
        ORDER BY booking_date ASC
    `;

    db.query(sql, [userId], (error, result) => {
        if (error) {
            console.error("Failed to get data: ", error.message);
            res.status(500).send('Failed to fetch data');
        } else {
            res.status(200).json(result);
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`); 
})