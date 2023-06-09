const User = require("../models/User")
const mongoose = require('mongoose')

const Response = require("./Response")
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const Request = require("../models/Request")
const { manAvatarPath, womenAvatarPath, setOnlineUsers, extractDashParams, report, sendNotification } = require("../helpers")
const Report = require("../models/Report")
const Channel = require("../models/Channel")
const Product = require("../models/Product")
const Job = require("../models/Job")
const Service = require("../models/Service")
const Post = require("../models/Post")
const Comment = require("../models/Comment")
const Subscription = require("../models/Subscription")

exports.reportUser = (req, res) => {
    try {
        const user = req.user
        if(!req.body.message) return Response.sendError(res, 400, 'please enter a message')
        report(req, res, 'user', user._id, (report) => {
            User.updateOne({_id: user._id}, {$push: {reports: report}}, (err, user) => {
                if(err) return Response.sendError(res, 400, 'failed')
                return Response.sendResponse(res, null, 'Thank you for reporting')
            })
        })
    } catch (error) {
        console.log(error);
    }
}

exports.clearUserReports = (req, res) => {
    Report.remove({
        "entity._id": req.user._id,
        "entity.name": "user"
    }, (err, rmRes) => {
        if(err) return Response.sendError(res, 400, 'failed to clear reports')
        return Response.sendResponse(res, null, "reports cleaned")
    })

}

exports.banUser = (req, res) => {
    try {
        const user = req.user
        const message = req.body.message
        console.log(message);
        user.banned = true
        user.bannedReason = message
        user.save((err, user) => {
            if(err) return Response.sendError(res, 400, 'Server Error')
            return Response.sendResponse(res, user, 'user banned')
        })
    } catch (error) {
        console.log(error);
    }
}

exports.unbanUser = (req, res) => {
    const user = req.user
    user.banned = false
    user.bannedReason = ''
    user.save((err, user) => {
        if(err) return Response.sendError(res, 400, 'Server Error')
        return Response.sendResponse(res, user, 'user unbanned')
    })
}

exports.allUsers = (req, res) => {
    try{
        dashParams = extractDashParams(req, ['firstName', 'lastName', 'email', 'role']);
        User.aggregate()
        .match(dashParams.filter)
        .project({
            firstName: 1,
            lastName: 1,
            email: 1,
            role: 1,
            avatar: "$avatar.path",
            enabled: 1,
            reports: {
                $size: "$reports"
            }
        })
        .sort(dashParams.sort)
        .skip(dashParams.skip)
        .limit(dashParams.limit)
        .exec(async(err, users) => {
            if(err || !users) return Response.sendError(res, 500, 'Server error, please try again later');
            const count = await User.find(dashParams.filter).countDocuments();
            return Response.sendResponse(res, {
                docs: users,
                totalPages: Math.ceil(count / dashParams.limit)
            });
        });
    }catch(err){
        console.log(err);
    }
}

exports.storeUser = (req, res) => {
    try{
        User.findOne({email: req.fields.email}, async(err, user) => {
            if(err) return Response.sendError(res, 400, 'Server error')
            if(user) return Response.sendError(res, 400, 'email already used in another account')

            const fields = _.omit(req.fields, ['avatar'])

            user = new User(fields)

            if(req.files.avatar) this.storeAvatar(req.files.avatar, user)
            else{
                if(user.gender == 'male') user.avatar.path = manAvatarPath
                else user.avatar.path = womenAvatarPath
                user.avatar.type = "png";
            }

            await user.save();

            await addGlobalChannels(user)
            await addLocalChannels(user)
            await addFreeSubscription(user)
        }) 
    }catch(err){
        console.log(err);
    }
}

