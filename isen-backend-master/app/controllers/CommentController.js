const { report, extractDashParams, sendNotification } = require("../helpers")
const Channel = require("../models/Channel")
const Post = require("../models/Post")
const Comment = require("../models/Comment")
const Report = require("../models/Report")
const Response = require("./Response")

exports.reportComment = (req, res) => {
    try {
        const comment = req.comment
        if(!req.body.message) return Response.sendError(res, 400, 'please enter a message')
        report(req, res, 'comment', comment._id, (report) => {
            Comment.updateOne({_id: comment._id}, {$push: {reports: report}}, (err, comment) => {
                if(err) return Response.sendError(res, 400, 'failed')
                return Response.sendResponse(res, null, 'Thank you for reporting')
            })
        })
    } catch (error) {
        console.log(error);
    }
}

exports.postComments = (req, res) => {
    try{
        const post = req.post;
        const dashParams = extractDashParams(req, ['text'])
        Comment.aggregate()
        .match({
            post: post._id,
            ...dashParams.filter
        })
        .project({
            text: 1,
            user: 1,
            post: 1,
            reports: {
                $size: "$reports"
            },
        })
        .sort(dashParams.sort)
        .skip(dashParams.skip)
        .limit(dashParams.limit)
        .exec(async(err, comments) => {
            if(err || !comments) return Response.sendError(res, 500, 'Server error, please try again later');
            const count = await Comment.find({
                post: post._id,
                ...dashParams.filter
            }).countDocuments();
            return Response.sendResponse(res, {
                docs: comments,
                totalPages: Math.ceil(count / dashParams.limit)
            });
        });
    }catch(err){
        console.log(err);
    }
}

exports.showComment = (req, res) => {
    Comment.findOne({_id: req.comment._id}, (err, comment) => {
        if(err || !comment) return Response.sendError(res, 400, 'Server error')
        return Response.sendResponse(res, comment)
    })
}

exports.storeComment = (req, res) => {
    try{
        const post = req.post
        const comment = new Comment(req.body)
        comment.user = req.auth._id
        comment.post = post._id
        comment.populate('user', 'firstName lastName', 'User').save((err, comment) => {
            if(err || !comment) return Response.sendError(res, 400, 'cannot add this comment')
            Comment.populate(comment, {path: 'user', select: 'firstName lastName'}, (err, comment) => {
                comment = withVotesInfo(comment)
                if(err || !comment) return Response.sendError(res, 400, 'cannot add this comment')
                post.comments.push(comment._id)
                post.save((err, post) => {
                    if(post.user != req.auth._id)
                        Channel.findOne({_id: post.channel}, (err, channel) => {
                            sendNotification(
                                {en: channel.name}, 
                                {en: (comment.anonyme ? 'Anonym' : req.authUser.firstName + ' ' + req.authUser.lastName) + ' comment on your post'},
                                {
                                    type: 'new-post-comment',
                                    link: '/tabs/channels/post/' + post._id
                                }, 
                                [], 
                                [post.user]
                            )
                        })
                    return Response.sendResponse(res, comment, 'comment created')
                })
            })
        })
    }catch(err){
        console.log(err);
    }
}

withVotesInfo = (comment, userId) => {
    const userVote =  comment.votes.find(vote => vote.user == userId)
    return {
        ...comment.toObject(),
        voted: !userVote ? 0 : userVote.vote,
        votes: comment.votes.length ?
               comment.votes.map(vote => vote.vote).reduce((acc, curr) => acc + curr) 
               : 0
    }
}

exports.voteOnComment = (req, res) => {
    try{
        const comment = req.comment

        const userVoteInd =  comment.votes.findIndex(vote => vote.user == req.auth._id)
        if(userVoteInd != -1){
            if(comment.votes[userVoteInd].vote != req.body.vote)
                comment.votes.splice(userVoteInd, 1)
        }else{
            comment.votes.push({
                user: req.auth._id,
                vote: req.body.vote
            })
        }
        comment.populate('post', 'channel', 'Post').save(async(err, comment) => {
            if(err || !comment) return Response.sendError(res, 400, 'failed')
            comment = withVotesInfo(comment, req.auth._id)
            const post = await Post.findOne({_id: comment.post})
            if(userVoteInd && comment.user != req.auth._id)
                Channel.findOne({_id: post.channel}, (err, channel) => {
                    sendNotification(
                        {en: channel.name}, 
                        {en: (comment.anonyme ? 'Anonym' : req.authUser.firstName + ' ' + req.authUser.lastName) + ' has voted on your post'},
                        {
                            type: 'vote-channel-post',
                            link: '/tabs/channels/post' + post._id
                        }, 
                        [], 
                        [comment.user]
                    )
                })
            return Response.sendResponse(res, {
                votes: comment.votes,
                voted: userVoteInd != -1
            }, 'voted')
        })
    }catch(err){
        console.log(err);
    }
}

exports.getComments = (req, res) => {
    try{
        const limit = 8;
        const post = req.post
        Comment.find({post: post._id})
        .populate('user', 'firstName lastName', 'User')
        .sort({createdAt: -1})
        .skip(req.query.page * limit)
        .limit(limit)
        .exec((err, comments) => {
            if(err || !comments) return Response.sendError(res, 400, 'failed')
            Comment.find({post: post._id}).count((err, count) => {
                comments = comments.map(comment => withVotesInfo(comment, req.auth._id))
                return Response.sendResponse(res, {
                    comments,
                    more: (count - (limit * (+req.query.page + 1))) > 0
                })
            })
        })
    }catch(err){
        console.log(err);
    }
}

exports.deleteComment = (req, res) => {
    try {
        const comment = req.comment
        this.destroyComment(res, comment._id, (res) => Response.sendResponse(res, null, 'comment removed'))
    } catch (error) {
        console.log(error);
    }
}

exports.destroyComment = (res, commentId, callback) => {
    Comment.remove({_id: commentId}, (err, comments) => {
        Report.remove({'entity.id': commentId, "entity.name": 'comment'}, (err, reports) => {
            if(callback) return callback(res)
        })
    })
}