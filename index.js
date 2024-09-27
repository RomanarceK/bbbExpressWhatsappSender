const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require("dotenv").config();
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const { connectToDatabase } = require('./mongodb');
const conversationsRoutes = require('./routes/conversations');
const usersRoutes = require('./routes/users');
const setilRoutes = require('./routes/setil');
const bbbExpressRoutes = require('./routes/bbb-express');
const gilettaRoutes = require('./routes/estudio-giletta');
const slackRoutes = require('./routes/slack-live');
const allowedOrigins = ['https://interfaz-avi.onrender.com', 'http://localhost:3000', 'https://avi-flyup.ar', 'http://127.0.0.1:5500'];

const app = express();
const port = 3001;

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
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
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

app.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});