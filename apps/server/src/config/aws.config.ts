import { S3Client } from '@aws-sdk/client-s3';

const validateAwsConfig = () => {
    const required = [
        'AWS_REGION',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_S3_BUCKET_NAME'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.warn(` Missing AWS configuration: ${missing.join(', ')}`);
        console.warn('AWS S3 features will not be available');
    }

    return missing.length === 0;
};

// AWS Configuration
export const awsConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    bucketName: process.env.AWS_S3_BUCKET_NAME || '',
    isConfigured: validateAwsConfig(),
};

let s3ClientInstance: S3Client | null = null;

export const getS3Client = (): S3Client => {
    if (!awsConfig.isConfigured) {
        throw new Error('AWS S3 is not properly configured. Please check your environment variables.');
    }

    if (!s3ClientInstance) {
        s3ClientInstance = new S3Client({
            region: awsConfig.region,
            credentials: awsConfig.credentials,
        });
        console.log('✅ AWS S3 Client initialized');
    }

    return s3ClientInstance;
};

export const s3Client = awsConfig.isConfigured ? getS3Client() : null;

export default awsConfig;
