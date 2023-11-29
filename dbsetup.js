const mysql = require('mysql2')
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'wpr',
    password: 'fit2023',
    database: 'wpr2023',
})
connection.connect(function (error) {
    if (!!error) {
        console.log(error)
        return
    }
    connection.query('CREATE DATABASE IF NOT EXISTS wpr2023', err => {
        if (err) {
            console.error('Error creating database:', err)
        }
        console.log('Database created')
        connection.query('USE wpr2023', err => {
            if (err) {
                console.error('Error switching to database:', err)
                return
            }
            const createTableQuery = `
                    CREATE TABLE IF NOT EXISTS users (
                      id INT PRIMARY KEY AUTO_INCREMENT,
                      name VARCHAR(255) NOT NULL,
                      email VARCHAR(255) NOT NULL,
                      password varchar(255) NOT NULL,
                      logged_in BOOLEAN
                    )
                  `
            connection.query(createTableQuery, err => {
                if (err) {
                    console.error('Error create table:', err)
                    return
                }
                const insertDataQuery = `
                                    INSERT INTO users (name, email, password, logged_in)
                                    VALUES
                                    ('a', 'a@a.com', '123', false),
                                    ('b', 'b@b.com', '123', false),
                                    ('c', 'c@c.com', '123', false)
                                `
                connection.query(insertDataQuery, err => {
                    if (err) {
                        console.error('Error insert table:', err)
                    }
                    console.log('Insert into database')
                })

                const createEmailQuery = `CREATE TABLE IF NOT EXISTS emails (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    sender_id INT,
                    receiver_id INT,
                    subject VARCHAR(255),
                    message VARCHAR(255),
                    file VARCHAR(2000),
                    created_at DATE,
                    FOREIGN KEY (sender_id) REFERENCES users(id)
                  )`

                connection.query(createEmailQuery, err => {
                    if (err) {
                        console.error('Error create emails table:', err)
                        return
                    }
                    const insertDataQuery = `
                                    INSERT INTO emails (sender_id, receiver_id, subject, message, file, created_at)
                                    VALUES
                                    (1, 2, 'facebook', 'halo', null, CURDATE()),
                                    (1, 2, 'twitter', 'how are you', null, CURDATE()),
                                    (1, 3, 'google', 'fine!' , null, CURDATE())
                                `
                    connection.query(insertDataQuery, err => {
                        if (err) {
                            console.error('Error insert emails table:', err)
                        }
                        console.log('Insert into emails')
                    })
                    connection.end()
                })
            })
        })
    })
})

module.exports = connection
