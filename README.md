# AYE ASSESS - AI-Powered Assessment System

A comprehensive AI-powered assessment platform with video avatar integration, real-time streaming, and intelligent question processing.

## Features

- 🤖 **AI Avatar Integration** - Interactive video avatars using Heygen API
- 📊 **Assessment Management** - Create, edit, and manage assessments
- 📁 **File Upload** - Support for PDF, CSV, and Excel files
- 🔐 **User Authentication** - Secure login and session management
- ☁️ **Cloud Storage** - GCP integration for file storage
- 🎯 **Real-time Streaming** - Live video chat with AI avatars
- 📱 **Responsive UI** - Modern React.js frontend

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MySQL** database
- **GCP Cloud Storage** for file management
- **Heygen API** for video avatars
- **OpenAI API** for text processing
- **JWT** authentication

### Frontend
- **React.js** with hooks
- **Tailwind CSS** for styling
- **Axios** for API calls
- **React Router** for navigation

## Project Structure

```
ayeasses/
├── backend/                 # Node.js backend server
│   ├── config/             # Database and environment config
│   ├── routes/             # API routes
│   ├── services/           # Business logic services
│   ├── middleware/         # Custom middleware
│   └── utils/              # Utility functions
├── frontend/               # React.js frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MySQL database
- GCP Cloud Storage account
- Heygen API key
- OpenAI API key

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd ayeasses/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `config.env.example` to `config.env`
   - Update database credentials and API keys

4. Setup database:
   ```bash
   node setup-database.js
   ```

5. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd ayeasses/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Assessments
- `GET /api/assessments` - Get all assessments
- `POST /api/assessments` - Create assessment
- `PUT /api/assessments/:id` - Update assessment
- `DELETE /api/assessments/:id` - Delete assessment

### File Upload
- `POST /api/upload/gcp/upload` - Upload file to GCP
- `GET /api/upload/files` - Get uploaded files
- `DELETE /api/upload/file/:fileId` - Delete file

### Heygen Integration
- `POST /api/heygen/streaming/create-token` - Create streaming token
- `POST /api/heygen/streaming/new` - Create new stream
- `POST /api/heygen/streaming/start` - Start streaming
- `POST /api/heygen/streaming/task` - Send text to avatar

## Environment Variables

### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ayeassess_db
DB_PORT=3306

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h

# APIs
HEYGEN_API_KEY=your-heygen-api-key
OPENAI_API_KEY=your-openai-api-key
AVATARAI_API_KEY=your-avatarai-api-key

# GCP
GCP_PROJECT_ID=your-gcp-project-id
GCP_BUCKET_NAME=your-bucket-name
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For support and questions, please contact the development team.
