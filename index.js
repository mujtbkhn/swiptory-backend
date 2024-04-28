require("dotenv").config()
const express = require("express")
const app = express()
const cors = require("cors")
const PORT = 3000
const mongoose = require("mongoose")
const authRoute = require("./routes/auth")
const storyRoute = require("./routes/story")

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

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Database connected!"))
    .catch(() => console.log("Failed to connect"))

app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`)
})