const story = require("./models/story");
const { set } = require("./redisCache");

const categories = [
    "food",
    "health and fitness",
    "travel",
    "movie",
    "education"
];

const preloadCache = async () => {
    console.log('Preloading cache...');

    try {
        // Preload "all" categories cache
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

        await set("all_stories", JSON.stringify(groupedStories), 600);

        // Preload individual category caches
        for (const category of categories) {
            const stories = await story.find({
                slides: { $elemMatch: { category: category } },
            })
                .sort({ createdAt: -1 });

            const processedStories = await Promise.all(stories.map(async (story) => {
                const totalLikes = story.likes.length;
                return {
                    ...story.toJSON(),
                    slidesLength: story.slides.length,
                    totalLikes: totalLikes
                };
            }));

            await set(`category_${category}`, JSON.stringify(processedStories), 600);
        }

        console.log('Cache preloaded successfully');
    } catch (error) {
        console.error('Error preloading cache:', error);
    }
};

module.exports = { preloadCache };