addFreeSubscription = async(user) => {
    //assign one month subscription free
    subscription = await Subscription.findOne({})
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

exports.updateUserDash = (req, res) => {
    try{
        let user = req.user
        const fields = _.omit(req.fields, ['password', 'avatar'])

        fields.interests = fields.interests.split(',')
        user = _.extend(user, fields)
        
        if(req.fields.password != 'undefined'){
            user.password = req.fields.password
        }

        if(req.files.avatar) this.storeAvatar(req.files.avatar, user)

        user.save((err, user) => {
            if(err) return Response.sendError(res, 400, 'Server error')
            user = user.publicInfo();
            Response.sendResponse(res, user, 'the user has been updated successfully')
        })
    }catch(err){
        console.log(err);
    }
}

exports.showUserDash = (req, res) => {
    try {
        User.findOne({_id: req.user._id}, {
            firstName: 1,
            lastName: 1,
            email: 1,
            gender: 1,
            country: 1,
            city: 1,
            birthDate: 1,
            avatar: "$avatar.path",
            role: 1,
            enabled: 1,
            interests: 1,
            phone: 1,
            school: 1,
            banned: 1,
            bannedReason: 1,
            education: 1,
            profession: 1
        })
        .populate('reports')
        .exec((err, user) => {
            if(err || !user) return Response.sendError(res, 400, 'User not found')
            return Response.sendResponse(res, user)
        })
    } catch (error) {
        console.log(error);
    }
}

exports.showUser = (req, res) => {
    try {
        return Response.sendResponse(res, req.user.publicInfo())
    } catch (error) {
        console.log(error);
    }
}

exports.updateUser = async (req, res) => {
    try{
        let user = req.authUser
        user = _.extend(user, req.body)

        user.save((err, user) => {
            if(err) return Response.sendError(res, 400, err)
            user = user.publicInfo();
            Response.sendResponse(res, user, 'updated successfully')
        })
    }catch(err){
        console.log(err);
    }
}

exports.updateEmail = async (req, res) => {
    try{
        const email = req.body.email
        const authUser = req.authUser
        User.findOne({email}, (err, user) => {
            if(err) return Response.sendError(res, 400, 'failed')
            if(user) return Response.sendError(res, 400, 'email already used in another account')
            authUser.email = email
            authUser.save((err, user) => {
                if(err || !user) return Response.sendError(res, 400, 'failed')
                return Response.sendResponse(res, user.publicInfo(), 'email changed')
            })
        })
    }catch(err){
        console.log(err);
    }
}

exports.updatePassword = (req, res) => {
    try{
        const { current_password, password } = req.body
        const authUser = req.authUser
        if(authUser.comparePassword(current_password)){
            authUser.password = password
            authUser.save((err, user) => {
                if(err || !user) return Response.sendError(res, 400, 'failed')
                return Response.sendResponse(res, user, 'password changed')
            })
        }else{
            return Response.sendError(res, 400, 'current password is incorrect')
        }
    }catch(err){
        console.log(err);
    }
}

exports.storeAvatar = (avatar, user) => {
    try {
        const avatarName = `${ user._id }_${ new Date().getTime() }.png`
        const avatarPath = path.join(__dirname, `./../../public/avatars/${ avatarName }`)

        fs.writeFileSync(avatarPath, fs.readFileSync(avatar.path))

        if(user.avatar.path != manAvatarPath && user.avatar.path != womenAvatarPath){
            const lastAvatarPath = path.join(__dirname, `./../../public/${ user.avatar.path }`)
            if(fs.existsSync(lastAvatarPath)) fs.unlinkSync(lastAvatarPath)
        }

        user.avatar.path = `/avatars/${ avatarName }`
        user.avatar.type = avatar.type
    } catch (error) {
        console.log(error);
    }
}

exports.updateAvatar = (req, res) => {
    let user = req.authUser
    const avatar = req.files.avatar;

    if(avatar){
        this.storeAvatar(avatar, user)
        user.save((err, user) => {
            if(err) return Response.sendError(res, 400, err)
            user = user.publicInfo(req);
            Response.sendResponse(res, user)
        })
    }else{
        return Response.sendError(res, 400, 'no image selected')
    }
}

exports.deleteAccount = async(req, res) => {
    const user = req.authUser
    user.deletedAt = new Date()
    await user.save()
    return Response.sendResponse(res, null, 'account deleted')
}

exports.deleteUser = (req, res) => {
    const user = req.user
    user.remove(async(err, usr) => {
        if(err) return Response.sendError(res, 400, 'could not delete the user')
        await Product.deleteMany({user: user._id})
        await Job.deleteMany({user: user._id})
        await Service.deleteMany({user: user._id})
        return Response.sendResponse(res, null, 'user deleted')
    })
}

exports.toggleUserStatus = (req, res) => {
    const user = req.user
    if(user.enabled) user.enabled = false;
    else user.enabled = true;
    user.save((err, use) => {
        if(err) return Response.sendError(res, 400, 'Server error, please try again later')
        return Response.sendResponse(res, user.enabled, 'the user account has been ' + user.enabled ? 'enabled' : 'disabled')
    })
}

exports.follow = async(req, res) => {
    const authUser = req.authUser
    const user = req.user
    let followed = false

    if(!authUser.following.includes(user._id)){
        authUser.following.push(user._id)
        if(!user.followers.includes(authUser._id))
            user.followers.push(authUser._id)
        followed = true
    }
    else{
        authUser.following.splice(authUser.following.indexOf(user._id), 1)
        if(user.followers.includes(authUser._id))
            user.followers.splice(user.following.indexOf(authUser._id), 1)
    }

    await user.save()
    await authUser.save()

    if(followed)
        sendNotification({en: req.authUser.firstName + ' ' + req.authUser.lastName}, {en: 'started following you'}, {
            type: 'follow-user',
            link: '/tabs/profile/display/' + user._id
        }, [], [user._id])

    return Response.sendResponse(res, followed, followed ? 'followed' : 'unfollowed')
}

exports.getUsers =  async(req, res) => {
    try{
        const page = req.query.page ? +req.query.page : 0
        let limit = 20;
        let skip = page * limit;
        const filter = {
            _id:{
                $ne: mongoose.Types.ObjectId(req.auth._id),
                $nin: req.authUser.blockedUsers
            },
            blockedUsers: {
                $ne: req.authUser._id
            },
            friends: {
                $ne: req.authUser._id
            },
            role: {
                $nin: ['ADMIN', 'SUPER ADMIN']
            },
            deletedAt: {
                $eq: null
            }
        }

        if(req.query.profession == '1'){
            filter['profession'] = {
                $eq: req.authUser.profession
            }
        }
        if(req.query.education == '1'){
            filter['education'] = {
                $eq: req.authUser.education
            }
        }
        if(req.query.interests == '1'){
            filter['interests'] = {
                $in: req.authUser.interests
            }
        }
        if(req.query.gender != 'both'){
            filter['gender'] = {
                $eq: req.query.gender
            }
        }
        const count = await User.find(filter).countDocuments();
        if(req.query.type == 'near') filter['city'] = req.authUser.city
        else{ 
            filter['randomVisible'] = true;
            limit = 9;
            skip = count > 5 ? Math.floor(Math.random() * (count - 5)) : 0
        }

        console.log('skip', skip);
        User.find(filter)
        .populate('requests', '', 'Request', {
            $or: [
                {from: mongoose.Types.ObjectId(req.auth._id)},
                {to: mongoose.Types.ObjectId(req.auth._id)}
            ]
        })
        .select({
            firstName: 1,
            lastName: 1,
            city: 1,
            gender: 1,
            avatar: "$avatar.path",
            birthDate: {$cond: [{$eq: ["$ageVisible", true]},  "$birthDate", null]},
            followed: {
                $in: [mongoose.Types.ObjectId(req.auth._id), "$followers"]
            },
            friend: {
                $in: [mongoose.Types.ObjectId(req.auth._id), "$friends"]
            },
            requests: 1,
            deletedAt: 1,
            createdAt: 1
        })
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit)
        .exec((err, users) => {
            console.log(users);
            if(err || !users) return Response.sendError(res, 400, 'Unexpected error !')
            users = setOnlineUsers(users);
            return Response.sendResponse(res, {
                users,
                more: (count - (limit * (+page + 1))) > 0
            })
        });
    }catch(err){
        console.log(err);
    }
}

