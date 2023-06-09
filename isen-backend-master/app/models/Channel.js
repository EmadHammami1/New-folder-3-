const mongoose = require('mongoose')

const channelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    approved: {
        type: Boolean,
        default: false
    },
    photo: {
        path: {
            type: String,
            default: '/channels/channel-default.png'
        },
        type: {
            type: String,
            default: 'png'
        }
    },
    country: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    reports: [{
        type: mongoose.Types.ObjectId,
        ref: 'Report'
    }],
    followers: [{
        type: mongoose.Types.ObjectId,
        ref: 'User',
    }],
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    },
    global: {
        type: Boolean,
        default: false
    },
    enabled: {
        type: Boolean,
        default: true
    }
}, {timestamps: true})

module.exports = mongoose.model('Channel', channelSchema)
