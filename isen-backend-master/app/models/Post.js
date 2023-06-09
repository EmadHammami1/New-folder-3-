const mongoose = require('mongoose')

const postSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    backgroundColor: {
        type: String,
        default: '#fff'
    },
    color: {
        type: String,
        default: '#000'
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
    comments: [{
        type: mongoose.Types.ObjectId,
        ref: 'Comment'
    }],
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    },
    channel: {
        type: mongoose.Types.ObjectId,
        ref: 'Channel',
        required: true
    },
    anonyme: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {timestamps: true})

module.exports = mongoose.model('Post', postSchema)
