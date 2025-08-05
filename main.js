import express from 'express'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import User from './models/user.model.js'
import Conversation from './models/conversation.model.js'
import path from 'path';
import { fileURLToPath } from 'url';
import Message from './models/message.model.js'
import mongoose from 'mongoose'
const __fileName = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__fileName);
dotenv.config();
connectDB();
export const app = express()
fileURLToPath
app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json())
app.use(express.text())

const PORT = process.env.PORT || 3000
app.get('/',(req,res) =>{
    res.redirect('/login')
})

app.get('/login', (req, res) => {
    res.render("login")
})
app.get('/users/:id', async (req, res) => {
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
    // const user = await User.findById("688664a21a8ea7fbda6b33a9").populate('contacts','firstName lastName')
    res.render('index', { user, contacts: user.contacts, conversations: user.conversations })

})
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username: username })
        if (user) {
            console.log("User found")
            if (user.passwordHash == password) {
                res.redirect(`/users/${user._id}`)
            } else {
                console.log("Password didn't match")
                console.log(user.passwordHash, password)
                throw new Error("Password didn't match")
            }
        } else {
            throw new Error("User Not Found. Please check the username!")
        }
    } catch (e) {
        res.send("Error :", e)
    }
})
app.post('/getMessages', async (req, res) => {
    const { participant, user , pageN} = req.body
    try {
        const conversationId = await Conversation.startConversation(user, participant)
        let messages = await Message.getOnePageMessages(conversationId , pageN)
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
    res.json({ success: true, message: "Received request" })
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
                if(anyNewMsg.lastMessageAt.getTime() > convoTime.getTime()){
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
        console.log(error , error.message)
        res.status(500).json({success:false ,message:'Internal Server Error'})
    }

})
app.listen(PORT, () => {
    console.log(`Server started at port : ${PORT}`)
})