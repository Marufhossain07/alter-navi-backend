const express = require('express');
const cors = require('cors');
require('dotenv').config()
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

app.use(
  cors({
    origin: [
      "https://alter-navi.web.app",
      "http://localhost:5173",
      "https://alter-navi.firebaseapp.com"
    ],
    credentials: true,
    optionSuccessStatus: 200
  })
);
app.use(express.json());
app.use(cookieParser())

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  if (token) {
    jwt.verify(token, process.env.SECRET_KEY, (err, dec) => {
      if (err) {
        return res.status(401).send({ message: 'unauthorized access' })
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
    const recommendationsCollection = client.db('alterNavi').collection('recommendations')


    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, {
        expiresIn: '1d'
      })
      res.cookie('token', token, cookieOptions)

        .send({ success: true })
    })

    app.get("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    app.post('/add-query', async (req, res) => {
      const query = req.body;
      const result = await queriesCollection.insertOne(query);

      res.send(result)
    })
    app.get('/queries', async (req, res) => {
      const search = req.query.search;
      let query = {}
      if (search) {
        query = {
          product: { $regex: search, $options: 'i' },
        }
      }


      const result = await queriesCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/my-queries/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const options = {
        sort: {
          time: -1
        }
      }
      const result = await queriesCollection.find(query, options).toArray();
      res.send(result)
    })

    app.delete('/my-queries/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queriesCollection.deleteOne(query);
      res.send(result)
    })

    app.get('/queries/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await queriesCollection.findOne(query);
      res.send(result);
    })

    app.post('/recommend', async (req, res) => {
      const recommendation = req.body;
      const result = await recommendationsCollection.insertOne(recommendation);
      const updateDoc = {
        $inc: {
          recommendationsCount: 1
        }
      }
      const filter = { _id: new ObjectId(recommendation.queryId) }
      const updatedCount = await queriesCollection.updateOne(filter, updateDoc);
      console.log(updatedCount)
      res.send(result)
    })

    app.get('/recommendations/:id', async (req, res) => {
      const id = req.params.id;
      const query = { queryId: id };
      const result = await recommendationsCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/my-recommendations/:recEmail', verifyToken, async (req, res) => {
      const email = req.params.recEmail;
      const query = { recEmail: email };
      const result = await recommendationsCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/recommendations-for-me/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await recommendationsCollection.find(query).toArray();
      res.send(result)
    })

    app.put('/queries/:id', async (req, res) => {
      const id = req.params.id;
      const updatedQuery = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = {
        upsert: true
      }
      const updatedDoc = {
        $set: {
          product: updatedQuery.product,
          photo: updatedQuery.photo,
          brand: updatedQuery.brand,
          details: updatedQuery.details,
          title: updatedQuery.title,
          time: updatedQuery.time,
        }
      }

      const result = await queriesCollection.updateOne(filter, updatedDoc, options);
      res.send(result)
    })

    app.delete('/my-recommendations/:queryId/:id', verifyToken, async (req, res) => {
      const queryId = req.params.queryId;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const filter = { _id: new ObjectId(queryId) }
      const updateDoc = {
        $inc: {
          recommendationsCount: -1
        }
      }
      const updatedCount = await queriesCollection.updateOne(filter, updateDoc);
      const result = await recommendationsCollection.deleteOne(query);
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


app.get('/', (req, res) => {
  res.send('server is running very high')
})
app.listen(port, () => {
  console.log(`the server is running on this port ${port}`)
})