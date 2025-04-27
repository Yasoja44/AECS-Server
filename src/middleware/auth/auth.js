const jwt = require('jsonwebtoken');

//Verification of user roles
module.exports = function (req,res,next) {
    
    try{
        const token = req.header('Authorization');
        const verifiedUser = jwt.verify(
            token,
            process.env.JWT_SECRET
        )
        
        const verifiedAdmin = jwt.verify(
            token,
            process.env.JWT_SECRET
        )
        const verifiedEmployee = jwt.verify(
            token,
            process.env.JWT_SECRET
        )

        req.user = verifiedUser.user;
        req.Admin = verifiedAdmin.Admin;
        req.Editor = verifiedEmployee.Editor;

        next();
    }catch (e) {
        console.log(e.message)
        return res.status(500).json({msg: "Server Error..."})
    }
}