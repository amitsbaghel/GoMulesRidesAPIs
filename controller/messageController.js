module.exports = function(http)
{
var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var bodyParser = require('body-parser');
var io = require('socket.io')(http);
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
var Message = require('../model/message');
var User = require('../model/user');

router.get('/', function (req, res) {
    res.status(500).send('from socket server GET request.')
}); // ends

// save message starts
router.post('/', function (req, res) {
    var msg = new Message({
        message: req.body.text,
        sentById:mongoose.Types.ObjectId(req.body.from),
        sentToId:mongoose.Types.ObjectId(req.body.to)
    });

    msg.save(function (err, message) {
        if (err)
            return res.status(500).send(err);
        res.status(200).send(message);
    });
}); // save message ends

// get all the users one talked with.
router.get('/:fromUserId/:toUserId', function (req, res) {

    Message.aggregate([
        {
            $match: 
            { $or: [ // either sentToID and sentFromId OR sentFromId and sentToID 
                { sentById: {$eq: mongoose.Types.ObjectId(req.params.fromUserId)} },  
                { sentToId: {$eq: mongoose.Types.ObjectId(req.params.fromUserId)} } 
            ]}
        },
        {
            $lookup: {
                from: "users",
                localField: "sentToId",
                foreignField: "_id",
                as: "sentToUsers"
            }
        },
         { $unwind: '$sentToUsers' },
         {
            $lookup: {
                from: "users",
                localField: "sentById",
                foreignField: "_id",
                as: "sentByUsers"
            }
        },
         { $unwind: '$sentByUsers' },
        {
            $project: {
                sentToId:'$sentToId',
                sentToName:'$sentToUsers.name',
                sentById:'$sentById',
                sentByName:'$sentByUsers.name'
            }
        },

        {
            $project: {
                // the heart
                sentById:{
                    $cond: { if: { $eq: [ "$sentById", mongoose.Types.ObjectId(req.params.fromUserId) ] }, then: '$sentById', else: '$sentToId' }
                  },
                  sentToId:{
                    $cond: { if: { $eq: [ "$sentById", mongoose.Types.ObjectId(req.params.fromUserId) ] }, then: '$sentToId', else: '$sentById' }
                  },
                  sentByName:{
                    $cond: { if: { $eq: [ "$sentById", mongoose.Types.ObjectId(req.params.fromUserId) ] }, then: '$sentByName', else: '$sentToName' }
                  },
                  sentToName:{
                    $cond: { if: { $eq: [ "$sentById", mongoose.Types.ObjectId(req.params.fromUserId) ] }, then: '$sentToName', else: '$sentByName' }
                  },
            }
        },
        
        {
            $group: {
                _id:
                {sentToId:'$sentToId',
                sentToName:'$sentToName',
                sentById:'$sentById',
                sentByName:'$sentByName'
                }
            }
        },
        {
            $project: {
                sentToId:'$_id.sentToId',
                sentToName:'$_id.sentToName',
                sentById:'$_id.sentById',
                sentByName:'$_id.sentByName'
            }
        },
        {
            $addFields: {
                tobeopened: false
                }
        }
    ]).exec(function (err, usermessages) {
        if (err) {
            return res.status(500).send(err) ;
        }
        // if ToUserId has been sent then find it in the
        if(req.params.toUserId!='null') // check null or what.
        {
        var userData= usermessages.find(x => x.sentById==req.params.toUserId || x.sentToId==req.params.toUserId  );
        if(!userData) // if not exists add to the existing array.
        {
            User.findById(req.params.toUserId,"name",function(err,user){
                if (err)
                    return res.status(500).send(err);

                var user={
                    sentToId:req.params.toUserId,
                    sentToName:user.name,
                    sentById:req.params.fromUserId,
                    tobeopened:false
                }
                usermessages.push(user);
                // response should be sorted first.
                res.status(200).send(usermessages);
            })
        }
        else //if exists in the result.
        res.status(200).send(usermessages);
    } // if not null the to param.
    else{ //send response as it is.
        res.status(200).send(usermessages);
    }
    } // closes exec function.
        ) //closes exec.
}); // ends

router.get('/messages/:fromUserId/:toUserId', function (req, res) {

    var sentBy=mongoose.Types.ObjectId(req.params.fromUserId);
    var sentTo=mongoose.Types.ObjectId(req.params.toUserId);

    Message.find(
        { $query: 
            { $or: [ // either sentToID and sentFromId OR sentFromId and sentToID 
                { $and: [ { sentById: { $eq: sentBy } }, { sentToId: { $eq: sentTo } } ] },  
                { $and: [ { sentById: { $eq: sentTo } }, { sentToId: { $eq: sentBy } } ] } 
            ]}
            , $orderby: { createdDate: -1 } } // order by
    ,function (err, messages) {
        if (err) {
            return res.status(500).send(err);
        }
        res.status(200).send(messages);
    })
}); // ends

io.on('connection', (socket) => {

    console.log('user connected');

    socket.on('disconnect', function() {
        console.log('user disconnected');
    });

    socket.on('add-message', (message) => {
        io.emit('message', { type: 'new-message', text: message });
    });

});

return router;
}

