var mongoose= require('mongoose');

var RideSchema=new mongoose.Schema({
    from:String,
    to: String, 
    date:Date,
    time:Date, // change it to string if any error.
    seat:Number,
    charge:String,
    status:{ type: String, default: 'incomplete' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, //parent
    createdDate: { type: Date, default: new Date() }
});
mongoose.model('Ride',RideSchema);

module.exports=mongoose.model('Ride');