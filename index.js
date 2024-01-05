const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
// middleware
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ist6ay7.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("Jerin's-db").collection("service");
    const bookingCollection = client.db("Jerin's-db").collection("booking");
    const usersCollection = client.db("Jerin's-db").collection("users");
    const reviewsCollection = client.db("Jerin's-db").collection("reviews");


    app.post("/jwt",async(req,res) => {
      const user= req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{ expiresIn:'1h'})
      res.send({token});
  })

   // Warning: use verifyJWT before using verifyAdmin
   const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email }
    const user = await usersCollection.findOne(query);
    if (user?.role !== 'admin') {
      return res.status(403).send({ error: true, message: 'forbidden account' });
    }
    next();
  }

    // users collection
   app.get("/users",verifyJWT,async(req,res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
  })

  app.get('/users/admin/:email',verifyJWT, async (req, res) => {
    const email = req.params.email;
    if(req.decoded.email!== email) {
      res.send({admin:false, message:'forbidden access'});
    }
    const query = { email: email }  
    const user = await usersCollection.findOne(query);
    const result = {admin: user?.role == 'admin'}
    res.send(result);
  })

  app.patch("/users/admin/:id",async(req,res) => {
    const id = req.params.id;
    const filter={_id: new ObjectId(id)};
    const updateDoc = {
      $set: {
        role: 'admin'
      },
    };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
})

app.put('/users/:email', async (req, res) => {
  const email = req.params.email
  const user = req.body
  if (!user.role && user.role !== 'admin') {
    user.role = 'client'; // Default role for new signups
  }

  const query = { email: email }
  const options = { upsert: true }
  const updateDoc = {
    $set: user,
  }

  const result = await usersCollection.updateOne(query, updateDoc, options)
  res.send(result)
})

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = {email:email};
      const result = await usersCollection.findOne(query);
      res.send(result);
    })

    app.get("/services",async(req,res) => {
        const result = await serviceCollection.find().toArray();
        res.send(result);
    })

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    })

    app.put('/services/:id', async (req, res) => {
      const id = req.params.id;
      const service = req.body;
      const query = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updateService = {
        $set: {
          title:service.title,
          price: service.price,
          description: service.description
        }
      }
      const result = await serviceCollection.updateOne(query, updateService, options);
      res.send(result);
    })

    app.post("/services",verifyJWT,verifyAdmin,async(req,res) => {
      const item= req.body;
      const result = await serviceCollection.insertOne(item)
      res.send(result);
  })

 
  app.delete('/services/:id',verifyJWT,verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await serviceCollection.deleteOne(query);
    res.send(result);
  })

    // booking collection
    app.get("/booking",verifyJWT,async(req,res) => {
      const email = req.query.email;
      if(!email) {
        res.send(404);
      }
      const decodedEmail = req.decoded.email;
      if(email!== decodedEmail) {
        res.status(403).send({error:true, message:'forbidden access'});
      }
      const query ={email: email};

      const result = await bookingCollection.find(query).toArray();
      res.send(result);
  })

  app.get("/bookings",async(req,res) => {
 const result = await bookingCollection.find().toArray();
    res.send(result);
})

    app.post("/booking",async(req,res) => {
      const item= req.body;
      const result = await bookingCollection.insertOne(item)
      res.send(result);
  })

  // reviews apis

  app.post("/reviews",verifyJWT,async(req,res) => {
    const reviews= req.body;
    const result = await reviewsCollection.insertOne(reviews)
    res.send(result);
})
app.get('/reviews', async(req, res) => {
  const result = await reviewsCollection.find().toArray();
	res.send(result);
  });

    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) =>{
    res.send('admin is sitting')
})

app.listen(port,() =>{
    console.log(`Jerin's Parlour is sitting on port ${port}`)
})