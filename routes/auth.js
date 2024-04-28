const express = require("express")
const { registeredUser, loginUser } = require("../controllers/auth")
const router = express.Router()

router.post("/register", registeredUser)
router.post("/login", loginUser)

module.exports = router