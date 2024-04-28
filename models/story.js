const mongoose = require("mongoose")

const StorySchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    slides: [
        {
            title: {
                type: String,
                required: true,
            },
            description: {
                type: String,
                required: true,
            },
            imageUrl: {
                type: String,
                required: true,
            },
            category: {
                type: String,
                required: true,
            },
        },
    ],
    likes: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
        }
    ]
},
    { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }

)

const BookmarkSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    story: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Story',
        required: true
    }
})

module.exports = mongoose.model('Bookmark', BookmarkSchema)
module.exports = mongoose.model('Story', StorySchema)