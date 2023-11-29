const express = require('express')
const path = require('path')
const app = express()
const cookieParser = require('cookie-parser')

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'views')))
app.use(cookieParser())
app.set('view engine', 'ejs')

var router = require('./routes')

app.use('/', router)

app.listen(8000)
console.log('Server is listening on port 8080')
