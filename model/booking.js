var mongoose= require('mongoose');

var BookingSchema=new mongoose.Schema({
    charge: Number,
    seat:Number,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
    createdDate: { type: Date, default: new Date() },
    rating:{ type: Number, default: 0 },
    comment:{ type: String },
    status:{ type: String, default: 'active' },
});
mongoose.model('Booking',BookingSchema);

module.exports=mongoose.model('Booking');