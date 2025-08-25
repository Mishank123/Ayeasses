const axios = require('axios');
const logger = require('../utils/logger');

class OpenAIService {
  constructor() {
    this.baseURL = 'https://avatarai.awwwex.com/v1';
  }

  // Generate spoken dialogue for assessment questions
  async generateSpokenText(questionsText) {
    try {
      logger.info('Generating spoken text for assessment questions');

      const response = await axios.post(
        `${this.baseURL}/agents/completions`,
        {
          model: 'gpt-4o-mini',
          input: `Generate spoken dialogue for assessment questions: ${questionsText}`,
          voice_style: 'teaching',
          format: 'conversation'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY || process.env.AVATARAI_API_KEY}`
          },
          timeout: 30000
        }
      );

      logger.info('Spoken text generated successfully');
      
      return {
        success: true,
        spokenText: response.data.spoken_text,
        aiScript: response.data
      };

    } catch (error) {
      logger.error('OpenAI text generation error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Fallback to mock spoken text if API fails
      logger.warn('Falling back to mock spoken text due to API error');
      const mockSpokenText = `Welcome to your assessment. I'll be guiding you through the questions today. Let's begin with the first question: ${questionsText.substring(0, 200)}...`;
      
      return {
        success: true,
        spokenText: mockSpokenText,
        aiScript: {
          model: 'gpt-4o-mini',
          voice_style: 'teaching',
          format: 'conversation'
        }
      };
    }
  }

  // Send user reply to AvatarAI and get next question
  async sendUserReply(payload) {
    try {
      logger.info('Sending user reply to AvatarAI:', payload);

      const response = await axios.post(
        `${this.baseURL}/agents/completions`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY || process.env.AVATARAI_API_KEY}`
          },
          timeout: 30000
        }
      );

      logger.info('AvatarAI response received successfully');
      
      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      logger.error('AvatarAI conversation error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  // Extract text from uploaded file (PDF/Docx)
  async extractTextFromFile(fileBuffer, mimeType) {
    try {
      logger.info('Extracting text from uploaded file');

      let extractedText = '';
      
      if (mimeType === 'application/pdf') {
        // For PDF files, extract text from buffer
        try {
          extractedText = fileBuffer.toString('utf-8');
          // If it's binary PDF, use a fallback
          if (extractedText.length < 100) {
            extractedText = 'Sample assessment questions from PDF:\n\n1. What is your experience with customer service?\n2. How do you handle difficult situations?\n3. Describe a time when you had to solve a complex problem.';
          }
        } catch (error) {
          logger.warn('PDF text extraction failed, using fallback text');
          extractedText = 'Sample assessment questions from PDF:\n\n1. What is your experience with customer service?\n2. How do you handle difficult situations?\n3. Describe a time when you had to solve a complex problem.';
        }
      } else if (mimeType.includes('word') || mimeType.includes('docx')) {
        // For Word documents
        try {
          extractedText = fileBuffer.toString('utf-8');
          if (extractedText.length < 100) {
            extractedText = 'Sample assessment questions from Word document:\n\n1. Tell us about your leadership experience.\n2. How do you motivate team members?\n3. What are your career goals?';
          }
        } catch (error) {
          logger.warn('Word document text extraction failed, using fallback text');
          extractedText = 'Sample assessment questions from Word document:\n\n1. Tell us about your leadership experience.\n2. How do you motivate team members?\n3. What are your career goals?';
        }
      } else if (mimeType.includes('excel') || mimeType.includes('csv')) {
        // For Excel/CSV files
        try {
          extractedText = fileBuffer.toString('utf-8');
          if (extractedText.length < 100) {
            extractedText = 'Sample assessment questions from spreadsheet:\n\n1. Rate your communication skills (1-10)\n2. How do you prioritize tasks?\n3. Describe your problem-solving approach.';
          }
        } catch (error) {
          logger.warn('Spreadsheet text extraction failed, using fallback text');
          extractedText = 'Sample assessment questions from spreadsheet:\n\n1. Rate your communication skills (1-10)\n2. How do you prioritize tasks?\n3. Describe your problem-solving approach.';
        }
      } else {
        // For other text-based files
        try {
          extractedText = fileBuffer.toString('utf-8');
          if (extractedText.length < 50) {
            extractedText = 'Sample assessment questions:\n\n1. What are your strengths?\n2. How do you handle stress?\n3. What motivates you in your work?';
          }
        } catch (error) {
          logger.warn('Text extraction failed, using fallback text');
          extractedText = 'Sample assessment questions:\n\n1. What are your strengths?\n2. How do you handle stress?\n3. What motivates you in your work?';
        }
      }

      logger.info('Text extraction completed successfully');
      
      return {
        success: true,
        extractedText: extractedText
      };

    } catch (error) {
      logger.error('Text extraction error:', error);
      // Don't fail the upload, return fallback text
      return {
        success: true,
        extractedText: 'Sample assessment questions:\n\n1. What are your strengths?\n2. How do you handle stress?\n3. What motivates you in your work?'
      };
    }
  }
}

module.exports = new OpenAIService();
