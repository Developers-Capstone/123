# Tourist Safety System

A comprehensive web application designed for hackathon demonstration that provides tourists with emergency SOS functionality, document verification, and safety features.

## 🚀 Features

### Authentication System
- **User Registration & Login** with phone number verification
- **Phone Verification** via Twilio OTP SMS (Account 1)
- **Separate Admin Login** for verification panel
- JWT-based authentication with security middleware

### Document Upload & Verification
- Upload government-issued documents (ID, passport, etc.)
- **Manual verification** by admin team
- Admin dashboard for document approval/rejection
- Only verified users can access SOS features

### Tourist Dashboard
- **Emergency SOS Button** with 3-second press-and-hold activation
- Instant SMS alerts via Twilio (Account 2) with Google Maps location
- **Interactive OpenStreetMap** with safe zones (green) and restricted zones (red)
- Emergency contact management (up to 5 contacts)
- Pre-populated emergency numbers (Police: 100, Ambulance: 108, Fire: 101, Tourist Helpline: 1363)

### Admin Panel
- Document verification management
- User management with verification status
- SOS alert monitoring and status updates
- Dashboard statistics and analytics

### Safety Features
- **Triple SMS alerts** (3 messages sent 2 seconds apart for urgency)
- Real-time geolocation with Google Maps integration
- Offline map fallback system for network issues
- Emergency services location markers
- Safe zone and restricted area warnings

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **Twilio** for SMS (2 separate accounts)
- **Tesseract.js** for OCR processing
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads

### Frontend
- **HTML5, CSS3, JavaScript** (Vanilla JS)
- **Leaflet.js** for interactive maps
- **Font Awesome** for icons
- **Responsive design** with mobile-first approach

### Security & Performance
- **Helmet.js** for security headers
- **Rate limiting** for API protection
- **CORS** configuration
- **Winston** logging system
- **Input validation** and sanitization

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- 2 Twilio accounts:
  - Account 1: OTP verification
  - Account 2: SOS alerts

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd tourist-safety-system
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and configure:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/tourist-safety

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Twilio Account 1 - OTP Verification
TWILIO_ACCOUNT_SID_OTP=your-twilio-account-sid-for-otp
TWILIO_AUTH_TOKEN_OTP=your-twilio-auth-token-for-otp
TWILIO_VERIFY_SERVICE_SID=your-twilio-verify-service-sid
TWILIO_PHONE_NUMBER_OTP=your-twilio-phone-number-for-otp

# Twilio Account 2 - SOS Alerts
TWILIO_ACCOUNT_SID_SOS=your-twilio-account-sid-for-sos
TWILIO_AUTH_TOKEN_SOS=your-twilio-auth-token-for-sos
TWILIO_PHONE_NUMBER_SOS=your-twilio-phone-number-for-sos

# Server
PORT=3000
NODE_ENV=development

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 3. Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 4. Access the Application
- **Main App**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

## 📱 User Flow

### For Tourists:
1. **Register** with email, phone, and tourist type (Indian/Foreign)
2. **Verify phone** number via OTP SMS
3. **Upload document** (Aadhar/Passport) for verification
4. **Wait for admin approval** of documents
5. **Access dashboard** with full SOS functionality
6. **Add emergency contacts** (family, friends)
7. **Use SOS button** in emergencies (sends location + alerts)

