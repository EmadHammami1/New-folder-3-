const Validator = require('validatorjs')
const Response = require('../../controllers/Response')

exports.storeProductValidator = (req, res, next) => {
    const validation = new Validator(req.fields, {
        'label': 'min:2|max:50|required',
        'description': 'min:5|max:255|required',
        'price': 'min:2|max:12|required',
        'currency': 'min:2|max:5|required',
        'state': 'in:enabled,disabled'
    })
    if(validation.fails()) return Response.sendError(res, 400, validation.errors)
    next()
}

exports.updateProductValidator = (req, res, next) => {
    const validation = new Validator(req.fields, {
        'label': 'min:2|max:50',
        'description': 'min:5|max:255',
        'price': 'min:2|max:12',
        'currency': 'min:2|max:5',
        'state': 'in:enabled,disabled'
    })
    if(validation.fails()) return Response.sendError(res, 400, validation.errors)
    next()
}
