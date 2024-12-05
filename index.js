const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require("dotenv").config();
const http = require('http');
const { initSocketIO } = require('./socket');
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const { connectToDatabase } = require('./mongodb');
const conversationsRoutes = require('./routes/conversations');
const usersRoutes = require('./routes/users');
const setilRoutes = require('./routes/setil');
const wodaRoutes = require('./routes/woda');
const bbbExpressRoutes = require('./routes/bbb-express');
const gilettaRoutes = require('./routes/estudio-giletta');
const slackRoutes = require('./routes/slack-live');
const ealgroupRoutes = require('./routes/ealgroup');

const app = express();
const port = process.env.PORT || 3001;

const server = http.createServer(app);
initSocketIO(server);

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256', 'HS256'],
});

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.raw({ type: '*/*' }));

connectToDatabase();

app.use('/api/conversations', checkJwt, conversationsRoutes);
app.use('/api/users', checkJwt, usersRoutes);
app.use('/api/setil', setilRoutes);
app.use('/api/bbb-express', bbbExpressRoutes);
app.use('/api/giletta', gilettaRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/woda', wodaRoutes);
app.use('/api/ealgroup', ealgroupRoutes);

server.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});