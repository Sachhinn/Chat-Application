import mongoose from "mongoose";
import Conversation from "./conversation.model.js";
import User from "./user.model.js";
const messageSchema =new mongoose.Schema({
 conversationId:{
    type:mongoose.SchemaTypes.ObjectId,
    ref:'Conversation',
    required:true,
 },
 sender:{
    type:mongoose.SchemaTypes.ObjectId,
    ref:'User',
    required:true,
 },
 context:{
    type:String,
    required:true,
 }
},{
    timestamps:true
}
)
messageSchema.pre('save',async function(next) {
   let result = await Conversation.findById(this.conversationId);
   result.lastMessage = this.context;
   result.lastMessageBy = this.sender;
   await result.save();
   next();
})
messageSchema.statics.sendOneToOneMessage = async function(sender , receiver , context) {
   let conversation = await Conversation.startConversation(sender , receiver)
   return await this.create({
      conversationId: conversation._id,
      sender:new mongoose.Types.ObjectId(sender),
      context:context
   })
}

messageSchema.statics.getOnePageMessages = async function(conversationId , pagenumber=1){
   return await this.find({conversationId:conversationId})
                     .select('context , updatedAt , sender')  
                     .skip((pagenumber-1)*20)
                     .sort({ updatedAt: -1 })
                     .limit(20)
                     .exec()

}
export default mongoose.model('Message',messageSchema)