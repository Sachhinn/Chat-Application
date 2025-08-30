import express from 'express'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import User from './models/user.model.js'
import Conversation from './models/conversation.model.js'
import Message from './models/message.model.js';
import path from 'path';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { upload } from './middleware/multer.middleware.js'
import { uploadOnCloudinaryWithPublicId } from './utils/cloudinary.js'
import mongoose from 'mongoose'
import { verifyUserToken } from './middleware/auth.middleware.js'
import jwt from 'jsonwebtoken'
const __fileName = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__fileName);
dotenv.config({ quiet: true });
connectDB();
const options = {
    httpOnly: true,
    sameSite:'Lax'
    // secure: true,
}
const app = express()
app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json())
app.use(express.text())
app.use(cookieParser());
const PORT = process.env.PORT || 3000
export const generateAccessAndRefreshTokens = async (user) => {
    try {
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        return{ error: 'Error in generating tokens', message: error.message };
    }
}

app.get('/', (req, res) => {
    let message = encodeURIComponent('Please Login First')
    res.redirect(`/login?message=${message}`)
})
app.get('/login', (req, res) => {
    if(req.query.message){
        let message = req.query.message
        res.render("login" , {message})
    }
    else{
        res.render('login' , {message: null})
    }
})
app.get('/register', (req, res) => {
    res.render('register')
})
app.get('/user', verifyUserToken , async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('contacts', 'firstName , lastName , profilePicUrl , bio , status').populate({
            path: "conversations",
            populate: {
                path: "participants",
                select: "firstName , lastName , profilePicUrl , createdAt , status"
            },
            options: {
                sort: { updatedAt: -1 }
            }
        }).findOne()
        if (user) {
            res.render('index', { user, contacts: user.contacts ? user.contacts : null, conversations: user.conversations ? user.conversations : null })
        }
        else {
            throw new Error('Cannot Find the user')
        }
    } catch (error) {
        res.status(501).json({ success: false, message: error })
    }

})
app.get('/deleteAllMessages/:id', async (req, res) => {
    let conversationId = req.params
    console.log(conversationId)
    let result = await Message.deleteMany({ conversationId: new mongoose.Types.ObjectId(conversationId) })
    await Conversation.findByIdAndDelete(new mongoose.Types.ObjectId(conversationId))
    res.status(201).json({ success: true, message: { deletedMessages: result.deletedCount } })
})
app.get('/all_users', (req, res) => {
    res.render('all_users')
})
app.post('/allUsers', async (req, res) => {
    const allUsers = await User.find({}).sort({ firstName: 1 })
    res.status(200).json(allUsers)
})
app.post('/register', upload.single('avatar'), async (req, res) => {
    const { username, password, firstName, lastName, bio } = req.body
    if ([username, password, firstName, lastName].some((field) => field?.trim() === "")) {
        res.status(400).json({ success: false, message: 'Provide All Fields.' })
    }
    let doExist = await User.findOne({ username })
    if (doExist) {
        res.status(409).json({ success: false, message: 'Username Already Exists!' })
        return;
    }
    let avatar;
    if (req.file) {
        avatar = await uploadOnCloudinaryWithPublicId(req.file.path, req.file.filename.split('.')[0])
        if (!avatar) { res.status(501).json({ success: false, message: 'No Profile picture link generated! Try again' }) }
    }
    let user = await User.create({
        firstName,
        lastName,
        username: username.toLowerCase(),
        passwordHash: password,
        bio,
        profilePicUrl: avatar?.url || ''
    })
    const createdUser = await User.findById(user._id)
    if (!createdUser) {
        res.status(500).json({ success: false, message: 'Could not register, please try again.' })
    }
    const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user)
    res.status(201)
    .cookie('accessToken',accessToken , options)
    .cookie('refreshToken',refreshToken , options)
    .json({ success: true, message: createdUser })
})
app.post('/login', upload.none(), async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username: username }).select('+passwordHash')
        if (user) {
            if (await user.isPasswordCorrect(password)) {
                generateAccessAndRefreshTokens(user).then((tokens) => {
                    if (tokens.error) {
                        return res.status(500).json({ success: false, message: tokens.message });
                    }
                    user.set('passwordHash', undefined) // because delete user.passwordHash doesn't properly delete it as its a mongoose object.
                    user.set('refreshToken', undefined)
                    res.status(201)
                        .cookie('accessToken', tokens.accessToken, options)
                        .cookie('refreshToken', tokens.refreshToken, options)
                        .json({ success: true, message: user });
                })
                    .catch(error => {
                        console.log(error.message)
                        res.status(500).json({success:false,message:error.message})
                    })
            } else {
                throw new Error("Password didn't match")
            }
        } else {
            throw new Error("User Not Found. Please check the username!")
        }
    } catch (error) {
        console.error(error)
        res.json({ success: false, message: error.message })
    }
})
app.post('/logout', verifyUserToken, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $unset: { refreshToken: 1 } // the $set:{refreshtoken:undefined} operator won't work here as it is designed to ignore the properties set as undefined.
        })
        let options = {
            httpOnly: true,
            secure: true,
        }
        res.status(201)
            .clearCookie('accessToken', options)
            .clearCookie('refreshToken', options)
            .json({ success: true, message: 'User Log Out Successful' })
    } catch (error) {
        res.status(500).json({ success: false, message: 'Something went wrong' })
    }
})
app.post('/refresh-token', async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
        if (!incomingRefreshToken) {
            return res.status(403).json({ success: false, message: "No Refresh Token Received" });
        }
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            return res.status(403).json({ success: false, message: "Invalid Refresh Tokens" });
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            return res.status(403).json({ success: false, message: "Refresh Token is either expired or used" });
        }
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user)
        res.status(200)
            .cookie('accessToken', accessToken, options)
            .cookie('refreshToken', refreshToken, options)
            .json({ success: true, message: 'Refresh Token Refreshed' })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
})
app.post('/getMessages', async (req, res) => {
    const { participant, user, pageN } = req.body
    try {
        const conversationId = await Conversation.startConversation(user, participant)
        let messages = await Message.getOnePageMessages(conversationId, pageN)
        // let messages = await Message.find({conversationId:conversationId})
        // messages = messages.reverse()
        res.status(201).json({ success: true, message: messages })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: "Internal Server Error" })
    }
})
app.post('/saveMessage', async (req, res) => {
    try {
        const msg = req.body;
        let result = await Message.sendOneToOneMessage(msg.sender, msg.receiver, msg.context)
        res.status(201).json({ success: true, message: 'Message stored successfully' })
    } catch (error) {
        console.log(error.message)
        res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
})
app.post('/getUserByUsername', async (req, res) => {
    try {
        let username = req.body;
        let user = await User.findByUsername(username).select('firstName , lastName')
        if (user) {
            res.status(201).json({ success: true, message: user })
        }
        else {
            new Error(`No user by username: ${username}`)
        }
    } catch (error) {
        console.log(error.message)
        res.status(404).json({ success: false, message: "NO USER FOUND" })
    }
})
app.post('/addToContacts', async (req, res) => {
    const { userId, connectionUserId } = req.body;
    console.log("User Connection request::")
    const user = await User.findByIdAndUpdate(userId, { $addToSet: { contacts: connectionUserId } })
    res.json({ success: true, message: "Contacts Updated!" })
})
app.post('/removeFromContacts', async (req, res) => {
    const { userId, connectionUserId } = req.body;
    console.log("User Disconnection request::")
    const user = await User.findByIdAndUpdate(userId, { $pull: { contacts: connectionUserId } })
    console.log(user)
    res.status(201).json({ success: true, message: 'Disconnected' })
})
app.post('/ifNewMessage', async (req, res) => {
    const { userId, activeUserId, lastMessage } = req.body;
    const conversationId = await Conversation.startConversation(userId, activeUserId)
    const messages = await Message.find({ conversationId: conversationId, updatedAt: { $gt: lastMessage.updatedAt } }).sort({ updatedAt: 1 }).limit(5).exec()
    if (messages.length) {
        res.status(201).json({ success: true, message: messages })
    }
    else {
        res.json({ success: false, message: 'No new messages' })
    }
})
app.post('/ifnewConversationMessage', async (req, res) => {
    const pastConversations = req.body;
    let obj = [];
    let convoTime;
    try {
        for (let i = 0; i < pastConversations.length; i++) {
            const pastConvo = pastConversations[i];
            convoTime = new Date(pastConvo.lastMessageAt)
            const anyNewMsg = await Conversation.findById(pastConvo._id).where('lastMessageAt').gt(convoTime)
            if (anyNewMsg) {
                if (anyNewMsg.lastMessageAt.getTime() > convoTime.getTime()) {
                    obj.push(anyNewMsg)
                }
            }
        }
        if (obj.length) {
            res.status(201).json({ success: true, message: obj })
        }
        else {
            res.json({ success: false, message: 'No New Message' })
        }
    } catch (error) {
        console.log(error, error.message)
        res.status(500).json({ success: false, message: 'Internal Server Error' })
    }

})
app.listen(PORT, () => {
    console.log(`Server started at port : ${PORT}`)
})