const authenticate = (req,res,next) => {
    if(req.session && req.session.user) {
        next();
    }
    else {
        return res.status(403).json({"message": "forbidden"});
    }
} //to check for persistence across pages

module.exports = {authenticate};