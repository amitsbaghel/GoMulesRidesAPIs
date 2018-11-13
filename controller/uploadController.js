var express = require('express');
var router = express.Router();
var multer = require('multer');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '.' + file.mimetype.split('/')[1])
        //field name is uploads[] .You can change it to originalname
        //cb(null, file.originalname)
    }
})

var upload = multer({ storage: storage }).array('uploads[]', 10)

// upload files
router.post('/', function (req, res) {
    // req.files is array of `photos` files
    // req.body will contain the text fields, if there were any ex :: req.body.itemname

    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            res.end(err.toString());
        } else if (err) {
            // An unknown error occurred when uploading.
            res.end(err.toString());
        }
        res.status(200).send({ status: 'success' });
    });
})

module.exports = router;