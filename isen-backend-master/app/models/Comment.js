const mongoose = require('mongoose')

const commentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    },
    anonyme: {
        type: Boolean,
        default: false
    },
    reports: [{
        type: mongoose.Types.ObjectId,
        ref: 'Report'
    }],
    votes: [{
        user: {
            type: mongoose.Types.ObjectId
        },
        vote: {
            type: Number,
            enum: [-1, 1]
        }
    }],
    post: {
        type: mongoose.Types.ObjectId,
        ref: 'Post',
        required: true
    }
}, {timestamps: true})

module.exports = mongoose.model('Comment', commentSchema)
