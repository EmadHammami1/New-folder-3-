const mongoose = require("mongoose")
const Channel = require("../models/Channel")
const Response = require("./Response")
const path = require('path')
const fs = require('fs')
const { extractDashParams, report, sendNotification } = require("../helpers")
const _ = require('lodash')
const Report = require("../models/Report")
const Post = require("../models/Post");
const { destroyPost } = require("./PostController")
const User = require("../models/User")

exports.reportChannel = (req, res) => {
    try {
        const channel = req.channel
        if(!req.body.message) return Response.sendError(res, 400, 'please enter a message')
        report(req, res, 'channel', channel._id, (report) => {
            Channel.updateOne({_id: channel._id}, {$push: {reports: report}}, (err, channel) => {
                if(err) return Response.sendError(res, 400, 'failed')
                return Response.sendResponse(res, null, 'Thank you for reporting')
            })
        })
    } catch (error) {
        console.log(error);
    }
}

exports.clearChannelReports = (req, res) => {
    Report.remove({
        "entity._id": req.channel._id,
        "entity.name": "channel"
    }, (err, rmRes) => {
        if(err) return Response.sendError(res, 400, 'failed to clear reports')
        return Response.sendResponse(res, null, "reports cleaned")
    })
}

exports.toggleChannelStatus = (req, res) => {
    try {
        const channel = req.channel
        channel.enabled = !channel.enabled
        channel.save((err, channel) => {
            console.log(err);
            if(err) return Response.sendError(res, 400, 'failed')
            return Response.sendResponse(res, channel)
        })
    } catch (error) {
        console.log(error);
    }
}

exports.toggleChannelApprovement = (req, res) => {
    try {
        const channel = req.channel
        channel.approved = !channel.approved
        channel.save((err, channel) => {
            console.log(err);
            if(err) return Response.sendError(res, 400, 'failed')
            return Response.sendResponse(res, channel)
        })
    } catch (error) {
        console.log(error);
    }
}

exports.showChannel = (req, res) => {
    Channel.findOne({_id: req.channel._id}, {
        name: 1,
        description: 1,
        country: 1,
        city: 1,
        user: 1,
        approved: 1,
        photo: "$photo.path",
        enabled: 1,
        reports: 1
    })
    .populate('reports')
    .exec((err, channel) => {
        return Response.sendResponse(res, channel)
    })
}

exports.allChannels = (req, res) => {
    try{
        dashParams = extractDashParams(req, ['name', 'description', 'country', 'city']);
        Channel.aggregate()
        .match(dashParams.filter)
        .project({
            name: 1,
            description: 1,
            approved: 1,
            city: 1,
            country: 1,
            photo: "$photo.path",
            enabled: 1,
            reports: {
                $size: "$reports"
            }
        })
        .sort(dashParams.sort)
        .skip(dashParams.skip)
        .limit(dashParams.limit)
        .exec(async(err, channels) => {
            console.log(err);
            if(err || !channels) return Response.sendError(res, 500, 'Server error, please try again later');
            const count = await Channel.find(dashParams.filter).countDocuments();
            return Response.sendResponse(res, {
                docs: channels,
                totalPages: Math.ceil(count / dashParams.limit)
            });
        });
    }catch(err){
        console.log(err);
    }
}

exports.exploreChannels = (req, res) => {
    try{
        const filter = {
            city: req.authUser.city,
            followers: {
                $ne: mongoose.Types.ObjectId(req.auth._id)
            },
            name: new RegExp('^' + req.query.search, 'i'),
            user: {
                $ne: mongoose.Types.ObjectId(req.auth._id)
            },
            approved: true,
            deletedAt: null
        }
        limit = 20
        Channel.find(filter , {
            name: 1,
            description: 1,
            photo: "$photo.path",
            user: 1,
            approved: 1,
            followers: 1
        })
        .skip(limit * req.query.page)
        .limit(limit)
        .exec((err, channels) => {
            if(err || !channels) return Response.sendError(res, 400, 'cannot retreive channels')
            Channel.find(filter).countDocuments((err, count) => {
                return Response.sendResponse(res, {
                    channels,
                    more: (count - (limit * (+req.query.page + 1))) > 0
                })
            })
        })
    }catch(err){
        console.log(err);
    }
}

exports.followedChannels = (req, res) => {
    try{
        const filter = {
            followers: {
                $elemMatch: {
                    $eq: mongoose.Types.ObjectId(req.auth._id)
                }
            },
            name: new RegExp('^' + req.query.search, 'i'),
            approved: true,
            enabled: true
        }
        limit = 20
        Channel.find(filter , {
            name: 1,
            description: 1,
            photo: "$photo.path",
            user: 1,
            approved: 1,
            followers: 1
        })
        .skip(limit * req.query.page)
        .limit(limit)
        .exec((err, channels) => {
            if(err || !channels) return Response.sendError(res, 400, 'cannot retreive channels')
            Channel.find(filter).countDocuments((err, count) => {
                return Response.sendResponse(res, {
                    channels,
                    more: (count - (limit * (+req.query.page + 1))) > 0
                })
            })
        })
    }catch(err){
        console.log(err);
    }
}

