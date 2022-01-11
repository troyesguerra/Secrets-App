//jshint esversion:6
require('dotenv').config()
const express = require('express');
const ejs = require('ejs');
const path = require('path');
const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const FacebookStrategy = require('passport-facebook').Strategy;


const app = express();

// Accessing our env variables
// console.log(process.env.API_KEY);

const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({
    extended: true
}));

app.set('view engine', 'ejs');

app.use(session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB', {
    useNewUrlParser: true
});
// mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String

});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Encryption Key

// userSchema.plugin(encrypt, {
//     secret: process.env.SECRET,
//     encryptedFields: ['password']
// });
// Add plugin before creating new mongoose model

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        // GOOGLE_CLIENT_ID
        clientSecret: process.env.CLIENT_SECRET,
        // GOOGLE_CLIENT_SECRET
        callbackURL: "http://localhost:3000/auth/google/secrets",
        // userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
    },
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({
            googleId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: "http://localhost:3000/auth/facebook/secrets"
    },
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({
            facebookId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get('/', (req, res) => {
    res.render('home.ejs');
});

app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile']
    })
)

app.get('/auth/google/secrets',
    passport.authenticate('google', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

app.get('/auth/facebook',
    passport.authenticate('facebook')
);

app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        res.redirect('/secrets');
    });

app.get('/login', (req, res) => {
    res.render('login.ejs');
});

app.get('/register', (req, res) => {
    res.render('register.ejs');
});

app.get('/secrets', (req, res) => {
    User.find({
            'secret': {
                $ne: null
            }
        })
        .then((foundUsers) => {
            if (foundUsers) {
                res.render('secrets', {
                    usersWithSecrets: foundUsers
                });
            }
        })
        .catch((err) => {
            console.log(err);
        })
})

app.get('/submit', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('submit')
    } else {
        res.redirect('/login')
    }
})

app.post('/submit', (req, res) => {
    const submittedSecret = req.body.secret

    // passportjs saves the user info in the req object
    console.log(req.user.id);

    User.findById(req.user.id)
        .then((foundUser) => {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function () {
                    res.redirect('/secrets');
                })
            }
        }).catch((err) => {
            console.log(err)
        });
})

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});


app.post('/register', (req, res) => {
    // passport-local-mongoose npm as middleman in creating a new account
    User.register({
        username: req.body.username
    }, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect('/register')
        } else {
            passport.authenticate('local')(req, res, function () {
                res.redirect('/secrets');
            })
        }
    })
})


app.post('/login', function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, (err) => {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate('local')(req, res, () => {
                res.redirect('/secrets');
            })
        }
    })
})


app.listen(port, () => console.log(`Server started at port: ${port}`));