const { response } = require("express");
const mongoose = require("mongoose");
const { setOnlineUsers, connectedUsers } = require("../helpers");
const { userSubscribed } = require("../middlewares/subscription");
const Message = require("../models/Message");
const User = require("../models/User");
const Response = require("./Response")


exports.indexMessages = async(req, res) => {
    const limit = 20;
    const page = +req.query.page
    const filter = {
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
    }
    Message.find(filter, {
        from: 1,
        to: 1,
        text: 1,
        state: 1,
        image: "$image.path",
        createdAt: 1
    })
    .sort({createdAt: -1})
    .skip(limit * page)
    .limit(limit)
    .exec((err, messages) => {
        if(err || !messages) return Response.sendError(res, 400, 'failed')
        Message.find(filter).countDocuments()
        .exec(async(err, count) => {
            let allowToChat = true
            if(!req.user.friends.includes(req.auth._id)) 
                allowToChat = await Message.find({
                    from: mongoose.Types.ObjectId(req.user._id),
                    to: mongoose.Types.ObjectId(req.auth._id)
                }).countDocuments() > 0

            return Response.sendResponse(res, {
                messages, 
                more: (count - (limit * (+req.query.page + 1))) > 0,
                allowToChat
            })
        })
    });
}

exports.getUsersMessages = (req, res) => {

    const limit = 20
    const page = req.query.page ? +req.query.page : 0
    const filter = {
        _id: {
            $nin: req.authUser.blockedUsers,
            $ne: req.authUser._id
        },
        blockedUsers: {
            $ne: req.authUser._id
        },
        messagedUsers: {
            $eq: req.authUser._id
        },
        deletedAt: null
    }

    User.find(filter)
    .populate({
        path: 'messages',
        match: {
            $or: [
                {to: req.auth._id},
                {from: req.auth._id}
            ]
        },
        options: {
            sort: {
                createdAt: -1
            },
            perDocumentLimit: 1,
        },
    })
    .select({
        firstName: 1,
        lastName: 1,
        avatar: "$avatar.path",
        messages: 1,
        id: "$_id",
        online: {
            $cond: [
                {$in: ["$_id", Object.keys(connectedUsers).map(id => Object.keys(id))]},
                true,
                false
            ]
        }
    })
    .skip(limit * page)
    .limit(limit)
    .exec((err, users) => {
        console.log(users);
        if(err || !users) return Response.sendError(res, 400, 'cannot find any message')
        User.find(filter).countDocuments((err, count) => {
            users = setOnlineUsers(users)
            console.log(users);
            return Response.sendResponse(res, {
                users,
                more: (count - (limit * (page + 1))) > 0
            })
        })
    })
}

exports.sendMessagePermission = (req, res) => {
    try {
        const now = new Date()
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const user = req.user
        const authUser = req.authUser

        if(authUser.friends && authUser.friends.includes(user._id)) return Response.sendResponse(res, true)

        Message.find({
            from: req.auth._id,
            createdAt: {
                $lt: now.toISOString(),
                $gt: yesterday.toISOString()
            },
            to: {
                $nin: req.authUser.friends
            }
        })
        .distinct('to')
        .exec(async(err, messages) => {
            console.log(messages);
            if(!await userSubscribed(req.authUser) && messages.length > 3)
                return Response.sendResponse(res, false)
            else return Response.sendResponse(res, true)
        })
    } catch (error) {
        console.log(error);
    }
}