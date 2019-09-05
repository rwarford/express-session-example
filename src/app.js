// src/app.js

import express from 'express';
import session from 'express-session';
import redis from 'redis';
import redisConnect from 'connect-redis';

/* -----------------------------------------------------------------------------
 * 
 * ---------------------------------------------------------------------------*/
const {
    PORT = 3001,
    STORE = 'memory',
    NODE_ENV = 'development',
    SESS_NAME = 'sid',
    SESS_SECRET = 'Secret for the session cookie! @2019',
} = process.env;

const IN_PROD = (NODE_ENV === 'production');

const RedisStore = redisConnect(session);
const redisClient = redis.createClient();

/* -----------------------------------------------------------------------------
 * User database
 * ---------------------------------------------------------------------------*/
const users = [
    { id: 1, name: 'Alex', email: 'alex@gmail.com', password: 'secret' },
    { id: 2, name: 'Max', email: 'max@gmail.com', password: 'secret' },
    { id: 3, name: 'Hagard', email: 'hagard@gmail.com', password: 'secret' },
];

/* -----------------------------------------------------------------------------
 * Express middleware.  If the user is not authenticated then redirect to the
 * login page.
 * ---------------------------------------------------------------------------*/
const redirectIfUnauthenticated = (req, res, next) => {
    if (!req.session.userId) {
        console.log('Unauthenticated, redirecting.', req.session);
        res.redirect('/login');
    } else {
        next();
    }
};

/* -----------------------------------------------------------------------------
 * Express middleware.  If the user is authenticated then redirect to the page.
 * ---------------------------------------------------------------------------*/
const redirectIfAuthenticated = (page) => {
    return (req, res, next) => {
        if (req.session.userId) {
            console.log(`Already authenticated, redirecting.`);
            res.redirect(page);
        } else {
            next();
        }
    }
};

/* -----------------------------------------------------------------------------
 * Express middleware.  If the user is not authenticated or not authorized for
 * this page, then return a 401 (NOT AUTHORIZED) error.
 * ---------------------------------------------------------------------------*/
const errorIfUnauthorized = (req, res, next) => {
    console.log('Checking authorization.');

    if (req.session.userId) {
        return next();
    }

    res.status(401);
    return res.send({error: 'unauthorized'});
};

/* -----------------------------------------------------------------------------
 * The express app.
 * ---------------------------------------------------------------------------*/
const app = express();

/* -----------------------------------------------------------------------------
 * Configure body parser middleware.
 * ---------------------------------------------------------------------------*/
app.use(express.urlencoded({extended: true}));

/* -----------------------------------------------------------------------------
 * Configure express-session middleware.
 * ---------------------------------------------------------------------------*/
app.use(session({
    name: SESS_NAME,
    store: STORE === 'redis' ? new RedisStore({client: redisClient}) : null,
    resave: false,
    saveUninitialized: false,
    secret: SESS_SECRET,
    cookie: {
        sameSite: true,
        //maxAge: 1000 * 5,
        secure: false, // IN_PROD, // if true the client must have a TLS connection (HTTPS)
    }
}));

/* -----------------------------------------------------------------------------
 * Middleware to set the local user object
 * ---------------------------------------------------------------------------*/
app.use((req, res, next) => {
    const { userId } = req.session;
    if (userId) {
        res.locals.user = users.find(user => user.id === req.session.userId);
    }
    next();
});

/* -----------------------------------------------------------------------------
 * 
 * ---------------------------------------------------------------------------*/
app.get('/', (req, res) => {
    const { user } = res.locals;

    console.log(`/ - userId: ${user ? user.id : undefined}`);

    res.send(`
        <h1>Welcome${user ? ' ' + user.name : ''}!</h1>
        ${user ? `
            <a href='/home'>Home</a>
            <form method='post' action='/logout'>
                <button>Logout</button>
            </form>
            ` : `
            <a href='/login'>Login</a>
            <a href='/register'>Register</a>
        `}
    `);
});

/* -----------------------------------------------------------------------------
 * 
 * ---------------------------------------------------------------------------*/
app.get('/home', redirectIfUnauthenticated, (req, res) => {
    const { user } = res.locals;
    res.send(`
        <h1>Home</h1>
        <a href='/'>Main</a>
        <ul>
            <li>Name: ${user.name }</li>
            <li>Email: ${user.email }</li>
        </ul>
    `);
});

/* -----------------------------------------------------------------------------
 * 
 * ---------------------------------------------------------------------------*/
app.route('/login')
    .get(redirectIfAuthenticated('/home'), (req, res) => {
        res.send(`
            <h1>Login</h1>
            <form method='post' action='/login'>
                <input type='email' name='email' placeholder='Email' required />
                <input type='password' name='password' placeholder='Password' required />
                <input type='submit' />
            </form>
            <a href='/register'>Register</a>
        `);
    })
    .post(redirectIfAuthenticated('/home'), (req, res) => {
        const { email, password } = req.body;

        console.log(`POST /login - email: ${email}.`);
        if (email && password) {
            const user = users.find(user => user.email === email.toLowerCase() && user.password === password);
            if (user) {
                console.log(`POST /login - Login suceeded, user.id: ${user.id}.`);
                req.session.userId = user.id;
                return res.redirect('/home');
            }
        }

        res.redirect('/login');
    });

/* -----------------------------------------------------------------------------
 * 
 * ---------------------------------------------------------------------------*/
app.route('/register')
    .get(redirectIfAuthenticated('/home'), (req, res) => {
        res.send(`
            <h1>Register</h1>
            <form method='post' action='/register'>
                <input type='text' name='name' placeholder='Name' required />
                <input type='email' name='email' placeholder='Email' required />
                <input type='password' name='password' placeholder='Password' required />
                <input type='submit' />
            </form>
            <a href='login'>Login</a>
        `);
    })
    .post(redirectIfAuthenticated('/home'), (req, res) => {
        const { name, email, password } = req.body;

        if (name && email && password) {
            const exists = users.some(user => user.email === email);
            if (!exists) {
                const user = {id: users.length + 1, name, email, password};
                users.push(user);
                req.session.userId = user.id;
                return res.redirect('/home');
            }
        }

        res.redirect('/register');
    });

/* -----------------------------------------------------------------------------
 * 
 * ---------------------------------------------------------------------------*/
app.route('/logout')
    .post(redirectIfUnauthenticated, (req, res) => {
        req.session.destroy(err => {if (err) return res.redirect('/home')});
        res.clearCookie(SESS_NAME);
        return res.redirect('/login');
    });

/* -----------------------------------------------------------------------------
 * 
 * ---------------------------------------------------------------------------*/
app.get('/api/test-data', errorIfUnauthorized, (req, res) => {
    res.json({text: 'Hello from server!'});
});

/* -----------------------------------------------------------------------------
 * 
 * ---------------------------------------------------------------------------*/
app.listen(PORT, () => 
    console.log(`Listening on http://localhost:${PORT}`)
);