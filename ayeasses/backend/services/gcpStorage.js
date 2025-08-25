const { Storage } = require('@google-cloud/storage');
const path = require('path');
const logger = require('../utils/logger');

class GCPStorageService {
  constructor() {
    // Initialize GCP Storage with service account credentials
    this.storage = new Storage({
      projectId: 'my-project-1-296100',
      credentials: {
        type: "service_account",
        project_id: "my-project-1-296100",
        private_key_id: "e94d809be6d10008083c74faf38b80c5996e77a0",
        private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCoawEMhCBPDnGf\nOQIvMh/0+553SOpWN2ERw0gOb+8f5saUFmH6jEmtS9wr2v+/zDTd/jl2Y8Mto9Uc\np/OSYOUfXulbBlesPAsq3C1YzyltJPOyAUmEqECE1eRuWLLq2HBBMWcppUMTA+MF\nTRwbVupq1GgxF3n2MForMRjrqGdV4x/vE21MTN+vAA2y8ZcE9wie4z+uwTkaW3pN\n2eTdBvRszgXFrq+Vn72xZtz9I0Q/QVXdDbALUDwPwdK7ngQYQSPW2MECA9TVK6i1\nN/VQkC0UV1m01K4zn7RDDwJAbTIbb+jecLgA5HDIAnzfYshhzaPKHKdGUAbOc9Ah\nbj2c2ZylAgMBAAECggEAJlUoiXU/N081zEQ4+44AmQ12LXdCovn61YSpj2OpvQyV\nMRqBFXo9wLxN8gtn/3sWo1pcMNaXE3nBJUMS3MPCEqhTG70vUkveTNSNW7PXHXj2\nIJNLbO6wtKtMUVNN8cbukeARN3jeceMGFmxNE+nt8//BcT8DKuYpd8A2iFitoG3w\nz7a2TXAUQsd38guH6c8xWBqTMcbvnwaIClt2WPC5TSRg8tjpuSq5QtcEqFgRPdf8\nL+EHIdwjlf2zlRSAPJocne5/d2/FZeiaFaRXzNp3R5Qqtpw0exJ+rimSL3TJUIFW\n6GnirpPPG4HZZkeqhS7mvyHP/0vh3bsOEzv+u/MshwKBgQDrbCqvk7VHaic9PZUX\neo05awJPMY6woGTNJrzQ/V/JlEG342smwto84f5Axm3jeo7nQbTeWhfoW0mMXrjI\nPy/5fvSofImXBkUI3oZjk/WMyhBEs1aNE+FFT6AaTqpSA6zkSelg8W26yG9XU2T5\n4D9qYY9dSwU3c/h/X2NewZiR8wKBgQC3I4nTRAC1uvQJzBCvVOHxMiWMfMiD7dlG\nwaRa7UUdlPFsINtTCR3UZcmjAyY+Zw5elGR/b42DMvnfvJT18cqzxNfgx5lx9gfb\n7Yvday6URp1MyWzYciYLvfor3QM6nlHEGPJ7aRxSsUF9kc7sRsjyKLC6ClQQ8gis\n3wLUoPSlBwKBgQCRg14vACGAbsCqPbI1vO4lm1rmED+eNMWZeGQk2TenpRepzcuh\nPbcfAqDg8MVjYZGKpzZgaVd1q1ceiD22qDfDAxG+QpvY2Ws6PDDcw8t2pj6/+Al7\nUdpfuQPAvvbPkq3+vSCfZxrn5JPNaiJzwIPyATNX+tLSn7/tGsyU+RyQuQKBgHmG\n8rGn4ZS2j7RknvnKKPimHzafo2uwjMsgOpE/++pKaP4ou4HZfdrxBKHQuDMWrflj\nHWFXRB+41wl6GZsvLSSnzd1SdmeiLMrrUjHHKyynw0AuNbVX4hlOotEyoy7l2jp3\nl4j/UhUpnNzXwekWe8f96nA55FkuU0Vr43P3rwBHAoGAdpYmpPk03fhy2iEHvkb5\nH4JgZyoRbKW100ItDTDbKSFjtNcmi7J2Idlkgx+mHw6vYMrkEDtYr9TCTIVCIvSo\n+4QwaIw6LfV4gQ61svQpuf6zZ2URmme1MJjE5sncClIZPqfHeVJxWWKq3kaIvA3D\nbkM4F3PiirzpuZRxIxHSFGE=\n-----END PRIVATE KEY-----\n",
        client_email: "storage@my-project-1-296100.iam.gserviceaccount.com",
        client_id: "115945917525923874973",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/storage%40my-project-1-296100.iam.gserviceaccount.com"
      }
    });

    this.bucketName = 'lms-files-uploads';
    this.bucket = this.storage.bucket(this.bucketName);
    
    logger.info('GCP Storage service initialized');
  }

  // Upload file to GCP Storage
  async uploadFile(file, folder = 'general') {
    try {
      const timestamp = Date.now();
      const fileName = `${folder}/${timestamp}_${file.originalname}`;
      const fileBuffer = file.buffer;
      
      // Create file object in bucket
      const fileObject = this.bucket.file(fileName);
      
      // Upload file
      await fileObject.save(fileBuffer, {
        metadata: {
          contentType: file.mimetype,
        },
        resumable: false
      });

      // Make file publicly accessible
      await fileObject.makePublic();

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
      
      logger.info(`File uploaded successfully: ${publicUrl}`);
      
      return {
        success: true,
        url: publicUrl,
        fileName: fileName,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      };

    } catch (error) {
      logger.error('GCP upload error:', error);
      throw new Error('Failed to upload file to GCP Storage');
    }
  }

  // Delete file from GCP Storage
  async deleteFile(fileName) {
    try {
      const file = this.bucket.file(fileName);
      await file.delete();
      
      logger.info(`File deleted successfully: ${fileName}`);
      return { success: true };

    } catch (error) {
      logger.error('GCP delete error:', error);
      throw new Error('Failed to delete file from GCP Storage');
    }
  }

  // Get file metadata
  async getFileMetadata(fileName) {
    try {
      const file = this.bucket.file(fileName);
      const [metadata] = await file.getMetadata();
      
      return {
        success: true,
        metadata: metadata
      };

    } catch (error) {
      logger.error('GCP metadata error:', error);
      throw new Error('Failed to get file metadata');
    }
  }

  // Generate signed URL for private access (if needed)
  async generateSignedUrl(fileName, expirationMinutes = 60) {
    try {
      const file = this.bucket.file(fileName);
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expirationMinutes * 60 * 1000,
      });
      
      return {
        success: true,
        signedUrl: signedUrl
      };

    } catch (error) {
      logger.error('GCP signed URL error:', error);
      throw new Error('Failed to generate signed URL');
    }
  }
}

module.exports = new GCPStorageService();
