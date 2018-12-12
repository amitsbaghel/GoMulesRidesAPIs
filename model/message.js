var mongoose= require('mongoose');

var MessageSchema=new mongoose.Schema({
    message: String,
    sentById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentToId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdDate: { type: Date, default: new Date() }
});
mongoose.model('Message',MessageSchema);

module.exports=mongoose.model('Message');