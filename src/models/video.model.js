import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from 
"mongoose-aggregate-paginate-v2";
const videoSchema = new Schema(
    {
        videoFile: {
            type: String, //cloudarnary url 
            required: true,
        },

        thumbnail: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },

        Description: {
            type: String,
            required: true,
        },

        Duration: {
            type: Number,
            required: true,
        },
        views: {
            type: Number,
            deafault: 0,

        },

        isPublished: {
            type: boolean,
            default: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

videoSchema.plugin(mongooseAggregatePaginate)
export const Video = mongoose.model("Video", videoSchema)