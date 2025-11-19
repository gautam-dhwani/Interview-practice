module.exports.getUser = (req, res, next) => {
    try {
        return res.status(200).send({success: true, message: "the user fetched successfully"})
    } catch (error) {
        return res.status(500).send({success: false, message: "Error in get User Module"})
    }
}