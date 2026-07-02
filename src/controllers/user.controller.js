import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (UserId) => {
    try {
        const user = await User.findById(UserId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        //this is an encodded refreshToken!!!!
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating the refresh and access token")
    }
}


//RegisterUser
const registerUser = asyncHandler(async (req, res) => {

    const { fullName, username, email, password } = req.body;

    if (
        [fullName, email, password, username].some((field) =>
            field?.trim() === ""
        )) {
        throw new ApiError(400, "all fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!existedUser) {
        throw new ApiError(409, "User with email or username already existed")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0].path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "avatar is required");
    }

    //saving user in database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });
    //fetching saved user form db
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"        //removing password and refreshtoken form response 
    )
    if (!createdUser) {
        throw new ApiError(500, "something went wrong while registring a user ")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

//LoginUser
const LoginUser = asyncHandler(async (req, res) => {
    //taking username,email,password from user through req.body 
    const { username, email, password } = req.body;

    //now check userhad give username or email 
    if (!(username || email) || !password) {
        throw new ApiError(400, "username or email and password are required");
    }

    //if user provided neccessary info then proceeds to finding the user from DB
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    //now whther user exist or not in our DB check it 
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    //After checking user exist in our db , checks the password of user enter 
    const isPasswordValid = await user.isPasswordCorrect(password);

    //now check whether password is correct or not 
    if (!isPasswordValid) {
        throw new ApiError(401, "Inavalid user credentials")
    }

    //generating refreshToken and Accesstoken
    const { accessToken, refreshToken } =
        await generateAccessAndRefreshTokens(user._id);


    //Fetch the latest user data from the database and exclude sensitive fields before sending the response.
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    //sending cookies 
    const options = {
        httpOnly: true,
        secure: true,
    }


    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User Logged in Succesfully"
            )
        )



})

//logOutUser
const loggedOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out Succesfully"))
})

//Refreshing Access Token
const refressAccessToken = asyncHandler(async (req, res) => {
    const incomingRefressToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefressToken) {
        throw new ApiError(401, "Unauthorized response");
    }
    try {
        const decodedToken = jwt.verify(incomingRefressToken
            , process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }
        if (incomingRefressToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used ")
        }
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        const{accessToken , newRefreshToken}= await generateAccessAndRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken:newRefreshToken},
                "Acces Token is refreshed Scuccessfully"
            )
        )
    
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh Token")
    }
})

// Change current user's password
const changeCurrentPassword = asyncHandler(async(req,res)=>{
    // Get passwords from request body
    const {oldPassword , newPassword , confirmPassword} = req.body;

     // Check if new password and confirm password match
    if(newPassword!==confirmPassword){
        throw new ApiError(400, "Confirm password do not match with newPassword")
    }
      
     // Fetch current user from database
      const user = await User.findById(req.user?._id);

        // Verify old password
      const isPasswordCorrect =  await user.isPasswordCorrect(oldPassword);
      
      if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
      }


        // Update password (will be hashed automatically by pre("save") middleware)
      user.password = newPassword ; 

       // Save updated user
      await user.save({validateBeforeSave : false})

       // Send success response
      return res.status(200)
      .json(
        new ApiResponse(200 , {} , "Password changed Succesfully")
      )
})

//currentUser
const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(
        200,req.user , "Current user fetched succesfully"
    )
})

//updating account details
const updateUserDetails = asyncHandler(async(req,res)=>{
    const{fullName , email} = req.body;

    if(!fullName || !email){
        throw new ApiError(400 , "All fields are required")
    }

    const user =await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set :{
                fullName,
                email
            }
        },
        {new : true}
    ).select("-password")
  
    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Account details updated succesfully")
    )
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
      const avatarLocalPath = req.file?.path;

      if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
      }

      const avatar = await uploadOnCloudinary(avatarLocalPath);

      if(!avatar || !avatar.url){
        throw new ApiError(400, "Error while handling avatar")
      }

     const user =  await User.findByIdAndUpdate(req.user?._id,
        {
            $set :{
                avatar : avatar.url
            }
        },
        {new :true}
      ).select("-password")

      return res
      .status(200)
      .json(
          new ApiResponse(200,user,"avatar  updated successfully")
        
      )
});

const updateUserCoverImage = asyncHandler(async(req,res)=>{
      const coverImageLocalPath = req.file?.path;

      if(!coverImageLocalPath){
        throw new ApiError(400, "coverImage file is missing")
      }

      const coverImage = await uploadOnCloudinary(coverImageLocalPath);

      if(!coverImage || !coverImage.url){
        throw new ApiError(400, "Error while handling coverImage")
      }

      const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set :{
                coverImage : coverImage.url
            }
        },
        {new :true}
      ).select("-password")

      return res
      .status(200)
      .json(
          new ApiResponse(200,user,"coverImage updated successfully")
        
      )
})


export { registerUser, 
    LoginUser, 
    loggedOutUser, 
    refressAccessToken, 
    changeCurrentPassword, 
    getCurrentUser,
    updateUserDetails,
updateUserAvatar,
updateUserCoverImage}