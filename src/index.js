// require(`dotenv`).config({path: `./env`})
import {app} from "./app.js"
import dotenv from "dotenv"
// import  connectDB from "./db/index.js";

dotenv.config({
    path:`./env`
})


  app.listen(process.env.PORT||8000,()=>{
       console.log(`Server is running at port ${process.env.PORT}`);
    })



// connectDB()
// .then(()=>{
           
//      app.on("error",(error) => {
//            console.log("ERROR: ", error)
//            throw error
//        })


//     app.listen(process.env.PORT||8000,()=>{
//         console.log(`Server is running at port ${process.env.PORT}`);
//     })
// })
// .catch((error)=>{
//     console.log("MongoDb connection Failed!!!" , error)     
// })


























