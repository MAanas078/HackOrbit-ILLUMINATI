dotenv.config();
import express from "express";
import dotenv from "dotenv"
import path from "path"
import cookieParser from "cookie-parser";
import cors from "cors"

import authRouter from "./routes/auth.route.js"
import deviceRouter from "./routes/device.route.js"
import sessionRouter from "./routes/session.route.js"
import blendsessionRouter from "./routes/blendSession.route.js";
import chatRouter from "./routes/chat.routes.js"

//Connect DB
import connectDB from "./connection/connectDB.js";

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5000", "http://localhost:3000", "https://pre-hack-prix.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

  
app.use(express.json());
app.use(cookieParser());

//Routes
app.use("/api/auth", authRouter);
app.use("/api/device", deviceRouter);
app.use("/api/session", sessionRouter); 
app.use("/api/blendsession", blendsessionRouter); 
app.use("/api/chat", chatRouter);

// if (process.env.NODE_ENV === "production") {
// 	app.use(express.static(path.join(__dirname, "/frontend/dist")));

// 	app.get("*", (req, res) => {
// 		res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
// 	});
// }

app.get("/",(req,res)=>{
    return res.json("Healthy");
})


//Server start
app.listen(PORT, ()=>{
    connectDB();
    console.log(`Server has started at PORT: ${PORT}`)
});