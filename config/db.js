import mongoose , { ObjectId } from "mongoose";
export const connectDB = async () =>{
    try {
        const dbURI = process.env.MONGO_URI;
        const instance = await mongoose.connect(dbURI);
        console.log("Database connected successfully");
} catch ( error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
}