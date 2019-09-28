const keys = require('./keys');

// Express App setup / library
const express = require('express');
// requiring body-parser library 
const bodyParser = require('body-parser');
//requiring cors library from one domain to another
const cors = require('cors');

// creating an app with expresss module
const app = express();
// cross origin resource 
app.use(cors());

// parse incoming request from reactjs app into json object
app.use(bodyParser.json());


// Postgres Client set up
// requiring a Pool module from PostgresSQL client
const { Pool } = require('pg');

const pgClient = new Pool ({
    user: keys.pgUser,
    host: keys.pgHOST,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort

});

pgClient.on('error', () => console.log('Lost PG connection'));


// create table insdie PostgresSQL

pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT').catch(err => console.log(err));


// redis Client Setup

const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000


});

// connection for redis duplicate 

const redisPublisher = redisClient.duplicate();


// express route handlers

app.get('/', (req, res)=> {

  res.send('Hi');


});

// Express queries the tables from the postgreSQL
app.get('/values/all', async() => {
    const values = await pgClient.query('SELECT * from values');
    res.send(values.rows);

});

// getting all the current values from postgreSQL

app.get('/values/current', async(req,res) => {
  redisClient.hgetall('values', (err, values) => {
      res.send(values);
  });
});


// posting to postgreSQL

app.post('/values', async(req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
     return res.status(422).send('Index too high');

  }
  

  redisClient.hset('values', index, "Nothing yet!'");
  redisPublisher.publish('insert', index);
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

  res.send({working: true});

});

// app listener at port 5000
app.listen(5000, err => {
  console.log('Listening');

} );