exports.getUserProfile = (req, res) => {
    try{
        User.findOne({_id: req.user._id})
        .populate('requests', '', 'Request', {
            $or: [
                {from: mongoose.Types.ObjectId(req.auth._id)},
                {to: mongoose.Types.ObjectId(req.auth._id)}
            ]
        })
        .select({
            firstName: 1,
            lastName: 1,
            country: 1,
            city: 1,
            gender: 1,
            avatar: "$avatar.path",
            birthDate: {$cond: [{$eq: ["$ageVisible", true]},  "$birthDate", null]},
            followed: {
                $in: [mongoose.Types.ObjectId(req.auth._id), "$followers"]
            },
            friend: {
                $in: [mongoose.Types.ObjectId(req.auth._id), "$friends"]
            },
            requests: 1,
            profession: 1,
            interests: 1,
            education: 1,
            school: 1,
            deletedAt: 1
        })
        .exec((err, user) => {
            if(err || !user) return Response.sendError(res, 400, 'failed')
            if(user.deletedAt) return Response.sendResponse(res, null)
            return Response.sendResponse(res, user)
        });
    }catch(err){
        console.log(err);
    }
}

exports.getFriends = (req, res) => {
    try{
        const limit = 20;
        const filter = {
            friends: {
                $elemMatch: {
                    $eq: mongoose.Types.ObjectId(req.auth._id)
                }
            },
            deletedAt: null
        }
        User.find(filter, {
            firstName: 1,
            lastName: 1,
            birthDate: {$cond: [{$eq: ["$ageVisible", true]},  "$birthDate", null]},
            avatar: "$avatar.path",
            city: 1,

        })
        .skip(limit * req.query.page)
        .limit(limit)
        .exec((err, friends) => {
            if(err || !friends) return Response.sendError(res, 400, 'failed')
            User.find(filter).countDocuments((err, count) => {
                friends = setOnlineUsers(friends);
                return Response.sendResponse(res, {
                    friends,
                    more: (count - (limit * (+req.query.page + 1))) > 0
                })
            })
        })
    }catch(err){
        console.log(err);
    }
}

