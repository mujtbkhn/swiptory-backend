const story = require("../models/story")
const user = require("../models/user")
const { get, set } = require("../redisCache")

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
            const cacheKey = "all_stories"
            const cachedStories = await get(cacheKey)

            if (cachedStories) {
                return res.status(200).json({ stories: JSON.parse(cachedStories) });
            }
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
                        slidesLength: story.slides.length,
                        totalLikes: totalLikes
                    };
                }));
            }
            await set(cacheKey, JSON.stringify(groupedStories), 600)
            return res.status(200).json({ stories: groupedStories });
        } else {
            const cacheKey = `category_${category}`;
            const cachedStories = await get(cacheKey);

            if (cachedStories) {
                return res.status(200).json({ stories: JSON.parse(cachedStories) });
            }

            stories = await story.find({
                slides: { $elemMatch: { category: category } },
            })
                .sort({ createdAt: -1 });

            stories = await Promise.all(stories.map(async (story) => {
                const totalLikes = story.likes.length;
                return {
                    ...story.toJSON(),
                    slidesLength: story.slides.length,
                    totalLikes: totalLikes
                };
            }));

            await set(cacheKey, JSON.stringify(stories), 600); // 10 minutes expiry
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
        const storyDoc = await story.findById(slideId);
        if (!storyDoc) {
            return res.status(404).json({
                message: "Story not found"
            });
        }

        const totalLikes = storyDoc.likes.length;

        let liked = false;
        let bookmarked = false;
        if (userId) {
            const userDoc = await user.findById(userId);
            if (userDoc) {
                liked = storyDoc.likes.some(like => like.user.toString() === userId);
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

        const populatedBookmarks = await userObj.populate({
            path: "bookmarks",
            populate: {
                path: "likes",
                select: "user",
            },
        });

        const bookmarksWithLikesLength = populatedBookmarks.bookmarks.map((bookmark) => ({
            ...bookmark.toObject(),
            totalLikes: bookmark.likes.length,
        }));

        res.json({
            bookmarks: bookmarksWithLikesLength
        });
    } catch (error) {
        next(error);
    }
};


module.exports = { createStory, getStory, editStory, likeStory, bookmarkStory, getAllBookmarks, getStoryById }