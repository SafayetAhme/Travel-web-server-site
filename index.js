const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.BD_USER}:${process.env.DB_PASS}@cluster0.jfiige1.mongodb.net/?retryWrites=true&w=majority`;

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


        const menusCollection = client.db("Travel-website").collection("menus");
        const usersCollection = client.db("Travel-website").collection("users");
        const paymentCollection = client.db("Travel-website").collection("payments");

        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            });
            res.send({ token });
        })

        // get menus
        app.get('/menus', async (req, res) => {
            const result = await menusCollection.find().toArray();
            res.send(result);
        })

        // post menus item
        app.post('/menus', async (req, res) => {
            const item = req.body;
            const result = await menusCollection.insertOne(item);
            res.send(result);
        })

        // menus related api
        app.delete('/menus/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menusCollection.deleteOne(query)
            res.send(result);
        })

        // menus related api
        app.get('/menus/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menusCollection.findOne(query)
            res.send(result);
        })

        // menus related api
        app.patch('/menus/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: item.name,
                    category: item.category,
                    Price: parseFloat(item.Price),
                    Ratings: item.Ratings,
                    location: item.location,
                    descriptionOne: item.descriptionOne,
                    images: res.item.display_url
                }
            }
            const result = await menusCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        // users related api
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const axistingUser = await usersCollection.findOne(query);
            if (axistingUser) {
                return res.send({ message: 'user already asists', insertedId: null })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        // middlewares
        const verifyToken = (req, res, next) => {
            console.log('inside verify token', req.headers);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'forbidden access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'forbidden access' })
                }
                req.decoded = decoded;
                next();
            })

        }
        // users related api
        app.get('/users', verifyToken, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });

        // users related api
        app.delete('/users/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        // use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

        // admin relate api
        app.get('/users/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'unauthorized access' })
            }

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            console.log(user)
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        })

        // admin related api
        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        // payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { Price } = req.body;
            const amount = parseInt(Price * 100);
            console.log(amount, 'about inside the intent')

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card'],
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });

        // payment intent
        app.post('/payments', async (req, res) => {
            const item = req.body;
            const result = await paymentCollection.insertOne(item);
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




app.get('/', (req, res) => {
    res.send('doctor issssssss running')
})

app.listen(port, () => {
    console.log(`travel server is running on port ${port}`)
})