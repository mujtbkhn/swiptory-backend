const express = require("express")
const { createStory, getStory, editStory, likeStory, bookmarkStory, getAllBookmarks, getStoryById } = require("../controllers/story")
const authenticateUser = require("../middlewares/authenticated")
const router = express.Router()

router.get("/get", getStory)
// router.get("/get1", getStory1)
// router.get("/viewByCategory", viewStoryByCategory)
router.get("/get/:slideId", getStoryById)
router.post("/create", authenticateUser, createStory)
router.put("/edit/:slideId", authenticateUser, editStory)
router.post("/like/:slideId", authenticateUser, likeStory)
router.post("/bookmark/:slideId", authenticateUser, bookmarkStory)
router.post("/getBookmarks", authenticateUser, getAllBookmarks)


module.exports = router