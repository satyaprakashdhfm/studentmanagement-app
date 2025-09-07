# Student Management System - Node.js Backend

A RESTful API built with Node.js, Express.js, and MySQL for managing students and users.

## Features

- 🔐 JWT Authentication
- 👤 User Management
- 🎓 Student Management
- 📊 Student Statistics
- 🔍 Search and Filtering
- 📄 Pagination
- ✅ Input Validation
- 🛡️ Security Middleware
- 📝 Error Handling

## Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation

1. Clone the repository and navigate to the backend directory:
```bash
cd backend-nodejs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env` if provided, or create a `.env` file
   - Update the database credentials and other settings

4. Set up the database:
   - Create a MySQL database named `student_management`
   - Run the SQL script in `../database/setup.sql`

5. Start the server:
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:8080`

## Environment Variables

```env
# Database Configuration
DB_HOST=localhost
DB_USER=satya3479
DB_PASSWORD=1234
DB_NAME=student_management
DB_PORT=3306

# Server Configuration
PORT=8080
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=24h

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile (protected)
- `POST /api/auth/logout` - User logout (protected)
- `POST /api/auth/change-password` - Change password (protected)

### Students
- `GET /api/students` - Get all students (protected)
- `GET /api/students/:id` - Get student by ID (protected)
- `POST /api/students` - Create new student (protected)
- `PUT /api/students/:id` - Update student (protected)
- `DELETE /api/students/:id` - Delete student (protected)
- `GET /api/students/stats/overview` - Get student statistics (protected)

### Users
- `GET /api/users` - Get all users (protected)
- `GET /api/users/:id` - Get user by ID (protected)
- `POST /api/users` - Create new user (protected)
- `PUT /api/users/:id` - Update user (protected)
- `DELETE /api/users/:id` - Deactivate user (protected)
- `PUT /api/users/:id/activate` - Reactivate user (protected)

### Health Check
- `GET /health` - API health check

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Request/Response Examples

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "active": true
  },
  "message": "Login successful"
}
```

### Create Student
```bash
POST /api/students
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": 6,
  "name": "Alice Johnson",
  "email": "alice.johnson@email.com",
  "course": "Engineering",
  "age": 21,
  "phoneNumber": "+1234567895",
  "enrolled": true
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Students Table
```sql
CREATE TABLE students (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    course VARCHAR(255),
    age INT,
    phone_number VARCHAR(20),
    enrolled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Security Features

- Helmet.js for security headers
- Rate limiting to prevent abuse
- CORS configuration
- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention with parameterized queries

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message description",
  "details": [] // Additional validation errors if applicable
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-restart
npm run dev

# Run tests
npm test

# Check for linting issues
npm run lint
```

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Use a process manager like PM2
3. Set up proper logging
4. Configure your web server (nginx/apache) as a reverse proxy
5. Use HTTPS in production
6. Set up database backups
7. Monitor your application

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
