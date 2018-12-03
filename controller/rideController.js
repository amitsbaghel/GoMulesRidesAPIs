var express = require('express');
const url = require('url');
var router = express.Router();
var bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
var mongoose = require('mongoose');

var Ride = require('../model/ride');
var Booking = require('../model/booking');
var User = require('../model/user');

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('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');

//return all the rides in the database starts
router.get('/', function (req, res) {
    // https://mongoplayground.net/
    // show rides which are today or after today.
    _getridedetails(null,['incomplete'],null,null,null).exec(function (err, values) {
        if (err)
            return res.status(500).send(err);
        res.status(200).send(values)
    })

}); // ends

// get rides user specific
router.get('/:userid', function (req, res) {
    _getridedetails(req.params.userid,null,null).exec(function (err, values) {
        if (err)
            return res.status(500).send(err);
        res.status(200).send(values)
    })
}); // ends

// get rides by rideid
// without routing.
router.get('/fetch/ride/by/id/:rideid', function (req, res) {
    _getridedetails(null,null,req.params.rideid).exec(function (err, values) {
        if (err)
            return res.status(500).send(err);
        res.status(200).send(values)
    })
}); // ends


router.get('/filter/rides/by/cities/:cityfrom/:cityto', function (req, res) {
    console.log(req.params)
    _getridedetails(null,['incomplete'],null,req.params.cityfrom,req.params.cityto).exec(function (err, values) {
        if (err)
            return res.status(500).send(err);
        res.status(200).send(values)
    })
}); // ends

// update ride status // complete the ride
router.get('/:rideid/:userid', function (req, res) {
    console.log('/:rideid/:userid')
    Ride.
        findOneAndUpdate({ userId: req.params.userid, _id: req.params.rideid }, { status: 'complete' }, function (err, ride) {
            if (err) {
                return res.status(500).send(err);

            }

            res.redirect(url.format({
                pathname: "/ride/"+req.params.userid
            }))
        })
}); // ends

// get all the rides, comments and ratings from the ride poster.
router.get('/details/comments/:userid', function (req, res) {
    // console.log('/details/comments/:userid');
    _getridedetailswithAvg(req.params.userid,['complete',"cancelled",'incomplete'],null).exec(function (err, values) {
        if (err)
            return res.status(500).send(err);
        res.status(200).send(values)
    })

}); // ends

// cancel ride
router.get('/ride/cancel/:rideid/:userid', function (req, res) {
    // 1. first cancelling the ride.
    Ride.
        findOneAndUpdate({ userId: req.params.userid, _id: req.params.rideid }, { status: 'cancelled' }, function (err, ride) {
            if (err) {
                return res.status(500).send(err);
            }
            // 2. Getting all the users who have booked that particular ride.
            Booking.aggregate([
                {
                    $match: {
                        'rideId': {
                            $eq: mongoose.Types.ObjectId(req.params.rideid)                        
                        },
                        'status':{$eq:'active'}
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
                            format: '%m-%d-%Y' //%H-%M
                        }},
                        rideTime:'$ridedetails.time',
                        ridePosterName:'$ridePosterDetails.name',
                        ridePosterEmail:'$ridePosterDetails.email',
                        ridePosterId:'$ridePosterDetails._id',
                    }
                }

            ]).exec(function (err, userDetails) {
                if (err) {

                    return res.status(500).send(err);
                }

                // 3. update user wallets who booked the ride.
                userDetails.forEach(user => {

                    // console.log('user.userWallet',user.userWallet);
                    // updating wallet of the users// giving back the money.
                    User.findOneAndUpdate({ _id: user.userId }, { $inc: { wallet: +parseInt(user.bookingAmount) } }, function (err, userUpdated) {
                        if (err) {
                            return res.status(500).send(err);
                        }
                    });

                    // here ride poster wallet will be deducted.
                    User.findOneAndUpdate({ _id: user.ridePosterId}, { $inc: { wallet: -parseInt(user.bookingAmount) } }, function (err, userUpdated) {
                        if (err) {
                            return res.status(500).send(err);
                        }
                    });

                    // send an email to this user updating that ride has been cancelled and money has been reimbursed.
                    var textcontent= 'Hi ' + user.userName + '. Your ride from '+user.rideFrom+' to '+user.rideTo+' on '+user.rideDate+' has been cancelled by '+user.ridePosterName+' and $'+ user.bookingAmount+' has been reimbursed to your account.';
                    textcontent+='You can contact the ride poster at '+user.ridePosterEmail;

                    var emailcontent = {
                        from: 'noreply@gomulesrides.com', //GomulesRides@sendgrid.net
                        to: user.userEmail,
                        subject: 'Ride cancelled :(',
                        text: textcontent
                    };

                    // send mail to the ride booking user
                    sgMail.send(emailcontent,false,function(err,response){
                            if(err)
                            console.log('error from email',err)
                    });
                });

                res.redirect(url.format({
                    pathname: "/ride/"+req.params.userid
                }))
            });
        })
}); // ends

