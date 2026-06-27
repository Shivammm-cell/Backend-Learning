import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req, res) => {
    //today work 
    const { fullName, username, email, password } = req.body;
    console.log("email:", email);

    if (
        [fullName, email, password, username].some((field) =>
            field?.trim() === ""
        )) {
        throw new ApiError(400, "all fields are required")
    }

    const existedUser =  await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!existedUser) {
        throw new ApiError(409, "User with email or username already existed")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0].path;


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
        new ApiResponse(200, createdUser, "User registered Successfully" )
    )
})


export { registerUser }