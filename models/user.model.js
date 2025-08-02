import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique:true,
        trim: true,
        minlength: 3,
        maxlength: 30,
    },
    passwordHash: {
        type: String,
        // required:true
    },
    firstName: {
        type: String,
        // required:true,
        maxlength: 50
    },
    lastName: {
        type: String,
        // required:true,
        maxlength: 50
    },
    profilePicUrl: {
        type: String,
        // default:"defaultProfilePic.png"
    },
    bio:String,
    status: {
        type: String,
    },
    contacts: [{
        type: mongoose.SchemaTypes.ObjectId,
        required: false,
        ref: 'User'
    }],
    conversations: [{
        type: mongoose.SchemaTypes.ObjectId,
        required: false,
        ref: 'Conversation'
    }],
    createdAt: { type: Date, immutable: true, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() }
})

//Methods on each instances of users::
userSchema.methods.getContacts = function () {
    return this.contacts
}
// Method on the schema of the Users itslef::
userSchema.statics.findByUsername = function (name) {
    return this.where({ username: new RegExp(name, 'i') }).findOne()
}
//Method only can be used after a query:
userSchema.query.byname = function (name) {
    return this.where({ "profile.firstName": new RegExp(name, 'i') }).findOne()
}
//Method/Middleware to use before using the query: save() 
userSchema.pre('save', function (next) {
    this.updatedAt = Date.now()
    next();
})
export default mongoose.model('User', userSchema);