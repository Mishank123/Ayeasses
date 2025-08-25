# Assessment API Documentation

This API provides endpoints for creating, managing, and publishing assessments with file upload support.

## Base URL
```
http://localhost:5000/api/assessments
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Create Assessment
**POST** `/api/assessments`

Creates a new assessment. File upload is required only when status is "published".

#### Request Body (Form Data)
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| title | string | Yes | Assessment title | Min 5 characters |
| description | string | Yes | Assessment description | Min 10 characters |
| category | string | No | Assessment category | Any string |
| difficultyLevel | string | No | Difficulty level | beginner, intermediate, advanced, expert |
| estimatedDuration | number | No | Duration in minutes | 1-480 (default: 20) |
| assessmentType | string | No | Type of assessment | video, text, audio (default: video) |
| status | string | No | Assessment status | draft, published (default: draft) |
| questionsFile | file | Conditional | Questions file | Required if status="published" |

#### File Upload Requirements
- **Allowed formats**: PDF, CSV, Excel files
- **Max size**: 5MB
- **Field name**: `questionsFile`

#### Example Requests

**Create Draft Assessment (No File Required)**
```bash
curl -X POST http://localhost:5000/api/assessments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Advanced JavaScript Concepts",
    "description": "Comprehensive assessment covering modern JavaScript features including ES6+, async/await, and functional programming concepts.",
    "category": "Programming",
    "difficultyLevel": "advanced",
    "estimatedDuration": 45,
    "assessmentType": "video",
    "status": "draft"
  }'
```

**Create Published Assessment (File Required)**
```bash
curl -X POST http://localhost:5000/api/assessments \
  -H "Authorization: Bearer <token>" \
  -F "title=Advanced JavaScript Concepts" \
  -F "description=Comprehensive assessment covering modern JavaScript features including ES6+, async/await, and functional programming concepts." \
  -F "category=Programming" \
  -F "difficultyLevel=advanced" \
  -F "estimatedDuration=45" \
  -F "assessmentType=video" \
  -F "status=published" \
  -F "questionsFile=@questions.pdf"
```

#### Response
```json
{
  "message": "Assessment created successfully",
  "assessment": {
    "id": "1703123456789",
    "title": "Advanced JavaScript Concepts",
    "description": "Comprehensive assessment covering modern JavaScript features...",
    "category": "Programming",
    "difficultyLevel": "advanced",
    "estimatedDuration": 45,
    "assessmentType": "video",
    "status": "draft",
    "questionsFile": null,
    "createdAt": "2023-12-21T10:30:45.123Z"
  }
}
```

### 2. Get All Assessments
**GET** `/api/assessments`

Retrieves all assessments with pagination and filtering.

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| page | number | Page number | 1 |
| limit | number | Items per page | 10 |
| status | string | Filter by status | (all) |
| search | string | Search in title/description | (all) |

#### Example Request
```bash
curl -X GET "http://localhost:5000/api/assessments?page=1&limit=5&status=published" \
  -H "Authorization: Bearer <token>"
