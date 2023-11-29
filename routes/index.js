const express = require('express')
const router = express.Router()
const db = require('../dbConnect')
const multer = require('multer')
const path = require('path')

const LIMIT = 5
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads') // Specify the directory where you want to save the uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`) // Set the filename to be unique using the current timestamp
    },
})

const upload = multer({ storage })

router.get('/', function (req, res) {
    res.render('sign-in')
})

router.get('/sign-up', function (req, res) {
    res.render('sign-up', { message: null })
})

router.get('/logout', async function (req, res) {
    try {
        const userId = req.query.userId
        await _logout(userId)
        res.redirect(`/`)
    } catch (error) {
        console.log(error)
    }
})

router.get('/inbox', async function (req, res) {
    try {
        const userId = req.query.userId
        const page = parseInt(req.query.page) || 1
        const users = await _getUserById(userId)
        const inboxes = await _getUserInbox(userId, page)
        const countResult = await _getTotalInbox(userId)
        const total = countResult[0].total
        const pages = Math.ceil(total / LIMIT)
        res.render('inbox', {
            user: users[0],
            inboxes,
            page,
            total,
            pages,
            screen: 'inbox',
        })
    } catch (error) {
        console.log(error)
    }
})

router.get('/outbox', async function (req, res) {
    try {
        const userId = req.query.userId
        const page = parseInt(req.query.page) || 1
        const users = await _getUserById(userId)
        const inboxes = await _getUserInbox(userId, page)
        const countResult = await _getTotalInbox(userId)
        const total = countResult[0].total
        const pages = Math.ceil(total / LIMIT)
        res.render('outbox', {
            user: users[0],
            inboxes,
            page,
            total,
            pages,
            screen: 'outbox',
        })
    } catch (error) {
        console.log(error)
    }
})

router.get('/detail', async function (req, res) {
    try {
        const userId = req.query.userId
        const emailId = req.query.emailId
        const users = await _getUserById(userId)
        const emails = await _getEmailById(emailId)
        const email = emails[0]
        res.render('detail', {
            user: users[0],
            email,
        })
    } catch (error) {
        console.log(error)
    }
})

router.get('/compose', async function (req, res) {
    try {
        const userId = req.query.userId
        const usersById = await _getUserById(userId)
        const listUsers = await _getAllUser()
        // if (!users.length) {

        // }
        res.render('compose', {
            user: usersById[0],
            users: listUsers,
        })
    } catch (error) {
        console.log(error)
    }
})

router.post('/login', (req, res) => {
    const { email, password } = req.body

    db.query('SELECT * FROM users WHERE email = ? and password = ?', [email, password], async (error, result) => {
        if (error) {
            console.log(error)
            return
        }
        const user = result[0] || null
        if (user) {
            db.query('UPDATE users SET logged_in = true WHERE id = ?', [user.id], (error, result) => {
                if (error) {
                    console.log(error)
                    return
                }
                res.redirect(`/inbox?userId=${user.id}`)
            })
            // res.redirect(`/inbox?userId=${user.id}`)
        }
    })
})

router.post('/register', async (req, res) => {
    const { name, email, password, password_confirm } = req.body

    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, result) => {
        if (error) {
            console.log(error)
            return
        }
        if (result.length > 0) {
            return res.render('sign-up', {
                message: 'This email address is already in use',
            })
        } else if (password.length < 3) {
            return res.render('sign-up', {
                message: 'The password is too short',
            })
        } else if (password !== password_confirm) {
            return res.render('sign-up', {
                message: 'Passwords do not match!',
            })
        }
    })

    db.query('INSERT INTO users SET?', { name, email, password }, (error, res) => {
        if (error) {
            console.log(error)
            return
        }
        return res.render('sign-up', {
            message: 'Sign up successfully',
        })
    })
})

router.post('/send-email', upload.single('file'), async (req, res) => {
    const { sender_id, receiver_id, subject, message } = req.body
    const created_at = new Date().toISOString().split('T')[0]
    const file = req.file ? req.file.filename : null
    db.query(`INSERT INTO emails SET?`, { sender_id, receiver_id, subject, message, file, created_at }, async (error, result) => {
        if (error) {
            console.log(error)
            return
        }
        res.redirect(`inbox?userId=${sender_id}`)
    })
})

router.get('/download', async (req, res) => {
    const emailId = req.query.emailId
    const emails = await _getEmailById(emailId)
    const fileName = emails[0].file
    const file = `${path.join(__dirname, '../uploads')}/${fileName}`
    res.download(file)
})

router.post('/delete-inbox', async (req, res) => {
    const userId = req.query.userId
    const arrayIds = req.body.mailIds
    await _deleteEmails(arrayIds)
    res.redirect(`inbox?userId=${userId}`)
})

router.post('/delete-outbox', async (req, res) => {
    const userId = req.query.userId
    const arrayIds = req.body.mailIds
    await _deleteEmails(arrayIds)
    res.redirect(`outbox?userId=${userId}`)
})

const _getUserById = userId => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM users WHERE id = ?', [userId], async (error, result) => {
            if (error) {
                return reject(error)
            }
            resolve(result)
        })
    })
}

const _getAllUser = () => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM users', async (error, result) => {
            if (error) {
                return reject(error)
            }
            resolve(result)
        })
    })
}

const _getEmailById = emailId => {
    return new Promise((resolve, reject) => {
        db.query(
            `SELECT emails.*, receiver.name AS receiver_name FROM emails JOIN
        users AS receiver ON emails.receiver_id = receiver.id WHERE emails.id = ?`,
            [emailId],
            async (error, result) => {
                if (error) {
                    return reject(error)
                }
                resolve(result)
            }
        )
    })
}

const _getUserInbox = (userId, page) => {
    const offset = (page - 1) * LIMIT
    return new Promise((resolve, reject) => {
        db.query(
            `SELECT emails.*,
            DATE_FORMAT(emails.created_at, '%Y-%m-%d') AS created_at,
        sender.name AS sender_name,
        receiver.name AS receiver_name FROM emails
         JOIN
        users AS sender ON emails.sender_id = sender.id
        JOIN
        users AS receiver ON emails.receiver_id = receiver.id WHERE sender_id = ? LIMIT ${LIMIT} OFFSET ${offset}`,
            [userId],
            async (error, result) => {
                if (error) {
                    return reject(error)
                }
                resolve(result)
            }
        )
    })
}

const _getTotalInbox = userId => {
    return new Promise((resolve, reject) => {
        db.query(
            `SELECT COUNT(*) as total from emails
        WHERE sender_id = ?`,
            [userId],
            async (error, result) => {
                if (error) {
                    return reject(error)
                }
                resolve(result)
            }
        )
    })
}

const _logout = userId => {
    return new Promise((resolve, reject) => {
        db.query('UPDATE users SET logged_in = false WHERE id = ?', [userId], (error, result) => {
            if (error) {
                return reject(error)
            }
            resolve(result)
        })
    })
}

const _deleteEmails = emailIds => {
    return new Promise((resolve, reject) => {
        db.query('DELETE FROM emails WHERE id IN (?)', [emailIds], (error, result) => {
            if (error) {
                return reject(error)
            }
            resolve(result)
        })
    })
}

module.exports = router
