//jshint esversion:6
require('dotenv').config()
const express = require('express');
const ejs = require('ejs');
const path = require('path');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');


const app = express();

// Accessing our env variables
console.log(process.env.API_KEY);

const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({
    extended: true
}));

app.set('view engine', 'ejs');

mongoose.connect('mongodb://localhost:27017/userDB', {
    useNewUrlParser: true
});

const userSchema = new mongoose.Schema({
    email: String,
    password: String

});

// Encryption Key

userSchema.plugin(encrypt, {
    secret: process.env.SECRET,
    encryptedFields: ['password']
});
// Add plugin before creating new mongoose model


const User = new mongoose.model('User', userSchema);

app.get('/', (req, res) => {
    res.render('home.ejs');
});
app.get('/login', (req, res) => {
    res.render('login.ejs');
});
app.get('/register', (req, res) => {
    res.render('register.ejs');
});

app.post('/register', (req, res) => {
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });

    newUser.save(function (err) {
        if (err) {
            console.log(err)
        } else {
            console.log('Account successfully saved to User Data Base')
            res.render('secrets.ejs')
        }
    })
})

app.post('/login', function (req, res) {
    const {
        username
    } = req.body;
    const {
        password
    } = req.body;

    User.findOne({
        email: username
    }, function (err, foundUser) {
        if (err) {
            console.log(err)
        } else {
            if (foundUser) {
                if (foundUser.password === password) {
                    res.render('secrets.ejs')
                }
            }
        }
    })
})


app.listen(port, () => console.log(`Server started at port: ${port}`));