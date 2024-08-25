require("dotenv").config()
const express = require("express")
const app = express()
const cors = require("cors")
const PORT = 3000
const mongoose = require("mongoose")
const authRoute = require("./routes/auth")
const storyRoute = require("./routes/story")
const { connectToRedis } = require("./redisCache")
const { preloadCache } = require("./preloadCache")

app.use(express.json())
app.use(cors())
app.use("/api/v1/auth", authRoute)
app.use("/api/v1/stories", storyRoute)

app.use((error, req, res, next) => {
    console.log(error)
    res.status(500).json({
        ErrorMessage: "Something went wrong"
    })
})

const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("Database connected!")

        try {
            await connectToRedis()
            console.log("Redis connected!")
            await preloadCache()
            console.log("Cache preloaded successfully")
        } catch (redisError) {
            console.error("Failed to connect to Redis or preload cache:", redisError)
            console.log("Continuing without Redis...")
        }

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })
    } catch (mongoError) {
        console.error("Failed to connect to MongoDB:", mongoError)
        process.exit(1)
    }
}

startServer()