var express = require('express')
var dbconfig = require('./config/database')
var passport = require('passport')
var flash = require('connect-flash')
var mysql = require('mysql')
var bcrypt = require('bcrypt-nodejs')
var bodyParser = require('body-parser')
var session = require('express-session')
var cookieParser = require('cookie-parser')
var LocalStrategy = require("passport-local").Strategy;
var morgan = require('morgan');



var app = express()

app.use(bodyParser.urlencoded({
    extended: true
}));
app.set("view engine", "ejs");
app.use('/public', express.static('public'));




var connection = mysql.createConnection(dbconfig.connection);

connection.connect((err) => {
    if (!err) {
        console.log("heyyyyy  database is working!!");
    } else {
        console.log("some error ecoured" + JSON.stringify(err, undefined, 2));
    }
});

connection.query('USE ' + dbconfig.database);

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    connection.query("SELECT * FROM users WHERE id = ? ", [id],
        function (err, rows) {
            done(err, rows[0]);
        });
});




app.use(morgan('dev'));
app.use(cookieParser());

app.use(session({
    secret: 'justasecret',
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.use(
    'local-signup',



    new LocalStrategy({
            usernameField: 'username',
            passwordField: 'password',
            passwordcheckField: 'passwordcheck',
            passReqToCallback: true
        },


        function (req, username, password, done) {
            connection.query("SELECT * FROM users WHERE username = ? ",
                [username],



                function (err, rows) {
                    if (err)
                        return done(err);
                    if (rows.length) {
                        return done(null, false, req.flash('signupMessage', 'That is already taken'));

                    } else {
                        var newUserMysql = {
                            username: username,
                            password: bcrypt.hashSync(req.body.password)
                        };



                        var insertQuery = "INSERT INTO users (username, password) values (?, ?)";

                        connection.query(insertQuery, [newUserMysql.username, newUserMysql.password],
                            function (err, rows) {
                                newUserMysql.id = rows.insertId;

                                return done(null, newUserMysql);
                            });
                    }
                });
        })
);



passport.use(
    'local-login',



    new LocalStrategy({
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true
        },

        function (req, username, password, done) {
            connection.query("SELECT * FROM users WHERE username = ? ", [username],


                function (err, rows) {

                    if (err)
                        return done(err);
                    if (!rows.length) {
                        return done(null, false, req.flash('loginMessage', 'No User Found'));
                    }


                    if (password !== rows[0].password)
                        return done(null, false, req.flash('loginMessage', 'Wrong Password'));


                    return done(null, rows[0]);
                });
        })
);

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}



app.get('/logout', function (req, res) {
    req.logOut();
    res.redirect('/');
});


app.get('/', function (req, res) {
    res.render('client/index', {
        message: req.flash('loginMessage')
    });
});

app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/home',
        failureRedirect: '/',
        failureFlash: true
    }),
    function (req, res) {
        if (req.body.remember) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
        } else {
            req.session.cookie.expires = false;
        }
        res.redirect('/');
    }
);

app.get('/signup', function (req, res) {
    res.render('client/signup', {
        message: req.flash('signupMessage')
    });
});

app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/home',
    failureRedirect: '/signup',
    failureFlash: true
}));


app.get("/home", isLoggedIn, (req, res) => {
    res.render('client/home')
})







app.listen(3000, () => {
    console.log("port 3000")
})