const e = require("express");
const mongoose = require("mongoose");
const { report, extractDashParams, sendNotification } = require("../helpers");
const Channel = require("../models/Channel");
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const Report = require("../models/Report");
const { destroyComment } = require("./CommentController");
const Response = require("./Response");

exports.reportPost = (req, res) => {
    try {
        const post = req.post
        if(!req.body.message) return Response.sendError(res, 400, 'please enter a message')
        report(req, res, 'post', post._id, (report) => {
            Post.updateOne({_id: post._id}, {$push: {reports: report}}, (err, post) => {
                if(err) return Response.sendError(res, 400, 'failed')
                return Response.sendResponse(res, null, 'Thank you for reporting')
            })
        })
    } catch (error) {
        console.log(error);
    }
}

exports.channelPosts = (req, res) => {
    try{
        const channel = req.channel
        const dashParams = extractDashParams(req, ['text'])
        Post.aggregate()
        .match({
            channel: channel._id,
            ...dashParams.filter
        })
        .project({
            text: 1,
            user: 1,
            channel: 1,
            reports: {
                $size: "$reports"
            },
            comments: {
                $size: "$comments"
            }
        })
        .sort(dashParams.sort)
        .skip(dashParams.skip)
        .limit(dashParams.limit)
        .exec(async(err, posts) => {
            if(err || !posts) return Response.sendError(res, 500, 'Server error, please try again later');
            const count = await Post.find({
                channel: channel._id,
                ...dashParams.filter
            }).countDocuments();
            return Response.sendResponse(res, {
                docs: posts,
                totalPages: Math.ceil(count / dashParams.limit)
            });
        });
    }catch(err){
        console.log(err);
    }
}

exports.showPost = (req, res) => {
    Post.findOne({_id: req.post._id})
    .populate('user', 'firstName lastName')
    .exec((err, post) => {
        if(err || !post) return Response.sendError(res, 400, 'Server error')
        post = withVotesInfo(post, req.auth._id);
        return Response.sendResponse(res, post)
    })
}

exports.showDashPost = (req, res) => {
    Post.findOne({_id: req.post._id})
    .exec((err, post) => {
        if(err || !post) return Response.sendError(res, 400, 'Server error')
        post = withVotesInfo(post, req.auth._id);
        return Response.sendResponse(res, post)
    })
}

exports.storePost = (req, res) => {
    const post = new Post(req.body)

    post.channel = req.channel._id
    post.user = req.auth._id

    post.save((err, post) => {
        if(err || !post) return Response.sendError(res, 400, 'could not create this post')
        post = withVotesInfo(post)
        Post.populate(post, {path: 'user', select: 'firstName lastName'}, (err, post) => {
            sendNotification(
                {en: req.channel.name}, 
                {en: (post.anonyme ? 'Anonym' : req.authUser.firstName + ' ' + req.authUser.lastName) + ' shared a new post'}, 
                {
                    type: 'new-channel-post',
                    link: '/tabs/channels/post/' + post._id
                }, 
                [], 
                [...req.channel.followers, req.channel.user].filter(id => id != req.auth._id && req.authUser.friends.includes(id))
            )
            return Response.sendResponse(res, post, 'post created')
        })
    })
}

exports.getPosts = (req, res) => {
    try{
        const limit = 10;
        Post.find({channel: req.channel._id})
        .populate('user', 'firstName lastName', 'User')
        .sort({createdAt: -1})
        .skip(req.query.page * limit)
        .limit(limit)
        .exec((err, posts) => {
            if(err || !posts) return Response.sendError(res, 400, 'could not get the posts')
            posts = posts.map(post => withVotesInfo(post, req.auth._id))
            Post.find({channel: req.channel._id}).count((err, count) => {
                return Response.sendResponse(res, {
                    posts,
                    more: (count - (limit * (+req.query.page + 1))) > 0
                })
            })
        })
    }catch(err){
        console.log(err);
    }
}

withVotesInfo = (post, userId) => {
    const userVote =  post.votes.find(vote => vote.user == userId)
    return {
        ...post.toObject(),
        voted: !userVote ? 0 : userVote.vote,
        votes: post.votes.length ?
               post.votes.map(vote => vote.vote).reduce((acc, curr) => acc + curr) 
               : 0
    }
}

exports.voteOnPost = (req, res) => {
    try{
        const post = req.post

        const userVoteInd =  post.votes.findIndex(vote => vote.user == req.auth._id)
        console.log(userVoteInd);
        if(userVoteInd != -1){
            if(post.votes[userVoteInd].vote != req.body.vote)
                post.votes.splice(userVoteInd, 1)
        }else{
            post.votes.push({
                user: req.auth._id,
                vote: req.body.vote
            });
        }

        post.save((err, post) => {
            if(err || !post) return Response.sendError(res, 400, 'failed')
            post = withVotesInfo(post, req.auth._id)
            
            if(userVoteInd && post.user != req.auth._id)
                Channel.findOne({_id: post.channel}, (err, channel) => {
                    sendNotification(
                        {en: channel.name},
                        {en: (post.anonyme ? 'Anonym' : req.authUser.firstName + ' ' + req.authUser.lastName) + ' has voted on your post'}, 
                        {
                            type: 'vote-channel-post',
                            link: '/tabs/channels/post/' + post._id
                        }, 
                        [], 
                        [post.user]
                    )
                })
            return Response.sendResponse(res, {
                votes: post.votes,
                voted: userVoteInd != -1
            }, 'voted')
        })
    }catch(err){
        console.log(err);
    }
}

exports.deletePost = (req, res) => {
    try {
        const post = req.post
        this.destroyPost(res, post._id, (res) => Response.sendResponse(res, null, 'post removed'))
        
    } catch (error) {
        console.log(error);
    }
}

exports.destroyPost = (res, postId, callback) => {
    Post.remove({_id: postId}, (err, posts) => {
        Report.remove({"entity.id": postId, "entity.name": 'post'}, (err, reports) => {
            Comment.find({post: postId}, (err, comments) => {
                comments.forEach(comment => destroyComment(res, comment._id, null))
                if(callback) return callback(res)
            })
        })
    })
}