// save ride starts
router.post('/', function (req, res) {
    console.log('/');
    // { $push: { ride: rideData } },{ new: true }, // child
    var ride = new Ride({
        from: req.body.from,
        to: req.body.to,
        date: req.body.date,
        time: req.body.time,
        seat: req.body.seat,
        charge: req.body.charge,
        userId: mongoose.Types.ObjectId(req.body.id)
    });

    ride.save(function (err, ride) {
        if (err)
            return res.status(500).send(err);
        res.status(200).send(ride);
    });

}); // save ride ends

function _getridedetails(userid,status,rideid,from,to) {
    let queryParams = {}
    if(userid)
    queryParams.userId={$eq: mongoose.Types.ObjectId(userid)}
    if(status)
    queryParams.status={$in: status}
    if(rideid)
    queryParams._id={$eq:mongoose.Types.ObjectId(rideid)}
    if(from!='undefined' && from!=null)
    queryParams.from={$eq:from}
    if(to!='undefined' && to!=null)
    queryParams.to={$eq:to}
    if(status!=null && status[0]=='incomplete')
    queryParams.date={$gte:new Date()}
    //new Date('2018-12-22T05:00:00.000Z') for testing purpose.
    // compare only date part and for time compare only time part.

    console.log('queryParams',queryParams);

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
            $unwind: { path: '$userDetails' }
        },
        {
            $lookup: {
                from: "bookings", //right
                // localField: "_id", //left value
                // foreignField: "rideId", //right value
                let: { rideid: "$_id"},
                pipeline: [  
                    { $match:
                    { $expr:
                       { $and:
                          [
                            { $eq: [ "$rideId",  "$$rideid" ] }, //foreign field and local field.
                            // { $gt: [ "$rating", 0 ] } ,// so we could fetch rating greater than 0
                            { $eq: [ "$status", 'active' ] }
                          ]
                       }
                    }
                 },
                 ],
                as: "bookingDetails"
            }
        }, // second lookup ends        
        {  
            $unwind: { path: '$bookingDetails', preserveNullAndEmptyArrays: true }
        },
      
        {
            $lookup: {
                from: "users", //right
                localField: "bookingDetails.userId", //left value
                foreignField: "_id", //right value
                as: "bookingUser"
            }
        }, // second lookup ends
        {  
            $unwind: { path: '$bookingUser', preserveNullAndEmptyArrays: true }
        },
        {
            $project: { 
                _id: 1,
                userId: 1,
                from: '$from',
                user: '$userDetails.name',
                useremail: '$userDetails.email',
                to: '$to',
                date: '$date',
                createdDate:'$createdDate',
                time: '$time',
                rating:'$bookingDetails.rating',
                overallseats: '$seat',
                chargeperseat: '$charge',
                status: '$status',
                bookedseats: '$bookingDetails.seat',
                bookedcharge: '$bookingDetails.charge',
                bookingUserDetails:{
                    comment:'$bookingDetails.comment',
                    rating:'$bookingDetails.rating',
                    name:'$bookingUser.name'
                },
                bookingUserdata:'$bookingUser.name'
            }
        },
        {
            $group: {
                _id: {
                    _id: '$_id',
                    from: '$from',
                    userid: '$userId',
                    useremail:'$useremail',
                    to: '$to',
                    date: '$date',
                    time: '$time',
                    overallseats: '$overallseats',
                    chargeperseat: '$chargeperseat',
                    status: '$status',
                    name: '$user',
                    createdDate:'$createdDate'
                },
                
                totalbookingseats: { $sum: "$bookedseats" },
                totalbookingcharge: { $sum: "$bookedcharge" },
                rating:{$avg:"$rating"}, 
                bookingUserDetails:{$push:"$bookingUserDetails"},
            }
        },
        {
         $unwind: { path: '$_id.name', preserveNullAndEmptyArrays: true }
        }
    ])
}

