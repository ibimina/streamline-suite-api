# Streamline Suite API

A comprehensive NestJS backend API for Streamline Suite business management system built with MongoDB.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Complete user profile and permission management
- **Account Management**: Multi-tenant account settings with logo and custom template uploads
- **Invoice Management**: Invoice data management (PDF generation handled by frontend)
- **Quotation System**: Quote creation and management (PDF generation handled by frontend)
- **Inventory Management**: Product and service catalog with stock tracking
- **Expense Tracking**: Comprehensive expense management with categories
- **Staff Management**: Employee management with role-based permissions
- **File Upload System**: Secure image upload for account logos and custom PDF templates
- **Analytics & Reporting**: Business insights and reporting dashboards
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation

## 🛠 Technology Stack

- **Framework**: NestJS with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with Passport.js
- **Validation**: class-validator and class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest with Supertest
- **Security**: Helmet, bcrypt, rate limiting

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB (local or cloud)

## 🚦 Getting Started

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd streamline-suite-api
npm install
\`\`\`

### 2. Environment Configuration

\`\`\`bash
cp .env.example .env
\`\`\`

Edit the \`.env\` file with your configuration:

\`\`\`env
DATABASE_URL=mongodb://localhost:27017/streamline-suite
JWT_SECRET=your-super-secure-jwt-secret
FRONTEND_URL=http://localhost:3000
\`\`\`

### 3. Database Setup

Make sure MongoDB is running on your system or update the \`DATABASE_URL\` to point to your MongoDB instance.

### 4. Start Development Server

\`\`\`bash
# Development mode with hot reload
npm run start:dev

# Production build
npm run build
npm run start:prod
\`\`\`

## 📖 API Documentation

Once the server is running, you can access:

- **API Documentation**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/api/v1/health

## 🗂 Project Structure

\`\`\`
src/
├── common/                 # Shared utilities and types
│   ├── dto/               # Common DTOs
│   └── types.ts           # TypeScript interfaces
├── config/                # Configuration files
├── modules/               # Feature modules
│   ├── auth/             # Authentication & authorization
│   ├── users/            # User management
│   ├── companies/        # Account management
│   ├── invoices/         # Invoice operations
│   ├── quotations/       # Quotation management
│   ├── inventory/        # Product/service catalog
│   ├── expenses/         # Expense tracking
│   ├── staff/            # Staff management
│   └── analytics/        # Business analytics
├── app.module.ts         # Root application module
└── main.ts              # Application entry point
\`\`\`

## 🔧 Available Scripts

\`\`\`bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debugging

# Building
npm run build              # Build for production
npm run start:prod         # Start production server

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run end-to-end tests

# Code Quality
npm run lint               # Run ESLint
npm run format             # Format code with Prettier

# Database
npm run migration:generate # Generate new migration
npm run migration:run      # Run pending migrations
npm run seed               # Seed initial data
\`\`\`

## 🔐 Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## 👥 User Roles

- **Admin**: Full system access
- **Manager**: Account management and staff oversight
- **Staff**: Limited access to assigned features

## 🌐 API Endpoints

### Authentication
- \`POST /api/v1/auth/register\` - User registration
- \`POST /api/v1/auth/login\` - User login
- \`POST /api/v1/auth/refresh\` - Refresh token
- \`POST /api/v1/auth/logout\` - Logout

### Users
- \`GET /api/v1/users\` - List users
- \`GET /api/v1/users/profile\` - Get current user profile
- \`PUT /api/v1/users/profile\` - Update profile

### Companies
- `GET /api/v1/companies/:id` - Get account details
- `PUT /api/v1/companies/:id` - Update account
- `POST /api/v1/companies/:id/logo` - Upload account logo
- `DELETE /api/v1/companies/:id/logo` - Delete account logo
- `POST /api/v1/companies/:id/templates` - Upload custom PDF template
- `GET /api/v1/companies/:id/templates` - Get custom templates
- `PUT /api/v1/companies/:id/templates/:templateId` - Update template
- `DELETE /api/v1/companies/:id/templates/:templateId` - Delete template

### Invoices
- `GET /api/v1/invoices` - List invoices
- `POST /api/v1/invoices` - Create invoice
- `GET /api/v1/invoices/:id` - Get invoice
- `PUT /api/v1/invoices/:id` - Update invoice
- `DELETE /api/v1/invoices/:id` - Delete invoice

## 🧪 Testing

\`\`\`bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
\`\`\`

## 📦 Deployment

### Using Docker

\`\`\`bash
# Build image
docker build -t streamline-suite-api .

# Run container
docker run -p 3001:3001 --env-file .env streamline-suite-api
\`\`\`

### Environment Variables for Production

Ensure these are set in production:
- \`NODE_ENV=production\`
- \`DATABASE_URL\` (MongoDB connection string)
- \`JWT_SECRET\` (secure random string)
- \`FRONTEND_URL\` (your frontend domain)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature/new-feature\`
3. Commit changes: \`git commit -am 'Add new feature'\`
4. Push to branch: \`git push origin feature/new-feature\`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@streamlinesuite.com or open an issue in the repository.