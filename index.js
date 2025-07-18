require("dotenv").config(); // 🔼 Must be first
const express = require("express");
const cors = require("cors");
const { ObjectId } = require("mongodb");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;
const uri = process.env.MONGO_URI;

const admin = require("firebase-admin");
var serviceAccount = require("./firebase-key.json");
const { isValidObjectId } = require("mongoose");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(express.json());
app.use(cors());

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized access" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    // console.log("✅ Decoded Token:", decoded);
    req.decoded = decoded;
    next();
  } catch (error) {
    console.error("❌ Firebase token verification failed:", error);
    return res.status(403).send({ message: "Forbidden access", error });
  }
};

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
    const favouritesCollection = db.collection("favourites");

    // GET user info
    app.get("/users/info/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      if (user) {
        return res.json({
          role: user.role,
          subscriptionType: user.subscriptionType,
        });
      } else {
        return res.status(404).json({ role: null });
      }
    });

    // get user bio data
    app.get("/biodata", verifyToken, async (req, res) => {
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

    // get details bio data
    app.get("/singleBiodata/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const filter = { _id: new ObjectId(id) };
        if (!ObjectId.isValid(id)) {
          console.log("you are not");
        } else "i am okay";

        const result = await biodataCollection.findOne(filter);

        if (!result) {
          return res.status(404).json({ message: "Biodata not found" });
        }

        res.status(200).json({ success: true, data: result });
      } catch (error) {
        console.error("❌ Error fetching biodata:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // get similar bio data
    app.get("/biodata/similar/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const currentBiodata = await biodataCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!currentBiodata) {
          return res.status(404).json({ message: "Current biodata not found" });
        }

        const query = {
          _id: { $ne: new ObjectId(id) },
          biodataType: currentBiodata.biodataType,
        };

        const similarBiodatas = await biodataCollection
          .find(query)
          .limit(4)
          .toArray();

        res.status(200).json({ success: true, data: similarBiodatas });
      } catch (error) {
        console.error(" Error fetching similar biodata:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // GET premium bio data for home page /bio data/premium?sort=asc || desc
    app.get("/biodata/premium", async (req, res) => {
      try {
        const sortDirection = req.query.sort === "desc" ? -1 : 1;

        const premiumBiodata = await biodataCollection
          .find({ biodataStatus: "premium" })
          .sort({ age: sortDirection })
          .limit(8)
          .toArray();

        res.json({ success: true, data: premiumBiodata });
      } catch (error) {
        console.error("Error fetching premium biodata:", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    });

    // Get: already favourites or not
    app.get("/favourites/check/:email/:biodataId", async (req, res) => {
      const { email, biodataId } = req.params;

      const result = await favouritesCollection.findOne({
        userEmail: email,
        biodataId,
      });
      res.json({ isFavourite: !!result });
    });

    // post request
    app.post("/users", async (req, res) => {
      try {
        const data = req.body;
        const userInfo = {
          ...data,
          updatedAt: new Date(),
        };

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
    app.post("/biodata", verifyToken, async (req, res) => {
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
        updatedAt: new Date(),
        bioDataStatus: "free",
      });

      res.send({ success: true, biodataId: newId });
    });

    // post favorurites
    app.post("/favourites", async (req, res) => {
      const { userEmail, biodataId } = req.body;

      // Check if already favorites
      const alreadyExists = await favouritesCollection.findOne({
        userEmail,
        biodataId,
      });
      if (alreadyExists) {
        return res
          .status(400)
          .json({ message: "Already added to favourites." });
      }

      const result = await favouritesCollection.insertOne({
        userEmail,
        biodataId,
        favouritedAt: new Date(),
      });

      res.status(200).json({ success: true, data: result });
    });

    // patch
    app.patch("/biodata/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { _id, ...update } = req.body;

      const filter = { _id: new ObjectId(id) };

      const updateData = {
        $set: {
          ...update,
          updatedAt: new Date(),
        },
      };

      const result = await biodataCollection.updateOne(filter, updateData);

      res.send({ success: true, modifiedCount: result.modifiedCount });
    });

    app.patch("/request-premium/:id", async (req, res) => {
      const { id } = req.params;

      // Step 1: Update Biodata Collection
      const biodataFilter = { _id: new ObjectId(id) };
      const biodataUpdate = {
        $set: {
          bioDataStatus: "pending",
          updatedAt: new Date(),
        },
      };

      const biodataResult = await biodataCollection.updateOne(
        biodataFilter,
        biodataUpdate
      );

      // Step 2: Get the biodata to retrieve the email
      const biodata = await biodataCollection.findOne(biodataFilter);
      const userEmail = biodata?.contactEmail;

      if (!userEmail) {
        return res.status(404).json({
          success: false,
          message: "User email not found in biodata",
        });
      }

      // Step 3: Update User Collection
      const userFilter = { email: userEmail };
      const userUpdate = {
        $set: {
          subscriptionType: "pending",
          updatedAt: new Date(),
        },
      };

      const userResult = await usersCollection.updateOne(
        userFilter,
        userUpdate
      );

      // Step 4: Final Response
      if (biodataResult.modifiedCount > 0 && userResult.modifiedCount > 0) {
        return res.json({
          success: true,
          message: "Request sent for premium approval",
        });
      }

      res.status(400).json({
        success: false,
        message: "Failed to request premium",
      });
    });

    // DELETE: favourites
    app.delete("/favourites", async (req, res) => {
      try {
        const { userEmail, biodataId } = req.query;

        const result = await favouritesCollection.deleteOne({
          userEmail,
          biodataId,
        });

        if (result.deletedCount > 0) {
          res.json({ success: true, message: "Removed from favourites" });
        } else {
          res
            .status(404)
            .json({ success: false, message: "Favourite not found" });
        }
      } catch (error) {
        console.error("Error removing favourite:", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
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