exports.myChannels = (req, res) => {
    try{
        const filter = {
            user: mongoose.Types.ObjectId(req.auth._id),
            name: new RegExp('^' + req.query.search, 'i'),
            enabled: true
        }
        limit = 20
        Channel.find(filter , {
            name: 1,
            description: 1,
            photo: "$photo.path",
            user: 1,
            followers: 1,
            approved: 1
        })
        .skip(limit * req.query.page)
        .limit(limit)
        .exec((err, channels) => {
            console.log(channels)
            if(err || !channels) return Response.sendError(res, 400, 'cannot retreive channels')
            Channel.find(filter).countDocuments((err, count) => {
                return Response.sendResponse(res, {
                    channels,
                    more: (count - (limit * (+req.query.page + 1))) > 0
                })
            })
        })
    }catch(err){
        console.log(err);
    }
}

exports.storeChannel = (req, res) => {
    channel = new Channel(req.fields)
    channel.user = req.auth._id

    if(!channel.country || !channel.city){
        channel.country = req.authUser.country;
        channel.city = req.authUser.city;
    }

    storeChannelPhoto(req, channel)
    
    channel.save((err, channel) => {
        if(err) return Response.sendError(res, 400, err)
        if(channel.global){
            User.find({}, async(err, users) => {
                await users.forEach(async (usr) => {
                    usr.followedChannels.push(channel._id)
                    channel.followers.push(usr._id)
                    await usr.save()
                })
                channel.save((err, channel) => {
                    return Response.sendResponse(res, channel, 'the channel has been created successfully')
                })
            })
        }
        else return Response.sendResponse(res, channel, 'the channel has been created successfully')
    })
}

storeChannelPhoto = (req, channel) => {
    try{
        let photoName = ""
        const photo = req.files.photo
        if(photo){
            photoName = `${ channel._id }.png`
            const photoPath = path.join(__dirname, `./../../public/channels/${ photoName }`)
            fs.writeFileSync(photoPath, fs.readFileSync(photo.path))
        }else{
            photoName = 'channel-default.png'
        }

        channel.photo.path = `/channels/${ photoName }`
        channel.photo.type = 'png'
    }catch(err){
        console.log(err);
    }
}

exports.updateChannel = (req, res) => {
    try {
        console.log('channel update')
        const fields = _.omit(req.fields, ['photo'])

        let channel = _.extend(req.channel, fields)

        if(req.files.photo)
            storeChannelPhoto(req, channel)
        
        channel.global = fields.global ? (fields.global == 'undefined' ? false : true) : false;
        channel.save((err, channel) => {
            console.log(err);
            if(err) return Response.sendError(res, 400, 'could not update channel')
            return Response.sendResponse(res, channel, 'the channel has been updated successfully')
        })
    } catch (error) {
        console.log(error);
    }
}

exports.disableChannel = (req, res) => {
    const channel = req.channel
    channel.enabled = false;
    channel.save((err, channel) => {
        if(err) Response.sendError(res, 400, 'could not remove channel');
        return Response.sendResponse(res, null, 'channel removed')
    })
}

exports.deleteChannel = async(req, res) => {
    try {
        const channel = req.channel
        this.destroyChannel(res, channel._id, (res) => Response.sendResponse(res, null, 'channel removed'))
    } catch (error) {
        console.log(err);
    }
}

exports.followChannel = async(req, res) => {
    const user = req.authUser
    const channel = req.channel

    followed = false

    if(!channel.followers.includes(user._id)){
        channel.followers.push(user._id)
        followed = true
    }
    else
        channel.followers.splice(channel.followers.indexOf(user._id), 1)

    if(!user.followedChannels.includes(channel._id)){
        user.followedChannels.push(channel._id)
        followed = true
    }
    else
        user.followedChannels.splice(user.followedChannels.indexOf(channel._id), 1)

    channel.save((err, channel) => {
        if(err || !channel) return Response.sendError(res, 'failed')
        user.save((err, user) => {
            if(err || !channel) return Response.sendError(res, 'failed')
            if(followed){
                sendNotification({en: channel.name}, {en: req.authUser.firstName + ' ' + req.authUser.lastName + 'started following the channel'}, {
                    type: 'follow-channel',
                    link: '/tabs/channels/channel?channel=' + channel._id
                }, [], [channel.user])
            }
            return Response.sendResponse(res, followed, followed ? `followed` : `unfollowed`)
        })
    })
}

exports.destroyChannel = async(res, channelId, callback) => {
    Channel.remove({_id: channelId}, (err, channels) => {
        Report.remove({"entity.id": channelId, "entity.name": 'channel'}, (err, reports) => {
            Post.find({channel: channelId}, (err, posts) => {
                console.log(posts);
                posts.forEach(post => destroyPost(res, post._id, null))
                if(callback) return callback(res)
            })
        })
    })
}
