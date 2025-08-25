# Ayeasses Admin Panel

A full-stack admin panel built with Node.js, MySQL, React, and Tailwind CSS. Features a modern, responsive design with comprehensive user management, content management, and file upload capabilities.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: CRUD operations for users with admin/user roles
- **Content Management**: Create, edit, and manage content with status tracking
- **File Upload**: Image upload functionality with validation
- **Dashboard Analytics**: Real-time statistics and recent activity tracking
- **Responsive Design**: Modern UI built with Tailwind CSS
- **Security**: Rate limiting, input validation, and secure session management
- **Logging**: Comprehensive logging with Winston

## 🛠 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File uploads
- **Winston** - Logging
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

### Frontend
- **React** - UI library
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

## 📁 Project Structure

```
ayeasses/
├── backend/                 # Node.js backend
│   ├── config/             # Database and app configuration
│   ├── middleware/         # Express middleware
│   ├── routes/            # API routes
│   ├── utils/             # Utility functions
│   ├── uploads/           # File uploads directory
│   ├── logs/              # Application logs
│   ├── server.js          # Main server file
│   └── package.json       # Backend dependencies
├── frontend/              # React frontend
│   ├── public/            # Static files
│   ├── src/               # Source code
│   │   ├── components/    # Reusable components
│   │   ├── context/       # React context
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── config/        # Configuration
│   └── package.json       # Frontend dependencies
└── package.json           # Root package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ayeasses
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Database Setup**
   - Create a MySQL database named `ayeasses_admin`
   - Update database credentials in `backend/config.env`

4. **Environment Configuration**
   - Copy `backend/config.env` and update the values:
   ```env
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=ayeasses_admin
   JWT_SECRET=your-secret-key
   ```

5. **Start the application**
   ```bash
   # Development mode (both frontend and backend)
   npm run dev
   
   # Or start separately
   npm run server  # Backend only
   npm run client  # Frontend only
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Default admin credentials: admin@ayeasses.com / admin123

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/register` - Register new user (admin only)
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password

### User Management Endpoints
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PATCH /api/users/:id/toggle-status` - Toggle user status

### Dashboard Endpoints
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent-activity` - Get recent activity
- `GET /api/dashboard/content` - Get content list
- `POST /api/dashboard/content` - Create content
- `PUT /api/dashboard/content/:id` - Update content
- `DELETE /api/dashboard/content/:id` - Delete content

### File Upload Endpoints
- `POST /api/upload/image` - Upload single image
- `POST /api/upload/images` - Upload multiple images
- `GET /api/upload/images` - Get uploaded images
- `DELETE /api/upload/image/:filename` - Delete image

## 🔧 Configuration

### Backend Configuration
The backend uses environment variables for configuration. Key settings:

- `PORT` - Server port (default: 5000)
- `DB_HOST` - Database host
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - Environment (development/production)

### Frontend Configuration
The frontend uses the `REACT_APP_API_URL` environment variable to configure the API base URL.

## 🛡 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for password security
- **Input Validation**: Express-validator for request validation
- **Rate Limiting**: Protection against brute force attacks
- **CORS Protection**: Configurable cross-origin requests
- **Security Headers**: Helmet.js for security headers
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization

## 📝 Logging

The application uses Winston for comprehensive logging:
- Error logs: `backend/logs/error.log`
- Combined logs: `backend/logs/combined.log`
- Console output in development mode

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Start backend in production
cd ../backend
NODE_ENV=production npm start
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure production database
- Set up proper CORS origins
- Configure file upload limits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the development team.

---

**Note**: This is a production-ready admin panel with comprehensive features. The default admin user is created automatically on first run with credentials: admin@ayeasses.com / admin123
