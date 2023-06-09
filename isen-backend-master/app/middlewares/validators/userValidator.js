const Validator = require('validatorjs')
const Response = require('../../controllers/Response')

exports.userStoreValidator = (req, res, next) => {
    try {
        console.log(req.fields);
        const validation = new Validator(req.fields, {
            'firstName': 'required|alpha|max:40|min:2',
            'lastName': 'required|alpha|max:40|min:2',
            'email': 'required|email|max:150|min:5',
            'password': 'required|confirmed|max:150|min:8',
            'gender': 'required|in:male,female',
            'phone': 'min:4',
            'country': 'alpha|max:30|min:3', 
            'birthdate': 'date',
            'school': 'max:50|min:2',
            'education': 'max:30|min:2',
            'profession': 'max:30|min:2',
        })
        if(validation.fails()) return Response.sendError(res, 400, validation.errors)
        next()
    } catch (error) {
        console.log(error);
    }
}

exports.userDashUpdateValidator = (req, res, next) => {
    try {
        const validation = new Validator(req.fields, {
            'firstName': 'alpha|max:40|min:2',
            'lastName': 'alpha|max:40|min:2',
            'email': 'email|max:150|min:5',
            'gender': 'in:male,female',
            'phone': 'min:4',
            'country': 'alpha|max:30|min:3', 
            'password': 'min:8|confirmed',
            'birthdate': 'date',
            'school': 'max:50|min:2',
            'education': 'max:30|min:2',
            'profession': 'max: 30|min:2',
        })
        if(validation.fails()) return Response.sendError(res, 400, validation.errors)
        next()
    } catch (error) {
        console.log(err);
    }
}

exports.userUpdateValidator = (req, res, next) => {
    const validation = new Validator(req.fields, {
        'firstName': 'alpha|max:40|min:2',
        'lastName': 'alpha|max:40|min:2',
        'email': 'email|max:150|min:5',
        'gender': 'in:male,female',
        'phone': 'regex:\\+?[0-9]+|min:4',
        'country': 'alpha|max:30|min:3', 
        'birthdate': 'date',
        'school': 'max:50|min:2',
        'education': 'max:30|min:2',
        'profession': 'max: 30|min:2',
        'interests': 'array|max:10'
    })
    if(validation.fails()) return Response.sendError(res, 400, validation.errors)
    next()
}

exports.updatePasswordValidator = (req, res, next) => {
    const validation = new Validator(req.body, {
        'current_password': 'string|required',
        'password': 'min:8|max:40|confirmed|required',
    })
    if(validation.fails()) return Response.sendError(res, 400, validation.errors)
    next()
}

exports.updateEmailValidator = (req, res, next) => {
    const validation = new Validator(req.body, {
        'email': 'email|max:50|required',
    })
    if(validation.fails()) return Response.sendError(res, 400, validation.errors)
    next()
}