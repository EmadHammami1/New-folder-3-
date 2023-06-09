const Response = require('./Response')
const fs = require('fs')
const Product = require('../models/Product')
const _ = require('lodash')
const path = require('path')
const { asset, extractDashParams, report } = require('../helpers')
const mongoose  = require('mongoose')
const Report = require('../models/Report')
const { authUser } = require('./AuthController')

exports.reportProduct = (req, res) => {
    try {
        const product = req.product
        if(!req.body.message) return Response.sendError(res, 400, 'please enter a message')
        report(req, res, 'product', product._id, (report) => {
            Product.updateOne({_id: product._id}, {$push: {reports: report}}, (err, product) => {
                if(err) return Response.sendError(res, 400, 'failed')
                return Response.sendResponse(res, null, 'Thank you for reporting')
            })
        })
    } catch (error) {
        console.log(error);
    }
}

exports.clearProductReports = (req, res) => {
    Report.remove({
        "entity._id": req.product._id,
        "entity.name": "product"
    }, (err, rmRes) => {
        if(err) return Response.sendError(res, 400, 'failed to clear reports')
        return Response.sendResponse(res, null, "reports cleaned")
    })
}

exports.toggleProductStatus = (req, res) => {
    const product = req.product
    product.deletedAt = product.deletedAt ? null : new Date().toJSON()
    product.save((err, product) => {
        if(err) return Response.sendError(res, 400, 'failed')
        console.log(product);
        return Response.sendResponse(res, product, 'product ' + (product.deletedAt ? 'disabled' : 'enabled'))
    })
}

exports.showProductDash = (req, res) => {
    Product.findOne({_id: req.product._id}, {
        label: 1,
        description: 1,
        price: 1,
        currency: 1,
        photo: "$photo.path",
        country: 1,
        city: 1,
        sold: 1,
        reports: 1,
        user: 1,
        deletedAt: 1
    })
    .populate('reports')
    .exec((err, product) => {
        if(err || !product) return Response.sendError(res, 500, 'Server error, please try again later');
        return Response.sendResponse(res, product)
    })
}

exports.allProducts = (req, res) => {
    try{
        dashParams = extractDashParams(req, ['name', 'description', 'country', 'city']);
        Product.aggregate()
        .match(dashParams.filter)
        .project({
            label: 1,
            description: 1,
            price: 1,
            currency: 1,
            photo: "$photo.path",
            country: 1,
            city: 1,
            available: {$cond: ["$sold", false, true]},
            deletedAt: 1,
            reports: {
                $size: "$reports"
            }
        })
        .sort(dashParams.sort)
        .skip(dashParams.skip)
        .limit(dashParams.limit)
        .exec(async(err, products) => {
            console.log(err)
            if(err || !products) return Response.sendError(res, 500, 'Server error, please try again later');
            const count = await Product.find(dashParams.filter).countDocuments();
            return Response.sendResponse(res, {
                docs: products,
                totalPages: Math.ceil(count / dashParams.limit)
            });
        });
    }catch(err){
        console.log(err);
    }
}

exports.showProduct = (req, res) => {
    return Response.sendResponse(res, req.product)
}

exports.postedProducts = (req, res) => {
    try{
        const filter = {
            user: mongoose.Types.ObjectId(req.auth._id),
            label: new RegExp('^' + req.query.search, 'i'),
            deletedAt: null
        }
        limit = 20
        Product.find(filter , {
            label: 1,
            photo: "$photo.path",
            price: 1,
            currency: 1,
            country: 1,
            city: 1,
            description: 1,
            createdAt: 1
        })
        .sort({createdAt: -1})
        .skip(limit * req.query.page)
        .limit(limit)
        .exec((err, products) => {
            if(err || !products) return Response.sendError(res, 400, 'cannot retreive products')
            Product.find(filter).countDocuments((err, count) => {
                return Response.sendResponse(res, {
                    products,
                    more: (count - (limit * (+req.query.page + 1))) > 0
                })
            })
        })
    }catch(err){
        console.log(err);
    }
}

exports.availableProducts = (req, res) => {
    try{
        const filter = {
            label: new RegExp('^' + req.query.search, 'i'),
            deletedAt: null,
            sold: false,
            country: req.authUser.country,
            city: req.authUser.city
        }
        limit = 20
        Product.find(filter , {
            label: 1,
            photo: "$photo.path",
            price: 1,
            currency: 1,
            country: 1,
            city: 1,
            description: 1,
            createdAt: 1
        })
        .sort({createdAt: -1})
        .skip(limit * req.query.page)
        .limit(limit)
        .exec((err, products) => {
            if(err || !products) return Response.sendError(res, 400, 'cannot retreive products')
            Product.find(filter).countDocuments((err, count) => {
                return Response.sendResponse(res, {
                    products,
                    more: (count - (limit * (+req.query.page + 1))) > 0
                })
            })
        })
    }catch(err){
        console.log(err);
    }
}

exports.storeProduct = (req, res) => {
    try {   
        product = new Product(req.fields)
        product.user = req.auth._id

        if(!req.fields.country || !req.fields.city){
            product.country = req.authUser.country
            product.city = req.authUser.city
        }

        if(req.files.photo)
            storeProductPhoto(req.files.photo, product)
        else
            return Response.sendError(res, 400, 'photo is required')
        
        product.save((err, product) => {
            console.log('err')
            console.log(err)
            if(err) return Response.sendError(res, 400, err)
            return Response.sendResponse(res, product, 'the product has been created successfully')
        })
    } catch (error) {
        console.log(error);
    }
}

storeProductPhoto = (photo, product) => {
    const photoName = `${ product._id }.png`
    const photoPath = path.join(__dirname, `./../../public/products/${ photoName }`)
    fs.writeFileSync(photoPath, fs.readFileSync(photo.path))
    product.photo.path = `/products/${ photoName }`
    product.photo.type = photo.type
}

exports.updateProduct = (req, res) => {
    let product = req.product
    const fields = _.omit(req.fields, ['photo'])
    product = _.extend(product, fields)

    if(req.files.photo)
        storeProductPhoto(req.files.photo, product)
    
    console.log(product);
    product.save((err, product) => {
        if(err) return Response.sendError(res, 400, 'could not update product')
        return Response.sendResponse(res, product, 'the product has been updated successfully')
    })
}

exports.deleteProduct = (req, res) => {
    const product = req.product
    product.deletedAt = new Date().toJSON()
    product.remove((err, product) => {
        if(err) Response.sendError(res, 400, 'could not remove product');
        return Response.sendResponse(res, null, 'product removed')
    })
}

exports.soldProduct = (req, res) => {
    Product.findOne({_id: req.product._id}, (err, product) => {
        if(err || !product) return Response.sendError(res, 400, 'product not found')
        product.sold = true;
        product.save((err, product) => {
            if(err) return Response.sendError(res, 400, 'Cannot mark this product as sold now, try again later')
            return Response.sendResponse(res, true, 'product is marked as sold')
        })
    })
}

exports.destroyProduct = (req, res) => {
    const product = req.product
    const photoPath = path.join(__dirname, `./../../public/${ product.photo.path }`)
    product.remove((err, product) => {
        if(err) Response.sendError(res, 400, 'could not remove product');
        console.log(photoPath);
        if(fs.existsSync(photoPath)){
            fs.unlinkSync(photoPath);
        }
        return Response.sendResponse(res, null, 'product removed')
    })
}
