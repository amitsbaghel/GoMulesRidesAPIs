var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
var mongoose = require('mongoose');

var Booking = require('../model/booking');

// save ride starts
router.post('/', function (req, res) {

    var booking = new Booking({
        userId: mongoose.Types.ObjectId(req.body.userID),
        seat: req.body.seat,
        charge:req.body.charge,
        rideId: mongoose.Types.ObjectId(req.body.rideID)
    });

    booking.save(function (err, ride) {
        if (err)
            return res.status(500).send(err);
        console.log(ride)

        res.status(200).send(ride);
    });

}); // save booking ends

module.exports = router;