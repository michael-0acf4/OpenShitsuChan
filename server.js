const express = require('express');
const app = express();
const requestIp = require('request-ip');
const favicon = require('serve-favicon')
const http = require('http').Server(app);
const session = require('express-session');
const MemoryStore = require('memorystore')(session); // ram based storage
let bodyParser = require('body-parser');

// [!] : May be useful. idk
const config = require('./tools/project.config.json'); // config file
const logger = require('./tools/logger').Create(__filename); // custom debugger

// [!] : favicon
app.use(favicon('./assets/favicon.ico'));

// [!] : post requests
app.use(bodyParser.urlencoded({ 
    extended: true,
    limit: '50mb' // we may send pictures so...
}));

// [!] : session handler
app.use(session({ 
    secret: 'mikachu-wow', 
    // session is stored in RAM
    store: new MemoryStore({
        checkPeriod: 24 * 3600 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: true
}));

// [!] : redirection handler
app.use (require ('./tools/SessionMiddleware'));

// [!] : CORS handler
app.use ((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// [!] set the view engine to ejs
app.set('view engine', 'ejs');

// [!] ip logs
// inside middleware handler
app.use ((req, res, next) => {
    const clientIp = requestIp.getClientIp(req); 
    // logger.info ('IP : ' + clientIp);
    next();
});

// [!] ---       controllers          ---
app.use ('/assets', express.static('./assets')); // static reference to the assets folder
app.use ('/home', require ("./controller/home"));
app.use ('/play', require ("./controller/play"));
app.use ('/error', require ("./controller/error"));
app.use ('/more', require ("./controller/more"));
app.use ('/tools', require ("./controller/tools"));
app.use ('/api', require ("./controller/api"));
app.use ('/statistics', require ("./controller/statistics"));
//     ---           end              ---

app.get ('/', (req, res) => {
	res.redirect ('/home');
});

// Handling non matching request from the client
app.use((req, res, next) => {
    res.redirect ('/error/404');
});

// if an error looks impossible to catch
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send('Something broke!')
})

// [!] : starts the server
const port = process.env.PORT || config.PORT;
const addr = config.SERVER_ADDR || 'localhost';
const server = http.listen(port, function(){
	logger.info(`[SERVER] Listening on ${ addr }:${ port }`);
});