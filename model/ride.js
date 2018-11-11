var mongoose= require('mongoose');

var RideSchema=new mongoose.Schema({
    from:String,
    to: String, 
    date:Date,
    time:String,
    seat:Number,
    charge:String,
    status:{ type: String, default: 'incomplete' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, //parent 
    bookingID:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }] //child
});
mongoose.model('Ride',RideSchema);

module.exports=mongoose.model('Ride');