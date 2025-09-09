import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import cors from "cors";
import env from "dotenv";

export const app = express();
const port = 4000;

env.config();

app.use(cors({
  origin: `${process.env.BASE_URL}`,
  methods: "GET, POST, DELETE",
  allowedHeaders: "Content-Type",
}));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

export default app;