exports.removeFriendship = async(req, res) => {
    try{
        const authUser = req.authUser
        const user = req.user
        await User.updateOne({_id: user._id}, { $pull: { friends: authUser._id } })
        await User.updateOne({_id: authUser._id}, { $pull:{ friends:  user._id } })
        return Response.sendResponse(res, true, 'Friendship is removed')
    }catch(err){
        console.log(err);
        return Response.sendError(res, 400, 'failed')
    }
}

exports.blockUser = async(req, res) => {
    try{
        const user = req.user
        const authUser = req.authUser

        user.friends.splice(user.friends.indexOf(authUser._id), 1)
        user.followers.splice(user.friends.indexOf(authUser._id), 1)
        user.following.splice(user.friends.indexOf(authUser._id), 1)

        authUser.blockedUsers.push(user._id)
        authUser.friends.splice(user.friends.indexOf(user._id), 1)
        authUser.followers.splice(user.friends.indexOf(user._id), 1)
        authUser.following.splice(user.friends.indexOf(user._id), 1)

        authUser.save((err, result) => {
            if(err || !result) return Response.sendError(res, 400, 'failed')
            user.save((err, user) => {
                if(err || !user) return Response.sendError(res, 400, 'failed')
                Request.remove({
                    $or: [
                        {
                            $and: [
                                {from: mongoose.Types.ObjectId(req.auth._id)},
                                {to: mongoose.Types.ObjectId(req.user._id)}
                            ]
                        },
                        {
                            $and: [
                                {to: mongoose.Types.ObjectId(req.auth._id)},
                                {from: mongoose.Types.ObjectId(req.user._id)}
                            ]
                        }
                    ]
                })
                return Response.sendResponse(res, true, 'user blocked')
            })
        })
    }catch(err){
        console.log(err);
    }
}

exports.unblockUser = (req, res) => {
    User.updateOne({_id: req.auth._id}, { $pull: { blockedUsers: req.user._id }}, (err, user) => {
        if(err || !user) return Response.sendError(res, 400, 'failed')
        return Response.sendResponse(res, true, 'user unblocked')
    })
}

exports.updateRandomVisibility = (req, res) => {
    try {
        console.log(req.body.visible);
        User.updateOne({_id: req.auth._id}, { $set: { randomVisible: req.body.visible }}, (err, user) => {
            if(err || !user) return Response.sendError(res, 400, 'failed, please try again later')
            return Response.sendResponse(res, true, 'updated')
        })
    } catch (error) {
        console.log(error);
    }
}


exports.updateAgeVisibility = (req, res) => {
    try {
        console.log(req.body.visible);
        User.updateOne({_id: req.auth._id}, { $set: { ageVisible: req.body.visible }}, (err, user) => {
            if(err || !user) return Response.sendError(res, 400, 'failed, please try again later')
            return Response.sendResponse(res, true, 'updated')
        })
    } catch (error) {
        console.log(error);
    }
}

fileExtension = (fileName) => {
    nameParts = fileName.split('.')
    return nameParts[nameParts.length - 1]
}

exports.profileVisited = async(req, res) => {
    const authUser = req.authUser
    authUser.visitProfile = true;
    await authUser.save()
    return Response.sendResponse(res, null, 'profile visited')
}