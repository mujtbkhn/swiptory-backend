const story = require("../models/story")
const user = require("../models/user")

const createStory = async (req, res) => {
    const { slides, bookmark, likes } = req.body

    if (!slides) {
        return res.status(400).json({
            message: "something is missing"
        })
    }

    const categories = new Set(slides.map(slide => slide.category));
    if (categories.size !== 1) {
        return res.status(400).json({ message: "All slides must have the same category" });
    }
    const userId = req.user.userId
    const Story = await story.create({
        slides, bookmark, likes, createdBy: userId
    })
    res.json({
        message: "Story created Successfully",
        Story
    })
}

const getStory = async (req, res) => {
    const categories = [
        "food",
        "health and fitness",
        "travel",
        "movie",
        "education"
    ]

    const { userId, category } = req.query;
    try {
        let stories = [];

        if (userId) {
            stories = await story.find({ createdBy: userId });
            return res.status(200).json({ stories: stories });
        } else if (category && category.toLowerCase() === "all") {
            // GROUP STORIES BY CATEGORY
            const groupedStories = {};

            for (const c of categories) {
                const categoryStories = await story.find({
                    slides: { $elemMatch: { category: c } },
                })
                    .sort({ createdAt: -1 });

                groupedStories[c] = await Promise.all(categoryStories.map(async (story) => {
                    const totalLikes = story.likes.length;
                    return {
                        ...story.toJSON(),
                        slidesLength: story.slides.length, // Calculate slides length
                        totalLikes: totalLikes // Include total likes count
                    };
                }));
            }

            return res.status(200).json({ stories: groupedStories });
        } else {
            stories = await story.find({
                slides: { $elemMatch: { category: category } },
            })
                .sort({ createdAt: -1 });

            // Calculate total likes for each story
            stories = await Promise.all(stories.map(async (story) => {
                const totalLikes = story.likes.length;
                return {
                    ...story.toJSON(),
                    slidesLength: story.slides.length, // Calculate slides length
                    totalLikes: totalLikes // Include total likes count
                };
            }));

            return res.status(200).json({ stories: stories });
        }

    } catch (error) {
        console.error("Error fetching stories:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


const getStoryById = async (req, res) => {
    const slideId = req.params.slideId;
    const { userId } = req.query;

    try {
        // Find the story by ID
        const storyDoc = await story.findById(slideId);
        if (!storyDoc) {
            return res.status(404).json({
                message: "Story not found"
            });
        }

        // Calculate total likes count
        const totalLikes = storyDoc.likes.length;

        let liked = false;
        let bookmarked = false;
        if (userId) {
            const userDoc = await user.findById(userId);
            if (userDoc) {
                // Check if the user has liked the story
                liked = storyDoc.likes.some(like => like.user.toString() === userId);
                // Check if the user has bookmarked the story
                bookmarked = userDoc.bookmarks.includes(slideId);

                return res.json({
                    message: "Story found successfully",
                    story: storyDoc,
                    liked: liked,
                    bookmarked: bookmarked,
                    totalLikes
                });
            }
        }

        return res.json({
            message: "Story found successfully",
            story: storyDoc,
            totalLikes
        });
    } catch (error) {
        console.error("Error fetching story:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const editStory = async (req, res) => {
    const { slides, bookmark, likes } = req.body;
    const slideId = req.params.slideId

    try {

        if (!slides) {
            return res.status(400).json({
                message: "something is missing"
            })
        }

        const isStoryExists = await story.findById(slideId)
        if (!isStoryExists) {
            return res.status(404).json({
                message: "story does not exist"
            })
        }

        isStoryExists.slides = slides

        if (bookmark !== undefined) {
            storyToUpdate.bookmark = bookmark;
        }
        if (likes !== undefined) {
            storyToUpdate.likes = likes;
        }

        await isStoryExists.save()
        return res.json({
            message: "Story updated successfully",
            story: isStoryExists
        })
    } catch (error) {
        console.error("Error updating story:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}
// const viewStoryByCategory = async (req, res) => {
//     const categoryToFind = req.query.category

//     if (categoryToFind === "all") {
//         const allStories = await story.find()
//         return res.json({
//             stories: allStories
//         })
//     }

//     const result = await story.find({ category: categoryToFind })
//     if (!result) {
//         return res.status(400).json({
//             message: "no story of this category"
//         })
//     }

//     return res.json({
//         stories: result
//     })

// }

const likeStory = async (req, res, next) => {
    const slideId = req.params.slideId
    const userId = req.user.userId
    try {
        const existingLike = await story.findOne({ _id: slideId, "likes.user": userId })
        if (existingLike) {
            return res.status(400).json({
                message: "You have already liked this story"
            });
        }
        const likeStory = await story.findOneAndUpdate(
            { _id: slideId },
            { $addToSet: { likes: { user: userId } } },
            { new: true }
        )
        if (!likeStory) {
            return res.status(404).json({
                message: "Story not found"
            });
        }
        return res.json({
            message: "Story liked successfully",
            story: likeStory
        })
    } catch (error) {
        next(error)
    }
}
const bookmarkStory = async (req, res, next) => {
    try {
        const userId = req.user.userId
        const slideId = req.params.slideId

        const userObj = await user.findById(userId)
        if (!userObj) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        if (userObj.bookmarks.includes(slideId)) {
            return res.status(400).json({
                message: "Story is already bookmarked"
            });
        }
        userObj.bookmarks.push(slideId)
        await userObj.save()

        res.json({
            message: "Story bookmarked successfully"
        })
    } catch (error) {
        next(error)
    }
}
const getAllBookmarks = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const userObj = await user.findById(userId);
        if (!userObj) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Populate bookmarks with story details and total likes
        const populatedBookmarks = await userObj.populate({
            path: "bookmarks",
            populate: {
                path: "likes",
                select: "user", // Select only the user field of each like
            },
        });

        // Calculate total likes for each bookmarked story
        const bookmarksWithLikesLength = populatedBookmarks.bookmarks.map((bookmark) => ({
            ...bookmark.toObject(),
            totalLikes: bookmark.likes.length, // Add total likes count
        }));

        res.json({
            bookmarks: bookmarksWithLikesLength
        });
    } catch (error) {
        next(error);
    }
};


module.exports = { createStory, getStory, editStory, likeStory, bookmarkStory, getAllBookmarks, getStoryById }