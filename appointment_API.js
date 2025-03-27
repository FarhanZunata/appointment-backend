const express = require('express');
const mysql = require('mysql');

const app = express();
const PORT = 3000;
app.use(express.json());

const db = mysql.createConnection({
    host: 'tramway.proxy.rlwy.net',
    user: 'root',
    password: 'BKpLYQqmgYRGtaVZDrUUSkLVrFYgFIPu',
    database: 'railway'
});

db.connect((error) => {
    if(error){
        console.error("Failed to connect to database: ", error.message);
    }else{
        console.log("Connected to database");
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
    const userSql = 'INSERT INTO users (username, email, password, kod_role) VALUES (?, ?, ?, ?)';
    db.query(userSql, [username, email, password, 'US'], (error, result) => {
        if (error) {
            console.error("Failed to register user: ", error.message);
            return res.status(500).json({ message: 'Failed to register user' });
        }

        const userID = result.insertId;

        // Insert into profile table
        const profileSql = 'INSERT INTO profile (userID, username, email) VALUES (?, ?, ?)';
        db.query(profileSql, [userID, username, email], (profileError) => {
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
    const { username, password }= req.body;
    
    // Validate username and password are not empty
    if(!username || !password){
        return res.json({
            status: 'failed',
            message: 'Username and password are required',
        });
    }

    // Query with BINARY to enforce case-sensitive username matching
    const sql = 'SELECT * FROM users WHERE BINARY username = ?';
    db.query(sql, [username], (error, result) => {
        if(error){
            console.error("Failed to login user: ", error.message);
            return res.status(500).json({ status: 'failed', message: 'Server error' });
        }
    
        if(result.length === 0){
            console.log(`Login failed: Username "${username}" not found`);
            return res.json({ status: 'failed', message: 'Invalid username or password'});
        }
    
        const user = result[0];
        console.log("User data retrieved:", user); // Debugging output
    
        if(user.password === password){
            console.log(`User "${username}" logged in successfully`);
    
            // Ensure `userId` exists before using it
            if (!user.userID) {
                console.error("Error: userId is missing in the database response.");
                return res.status(500).json({ status: 'failed', message: 'User ID missing' });
            }
    
            res.json({
                status: 'success',
                message: 'Logged in successfully',
                userId: user.userID,  // Ensure correct key name
                username: user.username
            });
        } else {
            console.log(`Login failed: Password mismatch for user "${username}"`);
            return res.json({ status: 'failed', message: 'Invalid username or password'});
        }
    });    
});

// display profile information for the logged in user
app.get('/appointment/displayProfile', (req, res) => {
    const { userID } = req.query;

    // Ensure userID is provided
    if(!userID){
        return res.status(400).json({ error: 'User ID is required' });
    }

    const sql = 'SELECT p.*, n.desc_negeri AS negeri_full, d.desc_daerah AS daerah_full, j.desc_jantina AS jantina_full ' + 
    'FROM profile p ' +
    'LEFT JOIN jantina j ON p.kod_jantina = j.kod_jantina ' + 
    'LEFT JOIN negeri n ON p.kod_negeri = n.kod_negeri ' + 
    'LEFT JOIN daerah d ON p.kod_daerah = d.kod_daerah WHERE p.userID = ?';

    db.query(sql, [userID], (error, result) => {
        if(error){
            console.error("Failed to get data: ", error.message);
            return res.status(500).json({ error: 'Failed to fetch profile data' });
        }

        if(result.length === 0){
            console.log(`No profile found for user ID "${userID}"`);
            return res.status(404).json({ error: 'No profile found' });
        }else{
            res.status(200).send(result[0]);
        }
    });
});

// REST API code for editing profile information for logged in user
app.post('/appointment/editProfile', (req, res) => {
    const { kod_jantina, kod_negeri, kod_daerah, nama_penuh, umur, alamat_1, alamat_2, hp_number, ic_number, userID } = req.body;

    // Ensure userID is provided
    if(!userID){
        return res.status(400).json({ error: 'User ID is required' });
    }

    const sql = 'UPDATE profile SET kod_jantina = ?, kod_negeri = ?, kod_daerah = ?, nama_penuh = ?,'
    + 'umur = ?, alamat_1 = ?,alamat_2 = ?, hp_number = ?, ic_number = ? WHERE userID = ? ';
    db.query(sql, [ kod_jantina, kod_negeri, kod_daerah, nama_penuh, umur, alamat_1, alamat_2, hp_number, ic_number, userID], (error, result) => {
        if(error){
            console.error("Failed to update data: ", error.message);
            return res.status(500).json({ error: 'Failed to update profile data' });
        }else{
            res.status(200).json({ message: 'Profile data updated successfully' });
        }
    });
});

app.get('/appointment/displayNegeri', (req, res) => {
    const sql = 'SELECT * FROM negeri';
    db.query(sql, [], (error, result) => {
        if(error){
            console.error("Failed to fetch data: ", error.message);
            res.status(500).send('Failed to display data negeri');
        }else{
            res.status(200).send(result);
        }
    });
});

// REST API code to display data daerah based on the selected negeri from database
app.get('/appointment/displayDaerah', (req, res) => {
    const { kod_negeri } = req.query; // Get kod_negeri from query parameters

    if (!kod_negeri) {
        return res.status(400).json({ error: "kod_negeri is required" });
    }

    const sql = 'SELECT * FROM daerah WHERE kod_negeri = ?';
    db.query(sql, [kod_negeri], (error, result) => {
        if (error) {
            console.error("Failed to fetch data: ", error.message);
            return res.status(500).json({ error: 'Failed to display data daerah' });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: 'No daerah found for the selected negeri' });
        }

        res.status(200).json(result);
    });
});

// display all the appointments services
app.get('/appointment/servicesList', (req, res) => {
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

// display all the service locations
app.get('/appointment/locationList', (req, res) => {
    const sql = 'SELECT * FROM klinik';
    db.query(sql, (error, result) => {
        if(error){
            console.error("Failed to get data: ", error.message);
            res.status(500).send('Failed to fetch data');
        }else{
            res.status(200).send(result);
        }
    });
});

// display all the appointments time slots
app.get('/appointment/timeSlots', (req, res) => {
    const sql = 'SELECT * FROM slots';
    db.query(sql, (error, result) => {
        if(error){
            console.error('Failed to get data: ', error.message);
            res.status(500).send('Failed to fetch data');
        }else{
            res.status(200).send(result);
        }
    });
});

// Confirm appointment and sent the data to the database
app.post('/appointment/confirmAppointment', (req, res) => {
    const { userID, selected_service, selected_location, location_address, booking_time, booking_date } = req.body;

    if(!userID){
        return res.status(400).json({ message: "User ID is required" });
    }

    const sql = `INSERT INTO booking (userID, selected_service, selected_location, location_address, booking_time, booking_date)
    VALUES (?,?,?,?,?,?)`;

    db.query(sql, [userID, selected_service, selected_location, location_address, booking_time, booking_date], (error, result) => {
        if(error){
            console.error("Failed to confirm appointment: ", error.message);
            return res.status(500).json({ message: 'Failed to confirm appointment '});
        }else{
            res.status(200).json({ message: 'Appointment confirmed successfully' });
        }
    });
});

// display new appointment from database
app.get('/appointment/fetchAppointment', (req, res) => {
    const { userID } = req.query;

    if(!userID){
        return res.status(400).json({ message: 'User ID is required' });
    }

    // Fetch the next appointment after today
    const sql = `
        SELECT selected_service, selected_location, location_address, DATE_FORMAT(booking_date, "%d %M %Y") AS booking_date, booking_time 
        FROM booking 
        WHERE userID = ? AND booking_date >= CURDATE()
        ORDER BY STR_TO_DATE(booking_date, '%Y-%m-%d') ASC, STR_TO_DATE(booking_time, '%h:%i %p') ASC 
        LIMIT 1;
    `;

    db.query(sql, [userID], (error, result) => {
        if(error){
            return res.status(500).json({ success: false, message: 'Failed to fetch appointment', error });
        }

        if(result.length > 0){
            res.status(200).json({ success: true, appointment: result[0] });
        }else{
            res.status(404).json({ success: false, message: 'No upcoming appointment found' });
        }
    });
});


// display all the appointments from database
app.get('/appointment/fetchListAppointments', (req, res) => {
    const { userID } = req.query;

    if(!userID){
        return res.status(400).json({ message: 'User ID is required' });
    }

    const sql = `SELECT selected_service, DATE_FORMAT(booking_date, "%d %M %Y") as booking_date, booking_time FROM booking
    WHERE userId = ? AND DATE(booking_date) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) ORDER BY booking_date ASC`;

    db.query(sql, [userID], (error, result) => {
        if(error){
            console.error("Failed to get data: ", error.message);
            res.status(500).send('Failed to fetch list appointments');
        }else{
            res.status(200).json(result);
        }
    });
});

// display appointment history from database
app.get('/appointment/fetchHistory', (req, res) => {
    const { userID } = req.query;
    const showPastAppointments = req.query.past === 'true'; // if 'true, fetch past appointments only

    // Ensure 'userID' exists in the query
    if(!userID){
        return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Adjust the SQL query based on the 'past' query parameter
    let sql = `SELECT selected_service, DATE_FORMAT(booking_date, "%d %M %Y") AS booking_date, booking_time
    FROM booking WHERE userID = ? ${showPastAppointments ? 'AND booking_date < CURDATE()' : 'AND booking_date >= CURDATE'}
    ORDER BY booking_date ASC`;

    console.log("Query Params: ", [userID]);

    db.query(sql, [userID], (error,result)=> {
        if(error){
            return res.status(500).json({ success: false, message: 'Failed to fetch history' });
        }else{
            console.log("Query Result: ", result); // Log the result to check if it's empty
            res.status(200).json({ success: true, appointments: result || [] });
        }
    });
});
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
})