var express = require('express');
const url = require('url');
var router = express.Router();
var bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
var mongoose = require('mongoose');

var Booking = require('../model/booking');
var User = require('../model/user');
var Ride =  require('../model/ride');

// save ride starts
router.post('/', async function (req, res) {

    // var booking = new Booking({
    //     userId: mongoose.Types.ObjectId(req.body.userID),
    //     seat: req.body.seat,
    //     charge:req.body.charge,
    //     rideId: mongoose.Types.ObjectId(req.body.rideID)
    // });

    // booking.save(function (err, ride) {
    //     if (err)
    //         return res.status(500).send(err);

    //     res.status(200).send(ride);
    // });

    var booking = new Booking({
        userId: mongoose.Types.ObjectId(req.body.userID),
        seat: req.body.seat,
        charge: req.body.charge,
        rideId: mongoose.Types.ObjectId(req.body.rideID)
    });

    booking.save(function (err, booking) {
        if (err)
            return res.status(500).send(err);
            // no transaction
            // substracting the amount from wallet.
        User.findByIdAndUpdate(req.body.userID, { $inc: { wallet: -parseInt(req.body.charge) } },function(err,user){
            if (err)
            return res.status(500).send(err);

            // here will also push the booking entity to Ride parent.
            // https://mongoosejs.com/docs/populate.html#refs-to-children

        Ride.findOneAndUpdate(req.body.rideID, // User ID
        { $push: { bookingID: booking } },{ new: true }, // child
        function (err, rideData) {
            if (err){
                return res.status(500).send("There was a problem adding the information to the database.");
            }
            // res.status(200).send(rideData); 
            res.redirect(url.format({
                pathname: "/ride/"//,
                // query: {
                //     "userid": req.params.userid,
                // }
            }))
        }
    );
        })
    });

    // https://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html#transactions-with-mongoose

    // const session = await mongoose.startSession();
    // session.startTransaction();

    // const opts = { session, new: true };
    // try { //try starts
    //     await booking.save(opts);

    //     // here updating the master User table wallet entry
    //     await User.findByIdAndUpdate(req.body.userID, { $inc: { wallet: -parseInt(req.body.charge) } }, opts)//, async function (err, user) {

    //     await session.commitTransaction();

    //     res.status(200).send(ride);
    // } // try ends //booking save ends, sesssion passed to save method
    // catch (err) {
    //     console.log('error amit ', err)
    //     await session.abortTransaction();
    //     return res.status(500).send(err);
    // }
    // finally {
    //     session.endSession();
    // }

}); // save booking ends



//return a user from the database
router.get('/:userid',function(req,res){
    Booking.
    find({userId:req.params.userid}).sort({ '_id': -1 }).select('seat charge').
    populate({path: 'rideId',select:"from to date time userId"}).
    exec(function (err, bookings) {
        if (err)
        {
            return res.status(500).send(err);
            // return res.status(500).send("There was a problem adding the information to the database.");
        }
        
            res.status(200).send(bookings);
    })
});

module.exports = router;