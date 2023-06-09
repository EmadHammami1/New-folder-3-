const Response = require("../controllers/Response")
const { adminCheck } = require("../helpers")
const Product = require("../models/Product")
const { userSubscribed } = require("./subscription")

exports.productById = (req, res, next, id) => {
    Product.findOne({_id: id}, {
        label: 1,
        description: 1,
        price: 1,
        currency: 1,
        sold: 1,
        country: 1,
        city: 1,
        photo: "$photo.path",
        user: 1,
        deletedAt: 1,
        createdAt: 1
    }, (err, product) => {
        if(err || !product) return Response.sendError(res, 400, 'product not found')
        req.product = product
        next()
    })
}

exports.productOwner = (req, res, next) => {
    if(adminCheck(req)){
        return next()
    }

    if(req.auth._id != req.product.user){
        return Response.sendError(res, 403, 'Access denied')
    }

    next();
}

exports.productStorePermission = async(req, res, next) => {

    if(await userSubscribed(req.authUser)){
        return next()
    }
    Product.find({user: req.auth._id}, {}, {sort: {'createdAt': -1}, limit: 1}, (err, product) => {
        if(err) return Response.sendError(res, 'an error has occured, please try again later');
        
        const currDate = new Date()
        /*
        * check if the difference between the current date and the date when the last product 
        was created is less than 24 hours
        */
        if(product[0] && currDate.getTime() - (new Date(product[0].createdAt)).getTime() < 24 * 60 * 60 * 1000)
            return Response.sendResponse(res, {date: product[0].createdAt})
        else
            next()
    })
}