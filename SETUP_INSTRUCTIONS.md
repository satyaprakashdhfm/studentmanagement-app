# Student Management Application Setup Instructions

## Overview
This application has been converted from Spring Boot (Java) to Node.js with Express.js backend, **Prisma ORM**, and React frontend.

## Prerequisites
1. **Node.js** (v16 or higher) - Download from https://nodejs.org/
2. **PostgreSQL** (v12 or higher) - Download from https://www.postgresql.org/download/
3. **Git** (optional) - For version control

## Setup Instructions

### 1. Database Setup (PostgreSQL)

1. **Install and start PostgreSQL server**
   - Make sure PostgreSQL is running on your machine
   - Default port should be 5432

2. **Create the database and user**
   ```sql
   -- Login to PostgreSQL as superuser (usually 'postgres')
   psql -U postgres
   
   -- Create the database
   CREATE DATABASE student_management;
   
   -- Create user (if doesn't exist)
   CREATE USER satya3479 WITH ENCRYPTED PASSWORD '1234';
   
   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE student_management TO satya3479;
   
   -- Exit PostgreSQL
   \q
   ```

### 2. Backend Setup (Node.js/Express with Prisma)

1. **Navigate to the backend directory**
   ```bash
   cd backend-nodejs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - The `.env` file is already configured with your database credentials:
     ```
     DATABASE_URL="postgresql://satya3479:1234@localhost:5432/student_management?schema=public"
     ```

4. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

5. **Push database schema to PostgreSQL**
   ```bash
   npx prisma db push
   ```

6. **Seed the database with initial data**
   ```bash
   npm run db:seed
   ```

7. **Start the backend server**
   ```bash
   # For development (with auto-restart)
   npm run dev
   
   # Or for production
   npm start
   ```
   
   The backend will run on `http://localhost:8080`

### 3. Frontend Setup (React)

1. **Navigate to the frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies** (if not already done)
   ```bash
   npm install
   ```

3. **Start the frontend development server**
   ```bash
   npm start
   ```
   
   The frontend will run on `http://localhost:3000`

### 4. Testing the Application

1. **Backend API Test**
   - Visit `http://localhost:8080/health` to check if backend is running
   - You should see: `{"status":"OK","message":"Student Management API is running",...}`

2. **Frontend Test**
   - Visit `http://localhost:3000`
   - You should see the Student Management login page

3. **Login with default credentials**
   - Username: `admin`
   - Password: `admin123`

## File Structure

```
studentmanagement-app/
├── backend-nodejs/          # New Node.js backend with Prisma
│   ├── config/
│   │   └── database.js      # Prisma client configuration
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema definition
│   │   └── seed.js          # Database seeding script
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   ├── students.js      # Student management routes
│   │   └── users.js         # User management routes
│   ├── utils/
│   │   ├── jwt.js           # JWT utilities
│   │   ├── password.js      # Password utilities
│   │   └── validation.js    # Validation utilities
│   ├── .env                 # Environment variables
│   ├── .gitignore          # Git ignore file
│   ├── package.json        # Dependencies and scripts
│   ├── server.js           # Main server file
│   └── README.md           # Backend documentation
├── backend/                 # Old Spring Boot backend (can be removed)
├── frontend/               # React frontend (unchanged)
├── database/               # Old database setup (no longer needed with Prisma)
└── SETUP_INSTRUCTIONS.md  # This file
```

## Prisma Features

### 🎯 **Why Prisma?**
- **Type Safety**: Auto-generated TypeScript-like types
- **Database Migrations**: Version control for your database schema
- **Query Builder**: Write database queries in JavaScript/TypeScript
- **Auto-completion**: IntelliSense support in your IDE
- **Database Introspection**: Generate schema from existing database

### 🔧 **Prisma Commands**
```bash
# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes to database (for development)
npx prisma db push

# Create and run migrations (for production)
npx prisma migrate dev

# Open Prisma Studio (database GUI)
npx prisma studio

# Seed database with initial data
npm run db:seed

# Reset database (warning: deletes all data)
npx prisma db reset
```

## API Endpoints

The new Node.js backend provides the same API endpoints as the original Spring Boot version:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `GET /api/auth/profile` - Get user profile

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check if MySQL is running
   - Verify database credentials in `.env` file
   - Ensure database and user exist

2. **Port Already in Use**
   - Backend (8080): Change `PORT` in `.env` file
   - Frontend (3000): React will suggest another port

3. **CORS Errors**
   - Ensure frontend URL is correctly set in backend `.env`: `FRONTEND_URL=http://localhost:3000`

4. **JWT Token Issues**
   - Check if `JWT_SECRET` is set in `.env`
   - Tokens expire after 24 hours by default

### Logs
- Backend logs appear in the terminal where you run `npm start` or `npm run dev`
- Check browser console for frontend errors

## Development vs Production

### Development
- Use `npm run dev` for backend (auto-restart with nodemon)
- Use `npm start` for frontend (hot reload)
- Detailed error messages and stack traces

### Production
- Use `npm start` for backend
- Build frontend with `npm run build`
- Use environment variables for sensitive data
- Set `NODE_ENV=production`

## Next Steps

1. **Remove old backend**: Once everything works, you can delete the `backend/` directory (Spring Boot)
2. **Add features**: The new backend supports the same features as the original
3. **Deploy**: Consider using services like Heroku, AWS, or DigitalOcean for deployment
4. **Database**: Consider using cloud databases like AWS RDS or Google Cloud SQL for production

## Support

If you encounter any issues:
1. Check the logs in terminal
2. Verify database connection
3. Ensure all dependencies are installed
4. Check that ports 3000 and 8080 are available

The application should work exactly like the original Spring Boot version but now with Node.js backend!
