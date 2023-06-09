const Response = require("../controllers/Response")
const User = require("../models/User")

exports.userById = (req, res, next, id) => {
    User.findOne({_id: id}, (err, user) => {
        if(err || !user) return Response.sendError(res, 400, 'user not found')
        req.user = user
        next()
    })
}

exports.isNotFriend = (req, res, next) => {
    const user = req.user
    if(user.friends.includes(req.auth._id))
        return Response.sendError(res, 400, 'user already friend')
    next()
}

exports.isNotBlocked = (req, res, next) => {
    try{
        const user = req.user
        User.findOne({_id: req.auth._id}, (err, authUser) => {
            if(authUser.blockedUsers.includes(user._id) 
            || user.blockedUsers.includes(authUser._id)){
                return Response.sendError(res, 404, 'not found')
            }
            next()
        })
    }catch(err){
        console.log(err);
    }
}

// authUserNotPremium = (req, res, next) => {
//     if(!req.authUser.subscription) return next()
//     return Response.sendError(res, 400, 'You are already subscribed')
// }