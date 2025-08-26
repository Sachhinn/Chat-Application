import jwt, { decode } from "jsonwebtoken"
import User from '../models/user.model.js'
import { generateAccessAndRefreshTokens } from "../main.js"
export const verifyUserToken = async (req, res, next) => { // res can be put as '_' if it is not being used
    try {
        const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '') // if the client is a mobile app
        if (!token) {
            console.log('no token received')
            // res.status(401).json({success:false,message:'Unauthorized request, please login first'})
            let message = encodeURIComponent('Please Login First!!')
            res.redirect(`/login?message=${message}`)
            return;
        }
        let decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        let user = await User.findById(decodedToken._id).select(' -refreshToken -passwordHash')
        if (!user) {
            throw new Error('Do Not Try to hack into us')
        }
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            console.log('Token Expired at : ',error.expiredAt.toLocaleTimeString())
            try {
                const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
                if (!incomingRefreshToken) {
                    return res.status(403).json({ success: false, message: "No Refresh Token Received" });
                }
                let decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
                const user = await User.findById(decodedToken?._id)
                if (!user) {
                    return res.status(403).json({ success: false, message: "Invalid Refresh Tokens" });
                }
                if (incomingRefreshToken !== user?.refreshToken) {
                    return res.status(403).json({ success: false, message: "Refresh Token is either expired or used" });
                }
                const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user)
                req.user = user;
                let options = {
                    httpOnly: true,
                    sameSite: 'Lax'
                }
                res
                    .cookie('accessToken', accessToken, options)
                    .cookie('refreshToken', refreshToken, options)
                next();
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message || 'Something went wrong while Refreshing the Token' })
            }
        } else {
            res.status(401).json({ success: false, message: error.message || 'Something went wrong in Authenticating Access Token' })
        }
    }
}