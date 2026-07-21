import { S3Client } from "@aws-sdk/client-s3";

export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME as string;
export const AWS_REGION = process.env.AWS_REGION as string;

export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export const buildPublicUrl = (key: string): string =>
  `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
