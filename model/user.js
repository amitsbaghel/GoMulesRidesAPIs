var mongoose= require('mongoose');

var UserSchema=new mongoose.Schema({
    name:String,
    email: String,
    password:String,
    ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' }
});


mongoose.model('User',UserSchema);

module.exports=mongoose.model('User');