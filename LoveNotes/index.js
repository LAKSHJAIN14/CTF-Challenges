const express = require('express')
const crypto = require('crypto');
const bot = require('./bot')
const app = express()
const cookieParser = require('cookie-parser')
const rateLimit = require("express-rate-limit")
const port = 8012
app.use(cookieParser())
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs')
app.set('views', './views')

app.use((req, res, next) => {
    const nonce = crypto.randomBytes(16).toString('hex');
    res.locals.nonce = nonce;
    res.setHeader("Content-Security-Policy", 
        `default-src 'none'; ` +
        `script-src 'nonce-${nonce}'; ` + 
        `style-src 'nonce-${nonce}'; ` 
    );
    next();
});

// Try solving this on your own you dumbass 

// No spam please otherwise get a ban
const limit = rateLimit({
    windowMs: (bot.rateLimit.windowS || 60) * 1000, 
    max: bot.rateLimit.max || 5, 

    standardHeaders: true, 
    legacyHeaders: false,

    handler: (req, res, _next) => {
        
        const resetTime = req.rateLimit.resetTime;
        const timeRemaining = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;
        
        res.status(429).json({
            error: `Too many requests, please try again later after ${timeRemaining} seconds.`,
        });
    }
});

app.get('/', (req, res) => {
  res.redirect('/note');
});

app.get('/note', limit, (req, res) => {
  const userNote = req.query.note; 
  const secret = req.query.secret;
  const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  const cookie = req.cookies.flag
  res.render('index', {
    note : userNote,
    secret : secret,
    shareLink: fullUrl,
    cookie: cookie,
  });
});


app.post('/bot', (req, res) => {
    const { note, secret } = req.body;
    if (!note || !secret) {
        return res.status(400).send("Error: 'note' and 'secret' are required.");
    }
    const params = new URLSearchParams();
    params.append('note', note);
    params.append('secret', secret);
    const targetUrl = `http://localhost:${port}/note?${params.toString()}`;
    console.log(`[Server] Admin Bot visiting: ${targetUrl}`);

    bot.visitURL(targetUrl).catch(err => {
        console.error(`[Background Bot Error] ${err.message}`);
    });
    res.send(`
        <p>The Admin has been notified. They will visit your link shortly.</p>
    `);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
