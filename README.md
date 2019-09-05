# Session Authentication in Express

This example is based on [Session Authentication in Express](https://www.youtube.com/watch?v=OH6Z0dJ_Huk).

## Running the example

### Storing sessions in server memory

Run two instances of the server.
```bash
(PORT=3001 npm run dev_server) & (PORT=3002 npm run dev_server) && fg
```
Browse to http://localhost:3001.  Login then browse to http://localhost:3001/home.  Note that a session cookie is used to identify session data on the server.

Now try browsing to http://localhost:3002/home.  Note that the session information is not available on the second server.

Shut down both servers by pressing CTRL-C twice in the terminal where they are running.

### Using Redis to store sessions

Now run the example using Redis.  Install Redis locally then start the servers using redis as the session store:
```bash
(STORE=redis PORT=3001 npm run dev_server) & (STORE=redis PORT=3002 npm run dev_server) && fg
```

Browse to http://localhost:3001 and login.  Then browse to http://localhost:3002/home.  Note that the second server shares the session from the first server.