// function for getting average rating too
function _getridedetailswithAvg(userid,status,rideid) {
    let queryParams = {}
    if(userid)
    queryParams.userId={$eq: mongoose.Types.ObjectId(userid)}
    if(status)
    queryParams.status={$in: status}
    if(rideid)
    queryParams._id={$eq:mongoose.Types.ObjectId(rideid)}

    console.log('_getridedetailswithAvg',queryParams)

    return Ride.aggregate([ // left
        { $match: queryParams },
        { // lookup userDetails
            $lookup: {
                from: "users", //right
                localField: "userId", //left value
                foreignField: "_id", //right value
                as: "userDetails"
            }
        }, //first lookup ends
        {  
            $unwind: { path: '$userDetails' }
        },
        {
            $lookup:{
                from: "bookings",
                let: { rideid: "$_id"},
                pipeline: [  
                    { $match:
                    { $expr:
                       { $and:
                          [
                            { $eq: [ "$rideId",  "$$rideid" ] }, //foreign field and local field.
                            { $gt: [ "$rating", 0 ] } ,// so we could fetch rating greater than 0
                            { $eq: [ "$status", 'active' ] }
                          ]
                       }
                    }
                 },
                 ],
                as: "bookingDetails"
            }
        },
        {  
            $unwind: { path: '$bookingDetails', preserveNullAndEmptyArrays: true }
        },
      
        {
            $lookup: {
                from: "users", //right
                localField: "bookingDetails.userId", //left value
                foreignField: "_id", //right value
                as: "bookingUser"
            }
        }, // second lookup ends
        {  
            $unwind: { path: '$bookingUser', preserveNullAndEmptyArrays: true }
        },
        {
            $project: { 
                _id: 1,
                userId: 1,
                from: '$from',
                user: '$userDetails.name',
                useremail: '$userDetails.email',
                to: '$to',
                date: '$date',
                createdDate:'$createdDate',
                time: '$time',
                rating:'$bookingDetails.rating',
                overallseats: '$seat',
                chargeperseat: '$charge',
                status: '$status',
                bookedseats: '$bookingDetails.seat',
                bookedcharge: '$bookingDetails.charge',
                bookingUserDetails:{
                    comment:'$bookingDetails.comment',
                    rating:'$bookingDetails.rating',
                    name:'$bookingUser.name'
                },
                bookingUserdata:'$bookingUser.name'
            }
        },
        {
            $group: {
                _id: {
                    _id: '$_id',
                    from: '$from',
                    userid: '$userId',
                    useremail:'$useremail',
                    to: '$to',
                    date: '$date',
                    time: '$time',
                    overallseats: '$overallseats',
                    chargeperseat: '$chargeperseat',
                    status: '$status',
                    name: '$user',
                    createdDate:'$createdDate'
                },
                
                totalbookingseats: { $sum: "$bookedseats" },
                totalbookingcharge: { $sum: "$bookedcharge" },
                rating:{$first:"$rating"}, 
                bookingUserDetails:{$push:"$bookingUserDetails"},
            }
        },
        {
         $unwind: { path: '$_id.name', preserveNullAndEmptyArrays: true }
        },
        { $group : {
            _id : null,
            all:{
                $push:{
                   _id:'$_id',
                   totalbookingseats:'$totalbookingseats',
                   totalbookingcharge:'$totalbookingcharge',
                   bookingUserDetails:'$bookingUserDetails'
                }
            },
            avg_rating : { $avg : "$rating" },
            rideposterEmail : { $first : "$_id.useremail" },
            }
        }
    ])
}


module.exports = router;