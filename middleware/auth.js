const authenticate = (req,res,next) => {
    if(req.session && req.session.user) {
        next();
    }
    else {
        return res.status(403).json({"message": "forbidden"});
    }
}

module.exports = {authenticate};