const user = require("../models/user")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const registeredUser = async (req, res, next) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(400).json({
                message: "username or password missing"
            })
        }
        const existingUser = await user.findOne({ username: username })
        if (existingUser) {
            return res.status(400).json({
                message: "username already exists"
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await user.create({
            username,
            password: hashedPassword
        })

        const token = jwt.sign({ name: username }, process.env.SECRET_KEY)



        res.json({
            message: "User created successfully",
            token: token
        })
    } catch (error) {
        next(error)
    }
}

const loginUser = async (req, res, next) => {
    try {

        const { username, password } = req.body
        if (!username || !password) {
            return res.status(400).json({
                message: "username or password is empty"
            })
        }
        const userDetails = await user.findOne({ username })
        if (!userDetails) {
            return res.status(400).json({
                message: "invalid username"
            })
        }
        const passwordMatch = await bcrypt.compare(
            password,
            userDetails.password
        )
        if (!passwordMatch) {
            return res.status(400).json({
                message: "password is incorrect"
            })
        }

        const token = jwt.sign({ userId: userDetails._id, name: userDetails.username }, process.env.SECRET_KEY)
        res.json({
            message: "user logged in successfully",
            token: token
        })
    } catch (error) {
        next(error)
    }


}

module.exports = { registeredUser, loginUser }