```

#### Response
```json
{
  "assessments": [
    {
      "id": "1703123456789",
      "title": "Advanced JavaScript Concepts",
      "description": "Comprehensive assessment...",
      "category": "Programming",
      "difficultyLevel": "advanced",
      "estimatedDuration": 45,
      "assessmentType": "video",
      "status": "published",
      "questionsFile": "questionsFile-1703123456789-123456789.pdf",
      "createdBy": 1,
      "createdAt": "2023-12-21T10:30:45.123Z",
      "updatedAt": "2023-12-21T10:30:45.123Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 1,
    "totalPages": 1
  }
}
```

### 3. Get Assessment by ID
**GET** `/api/assessments/:id`

Retrieves a specific assessment by ID.

#### Example Request
```bash
curl -X GET http://localhost:5000/api/assessments/1703123456789 \
  -H "Authorization: Bearer <token>"
```

#### Response
```json
{
  "assessment": {
    "id": "1703123456789",
    "title": "Advanced JavaScript Concepts",
    "description": "Comprehensive assessment...",
    "category": "Programming",
    "difficultyLevel": "advanced",
    "estimatedDuration": 45,
    "assessmentType": "video",
    "status": "published",
    "questionsFile": "questionsFile-1703123456789-123456789.pdf",
    "createdBy": 1,
    "createdAt": "2023-12-21T10:30:45.123Z",
    "updatedAt": "2023-12-21T10:30:45.123Z"
  }
}
```

### 4. Update Assessment
**PUT** `/api/assessments/:id`

Updates an existing assessment. File upload is optional unless changing status to "published".

#### Example Request
```bash
curl -X PUT http://localhost:5000/api/assessments/1703123456789 \
  -H "Authorization: Bearer <token>" \
  -F "title=Updated JavaScript Assessment" \
  -F "description=Updated description with more content." \
  -F "status=published" \
  -F "questionsFile=@new-questions.pdf"
```

### 5. Delete Assessment
**DELETE** `/api/assessments/:id`

Deletes an assessment.

#### Example Request
```bash
curl -X DELETE http://localhost:5000/api/assessments/1703123456789 \
  -H "Authorization: Bearer <token>"
```

#### Response
```json
{
  "message": "Assessment deleted successfully"
}
```

### 6. Publish Assessment
**PATCH** `/api/assessments/:id/publish`

Publishes a draft assessment. Requires a questions file if not already uploaded.

#### Example Request
```bash
curl -X PATCH http://localhost:5000/api/assessments/1703123456789/publish \
  -H "Authorization: Bearer <token>" \
  -F "questionsFile=@questions.pdf"
```

#### Response
```json
{
  "message": "Assessment published successfully",
  "assessment": {
    "id": "1703123456789",
    "title": "Advanced JavaScript Concepts",
    "status": "published",
    "questionsFile": "questionsFile-1703123456789-123456789.pdf",
    "updatedAt": "2023-12-21T10:35:12.456Z"
  }
}
```

## Validation Rules

### Required Fields
- **title**: Minimum 5 characters
- **description**: Minimum 10 characters

### Optional Fields with Validation
- **difficultyLevel**: Must be one of: `beginner`, `intermediate`, `advanced`, `expert`
- **estimatedDuration**: Integer between 1-480 minutes
- **assessmentType**: Must be one of: `video`, `text`, `audio`
- **status**: Must be one of: `draft`, `published`

### File Upload Rules
- **File required**: Only when status is "published"
- **Allowed types**: PDF, CSV, Excel files
- **Max size**: 5MB
- **Field name**: `questionsFile`

## Error Responses

### Validation Error
```json
{
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "value": "Hi",
      "msg": "Title must be at least 5 characters long",
      "path": "title",
      "location": "body"
    }
  ]
}
```

### File Required Error
```json
{
  "error": "Questions file is required when publishing an assessment"
}
```

### File Upload Error
```json
{
  "error": "File upload failed",
  "details": "Invalid file type. Only PDF, CSV, and Excel files are allowed."
}
```

### Not Found Error
```json
{
  "error": "Assessment not found"
}
```

## Testing

Run the test file to verify API functionality:

```bash
cd backend
npm install
node test-assessment-api.js
```

The test file will:
1. Login with admin credentials
2. Create a draft assessment (no file required)
3. Try to publish without file (should fail)
4. Publish with file (should succeed)
5. Create a published assessment directly
6. Test validation errors
7. Retrieve all assessments

## Database Schema

### Assessments Table
```sql
CREATE TABLE assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  difficulty_level ENUM('beginner', 'intermediate', 'advanced', 'expert'),
  estimated_duration INT DEFAULT 20,
  assessment_type ENUM('video', 'text', 'audio') DEFAULT 'video',
  status ENUM('draft', 'published') DEFAULT 'draft',
  questions_file VARCHAR(500),
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES assessment_user(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  INDEX idx_created_at (created_at)
);
```

## File Storage

Uploaded files are stored in:
```
backend/uploads/assessments/
```

Files are accessible via:
```
http://localhost:5000/uploads/assessments/<filename>
```

## Notes

- Uses MySQL database for persistent storage.
- File uploads are stored on disk with unique filenames.
- All timestamps are in ISO format.
- Assessment IDs are auto-incremented integers.
- Authentication is required for all endpoints.
- Database indexes are created for optimal performance on status, created_by, and created_at fields.
