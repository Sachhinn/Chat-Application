import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt'
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
        required:true,
        select:false
    },
    firstName: {
        type: String,
        required:true,
        maxlength: 50
    },
    lastName: {
        type: String,
        required:true,
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
    refreshToken:String,
    createdAt: { type: Date, immutable: true, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() }
})

//Methods on each instances of users::
userSchema.methods.getContacts = function () {
    return this.contacts
}

userSchema.methods.isPasswordCorrect =async function(password){
    return await bcrypt.compare(password , this.passwordHash)
}
//JSON WEB TOKEN ACCESS KEY GENERATION:::
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id :this._id,
            username : this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:process.env.ACCESS_TOKEN_EXPIRY}
    )
}

//JSON WEB TOKEN REFRESH KEY GENERATION:::
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id :this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn:process.env.REFRESH_TOKEN_EXPIRY}
    )
}

// Method on the schema of the Users itself::
userSchema.statics.findByUsername = function (name) {
    return this.where({ username: new RegExp(name, 'i') }).findOne()
}

//Method only can be used after a query:
userSchema.query.byname = function (name) {
    return this.where({ "profile.firstName": new RegExp(name, 'i') }).findOne()
}
//Method/Middleware to use before using the query: save() 
userSchema.pre('save', async function (next) {
    this.updatedAt = Date.now()
    if(this.isModified('passwordHash')){
        this.passwordHash = await bcrypt.hash(this.passwordHash , 8)
    }
    next();
})
export default mongoose.model('User', userSchema);