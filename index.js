const express = require('express');
const cors = require('cors');
require('dotenv').config()
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

app.use(
    cors({
      origin: [
        "http://localhost:5173",
      ],
      credentials: true,
    })
  );
app.use(express.json());
app.use(cookieParser())

const verifyToken = (req,res, next) =>{
    const token = req.cookies?.token;
    if(!token){
        return res.status(401).send({ message : 'unauthorized access'});
    }
    if(token){
        jwt.verify(token, process.env.SECRET_KEY, (err, dec)=>{
            if (err){
                return res.status(401).send({ message : 'unauthorized access'})
            }
            else {
                req.user = dec;
                next();
            }
        })
    }
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vo0jwvs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  };

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const queriesCollection = client.db('alterNavi').collection('queries');


    app.get('/jwt', async(req,res)=>{
        const user = req.body;
        const token = jwt.sign(user, process.env.SECRET_KEY,{
            expiresIn: '1d'
        })
        res.cookie('token', token, cookieOptions)
        
        .send({success : true})
    })

    app.post('/add-query', async(req,res)=>{
        const query = req.body;
        const result = await queriesCollection.insertOne(query);

        res.send(result)
    })
    app.get('/queries', async(req,res)=>{
        const cursor = queriesCollection.find();
        const result = await cursor.toArray();
        res.send(result)
    })

    app.get('/queries/:email', async(req,res)=>{
      const email = req.params.email;
      const query = {email: email}
      const result = await queriesCollection.find(query).toArray();
      res.send(result)
    })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('server is runnig very high')
})
app.listen(port, ()=>{
    console.log(`the server is runnig on this port ${port}`)
})