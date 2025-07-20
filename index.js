require("dotenv").config(); // 🔼 Must be first
const express = require("express");
const cors = require("cors");
const { ObjectId } = require("mongodb");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;
const uri = process.env.MONGO_URI;

const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_KEY);

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

const verifyAdmin = async (req, res, next) => {
  try {
    const requesterEmail = req.user?.email;
    if (!requesterEmail) {
      return res.status(401).json({ message: "Unauthorized. No user email." });
    }

    const user = await req.usersCollection.findOne({ email: requesterEmail });

    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden. Admins only." });
    }

    next(); // ✅ Admin confirmed, proceed
  } catch (error) {
    console.error("Admin verification failed:", error);
    res.status(500).json({ message: "Internal Server Error" });
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
    const biodataRequestCollection = db.collection("biodataRequest");
    const successStoriesCollection = db.collection("successStories");

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

    // Get: already favourites or not for details page
    app.get("/favourites/check/:email/:biodataId", async (req, res) => {
      const { email, biodataId } = req.params;

      const result = await favouritesCollection.findOne({
        userEmail: email,
        biodataId,
      });
      res.json({ isFavourite: !!result });
    });

    // Get: the all favourites data
    app.get("/favourites/:email", async (req, res) => {
      const { email } = req.params;

      try {
        // Step 1: Find favourite biodata IDs for this user
        const favourites = await favouritesCollection
          .find({ userEmail: email })
          .toArray();

        const biodataIds = favourites.map((fav) => new ObjectId(fav.biodataId));

        // Step 2: Get the biodata details from biodataCollection
        const biodatas = await biodataCollection
          .find({ _id: { $in: biodataIds } })
          .toArray();

        res.send({ success: true, data: biodatas });
      } catch (error) {
        console.error("Error fetching favourites:", error);
        res.status(500).send({ success: false, message: "Server Error" });
      }
    });

    // get: all bio data by filtering
    app.get("/biodatas", async (req, res) => {
      try {
        const {
          search = "",
          minAge,
          maxAge,
          biodataType,
          division,
          page = 1,
          limit = 9,
        } = req.query;

        const query = {};

        //  Search by name, occupation, or division
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { occupation: { $regex: search, $options: "i" } },
            { permanentDivision: { $regex: search, $options: "i" } },
          ];
        }

        //  Age range filter
        if (minAge && maxAge) {
          query.age = {
            $gte: parseInt(minAge),
            $lte: parseInt(maxAge),
          };
        }

        //  Gender / Biodata Type filter
        if (biodataType) {
          query.biodataType = biodataType;
        }

        //  Division filter
        if (division) {
          query.permanentDivision = division;
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        if (!query) {
          const res = await biodataCollection.find().toArray();
          res.send({
            success: true,
            data: biodatas,
            total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
          });
        }

        const total = await biodataCollection.countDocuments(query);
        const biodatas = await biodataCollection
          .find(query)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        res.send({
          success: true,
          data: biodatas,
          total,
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        });
      } catch (error) {
        console.error("Error in biodata search/filter:", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    });

    // Get: my contact request data
    app.get("/my-contact-requests", async (req, res) => {
      try {
        const userEmail = req.query.email;

        if (!userEmail) {
          return res.status(400).json({ message: "Missing email in body" });
        }

        const requests = await biodataRequestCollection
          .aggregate([
            {
              $match: { requesterEmail: userEmail },
            },
            {
              $lookup: {
                from: "biodata",
                localField: "requestedBiodataId",
                foreignField: "biodataId",
                as: "biodataDetails",
              },
            },
            {
              $unwind: "$biodataDetails",
            },
            {
              $project: {
                _id: 1,
                biodataId: "$requestedBiodataId",
                status: 1,
                requestedAt: 1,
                name: "$biodataDetails.name",
                mobile: {
                  $cond: [
                    { $eq: ["$status", "approved"] },
                    "$biodataDetails.mobileNumber",
                    null,
                  ],
                },
                email: {
                  $cond: [
                    { $eq: ["$status", "approved"] },
                    "$biodataDetails.contactEmail",
                    null,
                  ],
                },
              },
            },
          ])
          .toArray();

        res.status(200).json(requests);
      } catch (error) {
        console.error("Error fetching contact requests:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // ADMIN: get: /users?search=name
    app.get("/users", async (req, res) => {
      try {
        const search = req.query.search || "";
        const query = {
          name: { $regex: search, $options: "i" },
        };

        const users = await usersCollection.find(query).toArray();
        res.status(200).json(users);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });
    // get the premium bio data request
    app.get("/pending-premium-biodatas", async (req, res) => {
      try {
        const pending = await biodataCollection
          .find({ bioDataStatus: "pending" })
          .sort({ createdAt: -1 })
          .toArray();
        res.status(200).json(pending);
      } catch (err) {
        res.status(500).json({ message: "Server Error" });
      }
    });
    // Get the pending contact requests
    app.get("/pending-contact-requests", async (req, res) => {
      try {
        const requests = await biodataRequestCollection
          .find({ status: "pending" })
          .sort({ createdAt: -1 })
          .toArray();
        res.status(200).json({ success: true, data: requests });
      } catch (error) {
        console.error("Failed to fetch contact requests:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // get the success story request
    app.get("/pending-success-stories", async (req, res) => {
      try {
        const pendingStories = await successStoriesCollection
          .find({ status: "pending" })
          .toArray();

        res.status(200).json({
          success: true,
          data: pendingStories,
        });
      } catch (error) {
        console.error("Error fetching pending success stories:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch pending success stories",
        });
      }
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

    // post the bio data request
    app.post("/biodata-requests", async (req, res) => {
      const { requesterEmail, requestedBiodataId, requesterName } = req.body;

      if (!requesterEmail || !requestedBiodataId || !requesterName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const alreadyExists = await biodataRequestCollection.findOne({
        requesterEmail,
        requestedBiodataId,
        requesterName,
      });

      if (alreadyExists) {
        return res
          .status(409)
          .json({ message: "You have already requested this biodata" });
      }

      const result = await biodataRequestCollection.insertOne({
        requesterEmail,
        requestedBiodataId,
        requesterName,
        status: "pending",
        requestedAt: new Date(),
      });

      res.status(201).json({ success: true, message: "Request sent", result });
    });

    // post billing info
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    });

    //POST : success story
    app.post("/success-stories", async (req, res) => {
      try {
        const {
          selfBiodataId,
          partnerBiodataId,
          coupleImage,
          successStory,
          marriageDate,
          shareOnHomePage = false,
        } = req.body;

        if (
          !selfBiodataId ||
          !partnerBiodataId ||
          !coupleImage ||
          !successStory ||
          !marriageDate
        ) {
          return res.status(400).json({ message: "All fields are required." });
        }

        const existingStory = await successStoriesCollection.findOne({
          selfBiodataId: selfBiodataId,
        });

        if (existingStory) {
          return res
            .status(409)
            .json({ message: "Success story already submitted." });
        }

        const newStory = {
          selfBiodataId: parseInt(selfBiodataId),
          partnerBiodataId: parseInt(partnerBiodataId),
          coupleImage,
          successStory,
          shareOnHomePage,
          marriageDate,
          status: "pending",
          createdAt: new Date(),
        };

        const result = await successStoriesCollection.insertOne(newStory);

        res.status(201).json({
          success: true,
          message: "Success story submitted for review.",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error submitting success story:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
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

      if (biodataResult.modifiedCount > 0) {
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

    // ADMIN: make admin  patch: users/admin/:id
    app.patch("/users/admin/:id", async (req, res) => {
      const userId = req.params.id;

      try {
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { role: "admin" } }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .json({ message: "User not found or already admin" });
        }

        res.status(200).json({ message: "User promoted to admin" });
      } catch (error) {
        console.error("Admin update error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    //admin: for making premium PATCH /users/premium/:id
    app.patch("/users/premium/:id", async (req, res) => {
      const userId = req.params.id;

      try {
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { subscriptionType: "premium" } }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .json({ message: "User not found or already premium" });
        }

        res.status(200).json({ message: "User upgraded to premium" });
      } catch (error) {
        console.error("Premium update error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // [admin] /approve-premium/:biodataId request
    app.patch("/approve-premium/:biodataId", async (req, res) => {
      const { biodataId } = req.params;
      try {
        const result = await biodataCollection.updateOne(
          { _id: new ObjectId(biodataId) },
          { $set: { bioDataStatus: "premium", updatedAt: new Date() } }
        );
        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .json({ message: "Biodata not found or already premium" });
        }
        res.status(200).json({ message: "Biodata approved for premium" });
      } catch (err) {
        res.status(500).json({ message: "Failed to update biodata" });
      }
    });

    // admin for approve contact request
    app.patch("/approve-contact/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const filter = { _id: new ObjectId(id) };
        const updateDoc = { $set: { status: "approved" } };

        const result = await biodataRequestCollection.updateOne(
          filter,
          updateDoc
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .json({ message: "Contact request not found or already approved" });
        }

        res
          .status(200)
          .json({ success: true, message: "Contact request approved" });
      } catch (error) {
        console.error("Failed to approve contact request:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
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

    // DELETE : my contact request
    app.delete("/delete-contact-requests/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await biodataRequestCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Request not found" });
        }

        res
          .status(200)
          .json({ success: true, message: "Deleted successfully" });
      } catch (error) {
        console.error("Error deleting contact request:", error);
        res.status(500).json({ message: "Server error" });
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
