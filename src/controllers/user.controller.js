import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (UserId) => {
    try {
        const user = await User.findById(UserId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating the refresh and access token")
    }
}


//RegisterUser
const registerUser = asyncHandler(async (req, res) => {
    //today work 
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
        httpOnly : true,
        secure: true,
    }
        

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,
            {
                user:loggedInUser , accessToken , refreshToken
            },
            "User Logged in Succesfully"
        )
    )


})

export { registerUser, LoginUser }