const { extractDashParams } = require("../helpers");
const Report = require("../models/Report");
const Response = require("./Response");

exports.allReports = (req, res) => {
    try {
        const dashParams = extractDashParams(req, ['entity.name'])
        Report.aggregate()
        .match(dashParams.filter)
        .project({
            message: 1,
            reference: "$entity.name",
            referenceId: "$entity._id",
            userId: "$user",
            solved: 1,
            createdAt: 1
        })
        .sort(dashParams.sort)
        .skip(dashParams.skip)
        .limit(dashParams.limit)
        .exec(async(err, reports) => {
            if(err || !reports) return Response.sendError(res, 500, 'Server error, please try again later');
            const count = await Report.find(dashParams.filter).countDocuments();
            return Response.sendResponse(res, {
                docs: reports,
                totalPages: Math.ceil(count / dashParams.limit)
            });
        });
    } catch (error) {
        console.log(error);
    }
}

exports.showReport = (req, res) => {
    Report.findOne({_id: req.report._id}, {
        message: 1,
        reference: "$entity.name",
        referenceId: "$entity._id",
        user: 1,
        solved: 1,
        createdAt: 1
    }, (err, report) => {
        return Response.sendResponse(res, report)
    })
}