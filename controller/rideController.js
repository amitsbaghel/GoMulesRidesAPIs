var express = require('express');
const url = require('url');
var router = express.Router();
var bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
var mongoose = require('mongoose');

var Ride = require('../model/ride');
var Booking = require('../model/booking');


//return all the rides in the database starts
router.get('/', function (req, res) {

    // https://mongoplayground.net/

    // Ride.
    //     find({}).sort({ 'date': -1 }).
    //     populate({ path: 'userId', select: 'name' }).
    //     populate({ path: 'bookingID', select: "seat" }).
    //     exec(function (err, rides) {
    //         if (err) {
    //             return res.status(500).send(err);
    //             // return res.status(500).send("There was a problem adding the information to the database.");
    //         }

    //         res.status(200).send(rides);
    //     })

    _getridedetails().exec(function (err, values) {
        if (err)
            return res.status(500).send(err);
        res.status(200).send(values)
    })

}); // ends

// get rides user specific
router.get('/:userid', function (req, res) {

    _getridedetails(req.params.userid).exec(function (err, values) {
        if (err)
            return res.status(500).send(err);
            console.log(values)
        res.status(200).send(values)
    })
    // Ride.
    //     find({ userId: req.params.userid }).sort({ 'date': -1 }).
    //     populate({ path: 'bookingID', select: "seat charge" }).
    //     exec(function (err, rides) {
    //         if (err) {
    //             return res.status(500).send("There was a problem adding the information to the database.");
    //         }

    //         res.status(200).send(rides);
    //     })



}); // ends

// update ride status
router.get('/:rideid/:userid', function (req, res) {
    Ride.
        findOneAndUpdate({ userId: req.params.userid, _id: req.params.rideid }, { status: 'complete' }, function (err, ride) {
            if (err) {
                return res.status(500).send("There was a problem adding the information to the database.");

            }
            res.redirect(url.format({
                pathname: "/ride/",
                query: {
                    "userid": req.params.userid,
                }
            }))
        })
}); // ends

// cancel ride
router.get('/cancel/:rideid/:userid', function (req, res) {
    Ride.
        findOneAndUpdate({ userId: req.params.userid, _id: req.params.rideid }, { status: 'cancelled' }, function (err, ride) {
            if (err) {
                return res.status(500).send("There was a problem adding the information to the database.");

            }
            res.redirect(url.format({
                pathname: "/ride/",
                query: {
                    "userid": req.params.userid,
                }
            }))
        })
}); // ends



// save ride starts
router.post('/', function (req, res) {

    // For Embedded documents
    // User.findOneAndUpdate(req.body.id, // User ID
    //     { $push: { ride: rideData } },{ new: true }, // child
    //     function (err, rideData) {
    //         if (err){
    //         console.log('err from err update ride',err);
    //             return res.status(500).send("There was a problem adding the information to the database.");

    //         }
    //         res.status(200).send(rideData); 
    //     }
    // );

    var ride = new Ride({
        from: req.body.from,
        to: req.body.to,
        date: req.body.date,
        time: '1900-01-01T' + req.body.time,
        seat: req.body.seat,
        charge: req.body.charge,
        userId: mongoose.Types.ObjectId(req.body.id),
        bookingID: []
    });

    ride.save(function (err, ride) {
        if (err)
            return res.status(500).send(err);
        console.log(ride)

        res.status(200).send(ride);
    });

}); // save ride ends

function _getridedetails(userid) {
    let queryParams = {}
    if (userid) {
        queryParams = {
            'userId': {
                $eq: mongoose.Types.ObjectId(userid)
            }
        }
    } //if ends
    else {
        queryParams = {
            'status': {
                $eq: 'incomplete',
            }
        }
    } //else ends

    return Ride.aggregate([ // left
        { $match: queryParams },
        {
            $lookup: {
                from: "users", //right
                localField: "userId", //left value
                foreignField: "_id", //right value
                as: "userDetails"
            }
        }, //first lookup ends
        {
            $lookup: {
                from: "bookings", //right
                localField: "bookingID", //left value
                foreignField: "_id", //right value
                as: "bookingDetails"
            }
        }, // second lookup ends
        {   // interesting 
            $unwind: { path: '$bookingDetails', preserveNullAndEmptyArrays: true }
        },
        {
            $project: { // what you want to manipulate before aggregation
                _id: 1,
                userId: 1,
                from: '$from',
                user: '$userDetails.name',
                to: '$to',
                date: '$date',
                time: '$time',
                overallseats: '$seat',
                chargeperseat: '$charge',
                status: '$status',
                bookedseats: '$bookingDetails.seat',
                bookedcharge: '$bookingDetails.charge'
            }
        },

        {
            //https://docs.mongodb.com/manual/reference/operator/aggregation/
            //https://docs.mongodb.com/manual/reference/operator/aggregation/group/#pipe._S_group
            $group: {
                _id: {
                    _id: '$_id',
                    from: '$from',
                    userid: '$userId',
                    to: '$to',
                    date: '$date',
                    time: '$time',
                    overallseats: '$overallseats',
                    chargeperseat: '$chargeperseat',
                    status: '$status',
                    name: '$user'
                },
                totalbookingseats: { $sum: "$bookedseats" },
                totalbookingcharge: { $sum: "$bookedcharge" }
            }
        }
    ])
}

module.exports = router;