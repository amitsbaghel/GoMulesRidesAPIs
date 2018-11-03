var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
var mongoose = require('mongoose');

var Ride = require('../model/ride');


//return all the user in the database starts
router.get('/', function (req, res) {

    // db.collection.aggregate([
    //     { $match: { name: "jhon" }},
    //     { $unwind: "$msgs" },
    //     { $sort: { "msgs.date": -1 }},
    //     { $group: { _id: "$name", msgs: { $addToSet: "$msgs" }}},
    //     { $project: { _id: 0 }}
    //   ])

    //https://mongoplayground.net/
    // https://stackoverflow.com/questions/38597545/insert-and-return-id-of-sub-document-in-mongodb-document-sub-document-array
    // https://stackoverflow.com/questions/19647475/summing-mongo-sub-documents-field


    // ride should be todays or greater than todays date.
    Ride.
        find({}).sort({ 'date': -1 }).
        populate({ path: 'userId', select: 'name' }).
        exec(function (err, rides) {
            if (err)
                return res.status(500).send("There was a problem adding the information to the database.");

                res.status(200).send(rides);

        });

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
        time: req.body.time,
        seat: req.body.seat,
        charge:req.body.charge,
        userId: mongoose.Types.ObjectId(req.body.id)
    });

    ride.save(function (err, ride) {
        if (err)
            return res.status(500).send(err);
        console.log(ride)

        res.status(200).send(ride);
    });

}); // save ride ends

module.exports = router;