import fs from "fs";
import path from "path";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Please provide a file path.");
  process.exit(1);
}

const absolutePath = path.resolve(filePath);

if (!fs.existsSync(absolutePath)) {
  console.error(`File not found: ${absolutePath}`);
  process.exit(1);
}

try {
  const fileBuffer = fs.readFileSync(absolutePath);
  const base64String = fileBuffer.toString("base64");
  console.log(base64String);
} catch (error) {
  console.error("Error reading file:", error);
  process.exit(1);
}
