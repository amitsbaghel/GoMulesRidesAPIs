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

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('<here your API from SendGrid>');

// book a ride starts
router.post('/', function (req, res) {

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

            // here to add code to deposit that amount to ride poster.
            Ride.findById(req.body.rideID,"userId",function(err,user){
                if (err)
                    return res.status(500).send(err);
                User.findByIdAndUpdate(user.userId, { $inc: { wallet: +parseInt(req.body.charge) } },function(err,user){
                 if (err)
                    return res.status(500).send(err);
                    console.log('user',user)
                    res.redirect(url.format({
                        pathname: "/ride/"
                    }))
                });
            })
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

// update ratings. //comment may thorugh error if user passed null comment.
router.get('/:userid/:bookingId/:rating/:comment',function(req,res){

    Booking.
    findOneAndUpdate({ _id: req.params.bookingId}, { rating: req.params.rating, comment: req.params.comment}, function (err, ride) {
        if (err) {
            return res.status(500).send("There was a problem adding the information to the database.");
        }

        res.redirect(url.format({
            pathname: "/book/"+req.params.userid
        }))
    })
})

// cancel booking by ride booking user
router.get('/cancel/:userid/:bookingid',function(req,res){
    console.log('here')

    Booking.
    findOneAndUpdate({ _id: req.params.bookingid}, { status: 'cancelled'}, function (err, ride) {
        if (err) {
            return res.status(500).send(err);
        }

        // reimburse amount to the ride booking person.
        Booking.aggregate([
            {
                $match: {
                    '_id': {
                        $eq: mongoose.Types.ObjectId(req.params.bookingid),
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: '$userDetails' },
            {
                $lookup: {
                    from: "rides",
                    localField: "rideId",
                    foreignField: "_id",
                    as: "ridedetails"
                }
            },
            { $unwind: '$ridedetails' },
            {
                $lookup: {
                    from: "users",
                    localField: "ridedetails.userId",
                    foreignField: "_id",
                    as: "ridePosterDetails"
                }
            },
            { $unwind: '$ridePosterDetails' },
            {
                $project: {
                    bookingAmount: '$charge',
                    userId: '$userDetails._id',
                    userWallet: '$userDetails.wallet',
                    userEmail: '$userDetails.email',
                    userName: '$userDetails.name',
                    rideFrom:'$ridedetails.from',
                    rideTo:'$ridedetails.to',
                    rideDate:{ $dateToString: {
                        date:'$ridedetails.date',
                        format: '%m-%d-%Y'
                    }},
                    rideTime:'$ridedetails.time',
                    ridePosterName:'$ridePosterDetails.name',
                    ridePosterEmail:'$ridePosterDetails.email',
                    ridePosterId:'$ridePosterDetails._id'
                }
            }

        ]).exec(function (err, user) {
            if (err) {
                return res.status(500).send(err);
            }
            user=user[0]
                // updating wallet of the ride booking user.
                User.findOneAndUpdate({ _id: user.userId }, { $inc: { wallet: +parseInt(user.bookingAmount) } }, function (err, bookerdetails) {
                    if (err) {
                        return res.status(500).send(err);
                    }
                });

                // deducting money from ride poster
                User.findOneAndUpdate({ _id: user.ridePosterId }, { $inc: { wallet: -parseInt(user.bookingAmount) } }, function (err, posterdetails) {
                    if (err) {
                        return res.status(500).send(err);
                    }
                });
                
                // send an email to the ride poster updating that a booking has been cancelled and money has been reimbursed.
                var textcontent= 'Hi ' + user.ridePosterName + '. A booking for ride from '+user.rideFrom +' to '+user.rideTo+' on '+user.rideDate;
                textcontent+=' has been cancelled by '+user.userName+' and $ '+user.bookingAmount+' has been deducted from your account.';
                textcontent+='You can contact him at '+user.userEmail;

                var emailcontent = {
                    from: 'noreply@gomulesrides.com',
                    to: user.ridePosterEmail,
                    subject: 'Booking cancelled :(',
                    text: textcontent
                };

                // send mail with defined transport object
                sgMail.send(emailcontent,false,function(err,response){
                        if(err)
                        return res.status(500).send(err);
                        res.redirect(url.format({
                            pathname: "/book/"+req.params.userid
                        }))
                });
            
        }); 
    })
})

// mark booking by ride booking user as no show up.
router.get('/no/show/up/bybooker/:rideid/:bookingid',function(req,res){
    Booking.
    findOneAndUpdate({ _id: req.params.bookingid}, { status: 'noshowup'}, function (err, booking) {
        if (err) {
            return res.status(500).send(err);
        }
        res.redirect(url.format({
            pathname: "/book/ride/not/cancelled/complete/"+req.params.rideid
        }))
    })
})

//return bookings on the basis of userId.
router.get('/:userid',function(req,res){
    Booking.aggregate([
        {
            $match: {
                'userId': {
                    $eq: mongoose.Types.ObjectId(req.params.userid),
                }
            }
        },
        {
            $lookup: {
                from: "rides",
                localField: "rideId",
                foreignField: "_id",
                as: "rideDetails"
            }
        },
        {$unwind: {path: '$rideDetails'}}, 
        {
            $project: {
                _id:'$_id',
                seat:'$seat',
                charge:'$charge',
                status:'$rideDetails.status',
                from:'$rideDetails.from',
                to:'$rideDetails.to',
                date:'$rideDetails.date',
                time:'$rideDetails.time',
                ridePoster:'$rideDetails.userId',
                rating: '$rating',
                comment:'$comment',
                rideid:'$rideDetails._id',
                bookingStatus:'$status'
            }
        },
         { $sort : { _id : -1} }
    ]).exec(function (err, bookingDetails) {
        if (err) {
            return res.status(500).send(err);
        }

        res.status(200).send(bookingDetails);
        });
});

//return bookings on the basis of rideId.
router.get('/ride/:rideid',function(req,res){
    Booking.aggregate([
        {
            $match: {
                'rideId': {
                    $eq: mongoose.Types.ObjectId(req.params.rideid),
                },
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userDetails"
            }
        },
        {$unwind: {path: '$userDetails'}}, 
        {
            $project: {
                _id:1,
                seat:'$seat',
                charge:'$charge',
                status:'$status',
                bookedOn:'$createdDate',
                bookedByname:'$userDetails.name',
                bookedByemail:'$userDetails.email',
                bookedByUserId:'$userDetails._id'
            }
        },
         { $sort : { bookedOn : -1} }
    ]).exec(function (err, bookingDetails) {
        if (err) {
            return res.status(500).send(err);
        }
        res.status(200).send(bookingDetails);
        });
});

//return bookings on the basis of rideId except cancelled rides.
router.get('/ride/not/cancelled/complete/:rideid',function(req,res){
    Booking.aggregate([
        {
            $match: {
                'rideId': {
                    $eq: mongoose.Types.ObjectId(req.params.rideid)
                },
                 'status':
                 { $in: ['active','noshowup'] } // not to show noshowup and cancelled
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userDetails"
            }
        },
        {$unwind: {path: '$userDetails'}}, 
        {
            $project: {
                _id:1,
                seat:'$seat',
                charge:'$charge',
                status:'$status',
                bookedOn:'$createdDate',
                bookedByname:'$userDetails.name',
                bookedByemail:'$userDetails.email',
                bookedByUserId:'$userDetails._id'
            }
        },
         { $sort : { bookedOn : -1} }
    ]).exec(function (err, bookingDetails) {
        if (err) {
            return res.status(500).send(err);
        }
        res.status(200).send(bookingDetails);
        });
});



module.exports = router;