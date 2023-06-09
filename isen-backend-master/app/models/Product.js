const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    label: {
        type: String,
        maxLength: 50,
        required: true
    },
    description: {
        type: String,
        maxLength: 255,
        required: true
    },
    price: {
        type: String,
        maxLength: 12,
        required: true
    },
    currency: {
        type: String,
        maxLength: 5
    },
    sold: {
        type: Boolean,
        default: false
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
    photo: {
        path: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        }
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {timestamps: true})

productSchema.virtual('reportsCount').get(() => {
    return this.reports.length
})

module.exports = mongoose.model('Product', productSchema)