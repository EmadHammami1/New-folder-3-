const mongoose = require('mongoose')

const reportSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    entity: {
        name: {
            type: String,
            required: true
        },
        _id: {
            type: mongoose.Types.ObjectId,
            required: true
        }
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {timestamps: true})

module.exports = mongoose.model('Report', reportSchema)