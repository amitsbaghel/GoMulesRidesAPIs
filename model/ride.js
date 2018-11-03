var mongoose= require('mongoose');

var RideSchema=new mongoose.Schema({
    from:String,
    to: String,
    date:Date,
    time:String,
    seat:Number,
    charge:String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
mongoose.model('Ride',RideSchema);

module.exports=mongoose.model('Ride');