require('dotenv').config();

var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync(process.env.KEY, 'utf8');
var certificate = fs.readFileSync(process.env.CRT, 'utf8');

var credentials = {key: privateKey, cert: certificate};

const express           = require('express');
const app               = express();
const favicon           = require('serve-favicon');
const morgan            = require('morgan');
const bodyParser        = require('body-parser');
const cookieParser      = require('cookie-parser');
const jwt               = require('jsonwebtoken');
const db                = require('./db');


app.set('views', './views');
app.set('view engine', "pug");

app.use('/static', express.static('public'));
//app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(morgan('short'));
app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);


app.get('/', checkURL, function(req,res){
    res.render('index', {user: db.users[req.user]['first_name'] + " " + db.users[req.user]['last_name'], sites: db.users[req.user]['sites']});
})

app.get('/auth',function(req,res){
    const error = req.query.error;
    if(error){
        res.render('auth', {error: db.errorCodes[error-1]});
        return;
    }
    res.render('auth');
})

app.post('/auth',function(req,res){
    const login     = req.body.login;
    const password  = req.body.password;
    const redirect  = req.body.redirect;
    const keepAlive = req.body.keepalive;

    if(db.users[login]){
        if(db.users[login]['password'] == password){
            const token = jwt.sign({user: login}, process.env.COOKIE_SECRET);
            
            let maxAge = 1000*60*60*2;
            if(keepAlive) maxAge=maxAge*12*365;
            res.cookie('zeus', token, {maxAge: maxAge, httpOnly: true});
            
            //use database
            if(!redirect || db.users[login]['sites'].indexOf(redirect)==-1){
                res.redirect('/');
                return;
            }

            res.redirect(redirect);
        }else{
            res.redirect("/auth?redirect="+redirect+"&error=2");
        }
    }else{
        res.redirect("/auth?redirect="+redirect+"&error=1");
    }
});

app.get('/check', function(req,res){
    const token = req.query.token;

    jwt.verify(token,process.env.COOKIE_SECRET, function(err,data){
        if(err){
            console.log('Failed to check token.');
            res.json({code:0});
        }else if(data.user){
            res.json({code:1});
        }
    })
});

app.get('/logout', function(req,res){
    res.clearCookie('zeus');
    res.redirect('/auth');
});

function checkURL(req,res,next){
    const zeusCookie = req.cookies.zeus;

    jwt.verify(zeusCookie,process.env.COOKIE_SECRET, function(err,data){
        if(err){
            res.redirect('/auth?error=3');
        }else if(data.user){
            req.user = data.user;
            next();
        }
    })
}


httpServer.listen(process.env.HTTP_PORT, console.log("HTTP server running on port "+ process.env.HTTP_PORT));
httpsServer.listen(process.env.HTTPS_PORT, console.log("HTTPS server running on port "+ process.env.HTTPS_PORT));
