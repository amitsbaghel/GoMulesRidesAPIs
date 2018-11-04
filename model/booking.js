var mongoose= require('mongoose');

var BookingSchema=new mongoose.Schema({
    seat:String,
    charge: String,
    seat:String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' }
});
mongoose.model('Booking',BookingSchema);

module.exports=mongoose.model('Booking');