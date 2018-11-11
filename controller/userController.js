var express= require('express');
var router=express.Router();
var bodyParser=require('body-parser');
router.use(bodyParser.urlencoded({extended:true}));
router.use(bodyParser.json());

var User=require('../model/user');

// creating new user
router.post('/', function(req,res){

User.create({
name:req.body.name, 
email:req.body.email,
password:req.body.password,
wallet:req.body.password
},
function(err,user){
    if(err)
    return res.status(500).send("There was a problem adding the information to the database.");
    res.status(200).send(user);
});
});

//return all the user in the database
router.get('/',function(req,res){
    
    User.find({},function(err,users){
        if (err) return res.status(500).send("There was a problem finding the users.");
        res.status(200).send(users);
    });
});

//return a user from the database
router.get('/:userid',function(req,res){

    User.findOne({_id:req.params.userid},'-password', function(err,user){
        if (err) return res.status(500).send("There was a problem finding the user.");
        res.status(200).send(user);
    });
});


//return a user on the basis of email and password
router.post('/wallet',function(req,res){
    User.findByIdAndUpdate(req.body.userid,{ $inc: { wallet: +parseInt(req.body.wallet) } },{select:'wallet -_id',new:true},function(err,wallet){
        if (err) return res.status(500).send("There was a problem finding the user.");
        res.status(200).send(wallet);
    });
});


//return a user on the basis of email and password
router.post('/login',function(req,res){
    User.findOne({password:req.body.password,email:req.body.email},function(err,user){
        if (err) return res.status(500).send("There was a problem finding the user.");
        res.status(200).send(user);
    });
});

module.exports=router;