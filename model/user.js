var mongoose= require('mongoose');

var UserSchema=new mongoose.Schema({
    name:String,
    email: String,
    password:String,
    wallet:Number,
    mobileNumber:Number,
    ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    createdDate: { type: Date, default: new Date() }
});

mongoose.model('User',UserSchema);

module.exports=mongoose.model('User');