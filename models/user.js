const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        minLength: 5,
        maxLength: 20,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minLength: 6
    },
    bookmarks: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Story'
        }
    ]
},
    { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
)

module.exports = mongoose.model('User', userSchema)