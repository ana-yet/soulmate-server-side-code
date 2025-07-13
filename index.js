require("dotenv").config(); // 🔼 Must be first
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;
const uri = process.env.MONGO_URI;

if (!uri) {
  console.error(" MONGO_URI is not defined in .env file!");
  process.exit(1);
}

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("matrimony");
    const usersCollection = db.collection("users");
    const biodataCollection = db.collection("biodata");

    // GET user role
    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      if (user) {
        return res.json({ role: user.role });
      } else {
        return res.status(404).json({ role: null });
      }
    });

    // get bio data
    app.get("/biodata", async (req, res) => {
      try {
        const email = req.query.email;

        const query = { contactEmail: email };
        const biodata = await biodataCollection.findOne(query);

        if (!biodata) {
          return res.status(200).json({
            success: true,
            data: null,
            message: "No biodata found for this user",
          });
        }

        res.status(200).json({
          success: true,
          data: biodata,
        });
      } catch (error) {
        console.error("Error fetching biodata:", error);
        res.status(500).json({
          success: false,
          message: "Internal Server Error",
        });
      }
    });

    // post request
    app.post("/users", async (req, res) => {
      try {
        const userInfo = req.body;

        const existingUser = await usersCollection.findOne({
          email: userInfo.email,
        });

        if (existingUser) {
          return res.send({
            message: " User already exists",
            user: existingUser,
          });
        }

        const result = await usersCollection.insertOne(userInfo);
        res.status(201).send({
          message: "New user created",
          insertedId: result.insertedId,
        });
      } catch (err) {
        console.error(" Error creating user:", err);
        res.status(500).send({ error: "Server error" });
      }
    });

    // post bio data
    app.post("/biodata", async (req, res) => {
      const { contactEmail } = req.body;

      // 1. Check if user already has biodata
      const existing = await biodataCollection.findOne({ contactEmail });
      if (existing) {
        return res.status(400).json({ message: "Biodata already exists." });
      }

      // 2. Get the latest biodataId
      const lastBiodata = await biodataCollection
        .find()
        .sort({ biodataId: -1 })
        .limit(1);
      const newId = lastBiodata.length > 0 ? lastBiodata[0].biodataId + 1 : 1;

      // 3. Create new biodata
      const result = await biodataCollection.insertOne({
        ...req.body,
        biodataId: newId,
        createdAt: new Date(),
        isPublished: true,
      });

      res.send({ success: true, biodataId: newId });
    });

    // patch
    app.patch("/biodata/:email", async (req, res) => {
      const { email } = req.params;
      const update = req.body;

      const result = await biodataCollection.updateOne(
        { email },
        { $set: { ...update, updatedAt: new Date() } }
      );

      res.send({ success: true, modifiedCount: result.modifiedCount });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "✅ Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is  brother!");
});

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});
