import fs from "node:fs/promises";
import path from "node:path";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

const file = getArg("file");
const key = getArg("key");
const contentType = getArg("contentType") ?? "audio/mpeg";

if (!file || !key) {
  console.error(
    "Usage: node scripts/r2-upload.mjs --file <path> --key <r2-object-key> [--contentType audio/mpeg]"
  );
  process.exit(2);
}

const accountId = requiredEnv("R2_ACCOUNT_ID");
const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
const bucket = requiredEnv("R2_BUCKET");

const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

const client = new S3Client({
  region: "auto",
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});

const absoluteFile = path.resolve(process.cwd(), file);
const body = await fs.readFile(absoluteFile);

await client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  })
);

const publicBase = process.env.R2_PUBLIC_BASE_URL;
if (publicBase) {
  const url = `${publicBase.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
  console.log(url);
} else {
  console.log(`Uploaded s3://${bucket}/${key}`);
  console.log("Set R2_PUBLIC_BASE_URL to print the public URL.");
}