### For Admins:
1. **Login** with admin credentials
2. **Review pending documents** 
3. **Approve/reject** documents with notes
4. **Monitor SOS alerts** and update status
5. **Manage users** and view statistics

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/admin/login` - Admin login
- `GET /api/auth/profile` - Get user profile

### Phone Verification
- `POST /api/phone/send-otp` - Send OTP via Twilio
- `POST /api/phone/verify-otp` - Verify OTP

### Documents
- `POST /api/documents/upload` - Upload document 
- `GET /api/documents/my-documents` - Get user documents
- `GET /api/documents/view/:id` - View document image

### Emergency
- `POST /api/emergency/sos` - Send SOS alert
- `GET/POST/PUT/DELETE /api/emergency/contacts` - Manage contacts
- `GET /api/emergency/sos-history` - Get SOS history

### Admin
- `GET /api/admin/documents` - Get all documents
- `POST /api/admin/documents/:id/verify` - Verify document
- `GET /api/admin/users` - Get all users
- `GET /api/admin/sos-alerts` - Get SOS alerts
- `POST /api/admin/sos-alerts/:id/update` - Update SOS status
- `GET /api/admin/dashboard/stats` - Get dashboard statistics

## 🎨 UI Features

### Modern Design
- **Gradient backgrounds** with professional color scheme
- **Responsive layout** optimized for mobile devices
- **Interactive animations** and hover effects
- **Emergency-focused red design** for SOS elements

### User Experience
- **Progress indicators** for multi-step processes
- **Real-time notifications** with auto-dismiss
- **Modal dialogs** for forms and confirmations
- **Loading spinners** for async operations
- **Intuitive navigation** with clear visual hierarchy

## 🔒 Security Features

- **Rate limiting** (100 general, 5 auth, 3 OTP requests)
- **JWT token authentication** with expiration
- **Password hashing** with bcrypt (12 rounds)
- **Input validation** and sanitization
- **CORS protection** with configurable origins
- **Helmet security headers** for XSS protection
- **File upload restrictions** (5MB limit, specific formats)

## 📊 Monitoring & Logging

- **Winston logging** with file persistence
- **Request/response tracking** with duration
- **Error handling** with stack traces
- **Uncaught exception** management
- **Admin dashboard** with real-time statistics

## 🚨 Emergency Features

### SOS Alert System
- **3-second press-and-hold** activation to prevent accidental triggers
- **Triple SMS delivery** (3 messages, 2 seconds apart)
- **Automatic location sharing** via Google Maps links
- **Police notification** to dummy number for demo
- **Contact priority system** (High/Medium/Low)

### Map Integration
- **OpenStreetMap** with Leaflet.js
- **Offline fallback** with SVG-based tiles
- **Safe zones** marked with green circles
- **Restricted areas** marked with red circles
- **Emergency services** with blue markers
- **Real-time user location** tracking

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration with phone verification
- [ ] Document upload with 
- [ ] Admin document verification workflow
- [ ] SOS alert sending and SMS delivery
- [ ] Map functionality with markers
- [ ] Emergency contact management
- [ ] Admin panel statistics and management

### Demo Scenarios
1. **Tourist Registration**: Show complete signup flow
2. **Document Verification**: Upload sample ID and admin approval
3. **SOS Alert**: Demonstrate emergency button and SMS alerts
4. **Admin Management**: Show document review and user management

## 🎯 Hackathon Demo Tips

### Key Demo Points
1. **Show the problem**: Tourist safety concerns
2. **Demonstrate solution**: Complete user journey
3. **Highlight technology**: Twilio integration, real-time maps
4. **Emphasize security**: Verification process, rate limiting
5. **Show scalability**: Admin panel, monitoring, statistics

### Demo Flow (5-7 minutes)
1. **Landing page** overview (30 seconds)
2. **User registration** and phone verification (1 minute)
3. **Document upload** (1 minute)
4. **Admin approval** process (1 minute)
5. **Dashboard tour** with map and contacts (1.5 minutes)
6. **SOS demonstration** (1 minute)
7. **Admin panel** statistics and management (1 minute)

## 📝 Development Notes

### Code Organization
- **Modular architecture** with separate route files
- **Reusable components** and utility functions
- **Consistent error handling** across all endpoints
- **Clean separation** of concerns (auth, business logic, data)

### Scalability Considerations
- **Database indexing** for performance
- **Caching strategies** for frequent queries
- **Load balancing** support with stateless design
- **Microservices ready** architecture

## 🤝 Contributing

This is a hackathon prototype. For production use, consider:
- Enhanced security auditing
- Comprehensive testing suite
- Performance optimization
- Advanced monitoring and alerting
- Multi-language support
- Advanced map features

## 📄 License

MIT License - Built for hackathon demonstration purposes.

---

**Built with ❤️ for tourist safety and emergency response.**
