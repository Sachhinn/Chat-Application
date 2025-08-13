import express from 'express'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import User from './models/user.model.js'
import Conversation from './models/conversation.model.js'
import Message from './models/message.model.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { upload } from './middleware/multer.middleware.js'
import {v2 as cloudinary} from 'cloudinary'
import { uploadOnCloudinaryWithPublicId } from './utils/cloudinary.js'
import mongoose from 'mongoose'
const __fileName = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__fileName);
dotenv.config({ quiet: true });
connectDB();
export const app = express()
fileURLToPath
app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json())
app.use(express.text())
const PORT = process.env.PORT || 3000

// let result = await User.deleteOne({_id:'689b8062c7da970ba76fca9e'})
// console.log(result)

app.get('/', (req, res) => {
    res.redirect('/login')
})
app.get('/login', (req, res) => {
    res.render("login")
})
app.get('/register', (req, res) => {
    res.render('register')
})
app.get('/users/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.where('_id').equals(id).populate('contacts', 'firstName , lastName , profilePicUrl , bio , status').populate({
            path: "conversations",
            populate: {
                path: "participants",
                select: "firstName , lastName , profilePicUrl , createdAt , status"
            },
            options: {
                sort: { updatedAt: -1 }
            }
        }).findOne()
        if(user){
            res.render('index', { user, contacts: user.contacts?user.contacts:null, conversations: user.conversations?user.conversations:null })
        }
        else{
            throw new Error('Cannot Find the user')
        }
    } catch (error) {
        res.status(501).json({success:false,message:error.message})
    }

})
app.get('/deleteAllMessages/:id', async (req, res) => {
    let conversationId = req.params
    console.log(conversationId)
    let result = await Message.deleteMany({ conversationId: new mongoose.Types.ObjectId(conversationId) })
    await Conversation.findByIdAndUpdate(new mongoose.Types.ObjectId(conversationId), {
        lastMessage: null,
        lastMessageBy: null,
        lastMessageAt: new Date()
    })
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
    //Check why does it throw : "an error occured" when registering
    const { username, password, firstName, lastName, bio } = req.body
    if ([username, password, firstName, lastName].some((field) => field?.trim() === "")) {
        res.status(400).json({ success: false, message: 'Provide All Fields.' })
    }
    let doExist = await User.findOne({ username })
    if(doExist){
        res.status(409).json({ success: false, message: 'Username Already Exists!' }) 
        return;
    }
    let avatar;
    if (req.file) {
        avatar = await uploadOnCloudinaryWithPublicId(req.file.path , req.file.filename.split('.')[0])
        if (!avatar) { res.status(501).json({ success: false, message: 'No Profile picture link generated! Try again' }) }
        console.log(avatar.url)
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
    res.status(201).json({success:true,message:createdUser})
})
app.post('/login', async (req, res) => {
    console.log('req received')
    const { username, password } = req.body;
    console.log(req.body)
    try {
        let user = await User.findOne({ username: username }).select('+passwordHash')
        if (user) {
            console.log("User found")
            if (await user.isPasswordCorrect(password)) {
                delete user.passwordHash;
                res.status(201).json({ success: true, message: user })
            } else {
                console.log("Password didn't match")
                console.log(user.passwordHash, password)
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