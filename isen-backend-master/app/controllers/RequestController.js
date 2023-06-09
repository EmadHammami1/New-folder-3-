const { request } = require("express")
const mongoose = require("mongoose")
const { sendNotification } = require("../helpers")
const Request = require("../models/Request")
const User = require("../models/User")
const Response = require("./Response")

exports.storeRequest = (req, res) => {
    try{
        console.log('store request');
        const request = new Request({
            from: req.auth._id,
            to: req.user._id
        })
        request.save(async(err, request) => {
            if(err || !request) return Response.sendError(res, 400, 'failed')
            await User.updateOne({_id: request.to}, { $push: { requests: request._id }})
            await User.updateOne({_id: request.from}, { $push: { requests: request._id }})
            sendNotification({en: req.authUser.firstName + ' ' + req.authUser.lastName}, {en: 'send you a friendship request'}, {
                type: 'request',
                link: '/tabs/friends/requests'
            }, [], [req.user._id])
            return Response.sendResponse(res, {
                request
            }, 'friendship request sent')
        })
    }catch(err){
        console.log(err);
    }
}

exports.requests = (req, res) => {
    try{
        const limit = 20;
        Request.find({
            to: mongoose.Types.ObjectId(req.auth._id),
            accepted: false
        })
        .populate('from', {
            firstName: 1,
            lastName: 1,
            avatar: "$avatar.path",
        }, 'User')
        .select({
            from: 1,
            createdAt: 1
        })
        .skip(limit * req.query.page)
        .limit(limit)
        .exec((err, requests) => {
            if(err) return Response.sendError(res, 400, err)
            return Response.sendResponse(res, requests)
        })
    }catch(err){
        console.log(err);
    }
}

exports.acceptRequest = (req, res) => {
    try{
        const request = req.request;
        request.remove(async(err, rmRequest) => {
            if(err) return Response.sendError(res, 400, err)
            await User.updateOne(
                {_id: request.from}, 
                {
                    $push: { friends: request.to }, 
                    $pull: { requests: request._id } 
                }
            )
            await User.updateOne(
                {_id: request.to}, 
                {
                    $push: { friends: request.from }, 
                    $pull: { requests: request._id } 
                }
            )
            sendNotification({en: req.authUser.firstName + ' ' + req.authUser.lastName}, {en: 'accepted your friendship request'}, {
                type: 'request',
                link: '/tabs/friends/list'
            }, [], [request.from])
            return Response.sendResponse(res, true, 'friendship request is accepted')
        })
    }catch(err){
        console.log(err);
    }
}

exports.rejectRequest = async(req, res) => {
    const request = req.request;
    request.remove(async(err, request) => {
        if(err) return Response.sendError(res, 400, err)
        await User.updateOne({_id: req.auth._id}, { $pull: { requests: request._id  } })
        return Response.sendResponse(res, true, 'request rejected')
    })
}

exports.cancelRequest = async(req, res) => {
    const request = req.request;
    const toUser = request.to
    request.remove(async(err, request) => {
        if(err) return Response.sendError(res, 400, err)
        await User.updateOne({ _id: toUser }, { $pull: { requests: request._id  } })
        await User.updateOne({ _id: req.auth._id }, { $pull: { requests: request._id  } })
        return Response.sendResponse(res, true, 'request canceled')
    })
}
