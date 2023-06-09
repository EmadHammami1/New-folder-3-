const formidable = require('formidable');
const Response = require('../controllers/Response');

module.exports = (req, res, next) => {
    try {
        let form = new formidable.IncomingForm()
        form.keepExtensions = true;
        form.parse(req, (err, fields, files) => {
            if(err) return Response.sendError(res, 400, 'unable to handle the data form')
            req.fields = fields
            req.files = files
            next()
        });
    } catch (error) {
       console.log(error); 
    }
}