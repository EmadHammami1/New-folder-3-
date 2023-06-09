const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
    text: {
        type: String,
    },
    from: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    },
    to: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    },
    image: {
        path: {
            type: String,
        },
        type: {
            type: String,
        }
    },
    state: {
        type: String,
        enum: ['deleted', 'seen', 'sent'],
        default: 'sent'
    }
}, {timestamps: true})

module.exports = mongoose.model('Message', messageSchema)