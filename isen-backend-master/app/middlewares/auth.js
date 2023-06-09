const expressJWT = require('express-jwt')
const Response = require('../controllers/Response')
const { adminCheck } = require('../helpers')
const User = require('../models/User')
require('dotenv').config()

exports.requireSignin = expressJWT({
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256'],
    userProperty: 'auth'
})

exports.isAuth = (req, res, next) => {
   try {
        if(adminCheck(req)) next()
        else if(!req.user || !req.auth || req.auth._id != req.user._id)
            return Response.sendError(res, 403, 'Access denied')
        else next()
   } catch (error) {
       console.log(error);
   }
}

exports.isAdmin = (req, res, next) => {
    if(!adminCheck(req))
        return Response.sendError(res, 403, 'Access forbniden')
    next()
}

exports.isSuperAdmin = (req, res, next) => {
    if(req.auth.role != 'SUPER ADMIN')
        return Response.sendError(res, 403, 'Access forbniden')
    next()
}

exports.withAuthUser = (req, res, next) => {
    User.findOne({_id: req.auth._id}, (err, user) => {
        if(err || !user) return Response.sendError(res, 401, 'you are not signed in');
        req.authUser = user;
        next();
    })
}