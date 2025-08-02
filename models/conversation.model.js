import mongoose from 'mongoose';
import User from './user.model.js'
const conversationsSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: true
    }],
    type: {
        type: String,
        enum: ['one-to-one', 'group'],
        required: true
    },
    name: String,
    lastMessageAt: {
        type: Date,
        default: new Date()
    },
    lastMessage: {
        type: String,
        ref: 'Messages'
    },
    lastMessageBy: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User'
    }
}, { timestamps: true }
)
conversationsSchema.pre('save', async function (next) {
    for (let i = 0; i < this.participants.length; i++) {
        let participant =new mongoose.Types.ObjectId(this.participants[i])
        let user = await User.findById(participant)
        if (!(user.conversations.some(convo => (convo._id).equals(this._id)))) { // true only if conversation is creating
            user.conversations.push(this._id)
            console.log(`${user.firstName}'s conversations are updated`)
            await user.save()
        }
    }
    this.lastMessageAt = new Date()
    next();
})
conversationsSchema.statics.startConversation = async function (id1, id2) {
    const participant1 = new mongoose.Types.ObjectId(id1)
    const participant2 = new mongoose.Types.ObjectId(id2)
    const sortedParticipants = [participant1, participant2].sort(function (a, b) {
        return a.toString().localeCompare(b.toString())
    })
    const existingConversation = await this.findOne({
        type: "one-to-one",
        participants: {
            $size: 2,
            $all: sortedParticipants
        }
    })
    if (existingConversation) {
        return existingConversation;
    }
    return await this.create({
        participants: [participant1, participant2],
        type: "one-to-one"
    })
}
export default mongoose.model('Conversation', conversationsSchema)