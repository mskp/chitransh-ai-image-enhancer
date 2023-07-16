import { promises as fs } from "fs";
import { createHash } from "crypto";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const CONTENT_TYPE = "image/jpeg";
const OUTPUT_CONTENT_TYPE = "image/jpeg";

const TIMEOUT = 60000;
const BASE_URL = process.env.BASE_URL;

async function getImageMd5Content(image_path) {
  const content = await fs.readFile(image_path);
  const md5Hash = createHash("md5").update(content).digest("base64");
  return { md5Hash, content };
}

export default async function processImage(image_path) {
  const { md5Hash, content } = await getImageMd5Content(image_path);
  const client = axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${process.env.API_KEY}` },
    timeout: TIMEOUT,
  });

  console.log("Submitting image ...");
  const submitTaskResponse = await client.post("/tasks", {
    tools: [
      { type: "face_enhance", mode: "beautify" },
      { type: "background_enhance", mode: "base" },
    ],
    image_md5: md5Hash,
    image_content_type: CONTENT_TYPE,
    output_content_type: OUTPUT_CONTENT_TYPE,
  });

  const taskID = submitTaskResponse.data.task_id;
  const uploadURL = submitTaskResponse.data.upload_url;
  const uploadHeaders = submitTaskResponse.data.upload_headers;

  console.log("Uploading image to Google Cloud Storage ...");
  await axios.put(uploadURL, content, { headers: uploadHeaders });

  console.log(`Processing task: ${taskID} ...`);
  await client.post(`/tasks/${taskID}/process`);

  console.log(`Polling result for task: ${taskID} ...`);
  for (let i = 0; i < 50; i++) {
    const getTaskResponse = await client.get(`/tasks/${taskID}`);

    if (getTaskResponse.data.status === "completed") {
      console.log("Processing completed.");
      console.log("Output url: " + getTaskResponse.data.result.output_url);
      return getTaskResponse.data.result.output_url;
    } else {
      if (getTaskResponse.data.status !== "processing") {
        console.error("Found illegal status: " + getTaskResponse.data.status);
        process.exit(1);
      }
      console.log("Processing, sleeping 2 seconds ...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.error("Timeout reached! :( ");
}
