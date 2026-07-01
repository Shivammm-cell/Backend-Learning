import { Router } from "express";
import { registerUser,LoginUser, loggedOutUser, refressAccessToken } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";



const router = Router();

router.route("/register").post(
    //today work 
    upload.fields(
        [
            {
                name: "avatar",
                maxCount: 1,
            },
            {
                name: "coverImage",
                maxCount: 1,
            }
        ]
    ),
    registerUser
);

router.route("/login").post(LoginUser)

//secured Routes 
router.route("/logout").post(verifyJWT,loggedOutUser)
router.route("/refresh-token").post(refressAccessToken)



export default router;


