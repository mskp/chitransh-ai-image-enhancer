import express from "express";
import multer from "multer";
import processImage from "./utils/api_func.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 8000;
const UPLOADED_PATH = "public/uploadedImage.png";

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, "public/"),
    filename: (_, __, cb) => cb(null, "uploadedImage.png"),
  }),
});

app.get("/", (req, res) => res.render("index"));

app.post("/", upload.single("imageFile"), async (req, res) => {
  try {
    if (!req.file) throw new Error("Failed Uploading file");
    const processedImageUrl = await processImage(UPLOADED_PATH);

    return res.json({
      uploadedImage: `uploadedImage.png`,
      processedImage: processedImageUrl,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
