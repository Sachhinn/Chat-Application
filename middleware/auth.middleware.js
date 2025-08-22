import jwt from "jsonwebtoken"
import User from '../models/user.model.js'
export const verifyUserToken = async (req, res, next) => { // res can be put as '_' if it is not being used
    try {
        const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ','') // if the client is a mobile app
        if(!token){
            // res.status(401).json({success:false,message:'Unauthorized request, please login first'})
            let message = encodeURIComponent('Please Login First!!')
            res.redirect(`/login?message=${message}`)
            return;
        }
        let decodedToken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
        let user = await User.findById(decodedToken._id).select(' -refreshToken -passwordHash')
        if(!user){
            return res.redirect()
        }
        req.user = user;
        next();
    } catch (error) {
        console.log(error)
            res.status(401).json({success:false,message: error.message || 'Something went wrong in Authenticating Access Token'})
    }
}