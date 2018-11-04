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
password:req.body.password
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

//return a user on the basis of email and password
router.post('/login',function(req,res){
console.log('req ',req)
    User.findOne({password:req.body.password,email:req.body.email},function(err,user){
        if (err) return res.status(500).send("There was a problem finding the user.");
        console.log('user from userController',user);
        res.status(200).send(user);
    });
});

module.exports=router;