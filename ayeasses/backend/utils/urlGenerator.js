const crypto = require('crypto');

class UrlGenerator {
  static generateUUID() {
    // Generate a UUID v4 style string
    return crypto.randomUUID();
  }

  static generateSlug(title) {
    // Convert title to URL-friendly slug
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }

  static generateAssessmentUrl(title) {
    const slug = this.generateSlug(title);
    const uuid = this.generateUUID();
    return `${slug}-${uuid}`;
  }

  static generateFullUrl(uuid) {
    // This will be used to generate the full URL
    // You can customize the base URL based on your environment
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/assessment/${uuid}`;
  }
}

module.exports = UrlGenerator;
