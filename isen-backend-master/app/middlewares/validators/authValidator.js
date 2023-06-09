const Validator = require('validatorjs')
const Response = require('../../controllers/Response')

exports.signupVlidator = (req, res, next) => {
    const validation = new Validator(req.body, {
        'firstName': 'required|alpha_dash|max:50|min:2',
        'lastName': 'required|alpha_dash|max:50|min:2',
        'password': 'required|confirmed|min:8|max:50',
        'email': 'required|email|max:150|min:5',
        'gender': 'required|in:male,female',
        'birthDate': 'required|date',
    })
    const birthDate = new Date(req.body.birthDate).getTime();
    const currDate = new Date().getTime();
    const diffDate = currDate - birthDate;

    if(validation.fails()) return Response.sendError(res, 400, validation.errors)
    else if(diffDate < 8 * 365 * 24 * 60 * 60 * 1000){
        return Response.sendError(res, 400, {
            errors: {
                birthDate: ['invalid birth date']
            }
        })
    }
    next()
}

exports.signinVlidator = (req, res, next) => {
    const validation = new Validator(req.body, {
        'email': 'required|email',
        'password': 'required'
    })
    if(validation.fails()) return Response.sendError(res, 400, validation.errors)
    next()
}

exports.checkEmailValidator = (req, res, next) => {
    const validation = new Validator(req.body, {
        'email': 'required|email'
    })
    if(validation.fails()) return Response.sendError(res, 400, validation.errors)
    next()
}