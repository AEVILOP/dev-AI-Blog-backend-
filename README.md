# ⚙️ Dev-AI-Blog Backend

> REST API powering authentication, blog management, and AI API integration.

---

## 🌐 Live API

👉 https://dev-ai-blog-backend.onrender.com

---

## 📌 Overview

This backend provides the core infrastructure for the Dev-AI-Blog platform.

It handles:

* User authentication and authorization
* Blog data management
* Integration with AI APIs for content generation
* Structured API request handling

---

## 🛠️ Tech Stack

| Layer     | Technology    |
| --------- | ------------- |
| Runtime   | Node.js       |
| Framework | Express.js    |
| Database  | MongoDB Atlas |
| Auth      | JWT           |
| Security  | Rate Limiting |
| Hosting   | Render        |

---

## 🔥 Features

* 🔐 JWT Authentication & Authorization
* 👤 User-specific blog access
* 📝 Blog CRUD APIs
* ⚡ RESTful API design
* 🛡️ Route-level rate limiting
* ❗ Centralized error handling
* 📦 Modular backend architecture

---

## 📡 API Endpoints

### Auth Routes

```
POST   /api/auth/register  
POST   /api/auth/login  
```

### Blog Routes

```
GET    /api/blogs  
POST   /api/blogs  
PUT    /api/blogs/:id  
DELETE /api/blogs/:id  
```

---

## 🧪 Request Flow

```
Client → Request  
       → Rate Limiter  
       → Auth Middleware  
       → Controller  
       → Database  
       → Response  
```

---

## 🧠 Key Engineering Decisions

* Used JWT for stateless authentication
* Structured project into controllers, routes, and middleware
* Applied rate limiting on critical endpoints to prevent abuse
* Designed RESTful APIs for maintainability and clarity

---

## 🧪 API Testing

Tested using Postman for authentication and blog endpoints.

---

## 🏗️ Installation

```bash
git clone https://github.com/AEVILOP/dev-AI-Blog-backend.git
cd dev-AI-Blog-backend
npm install
```

---

## 🔑 Environment Variables

```env
MONGO_URI=your_mongodb_uri  
JWT_SECRET=your_secret  
PORT=5000  
NODE_ENV=development  
```

---

## ▶️ Run Server

```bash
npm run dev
```

---

## 📁 Project Structure

```
├── config/
├── controllers/
├── models/
├── routes/
├── middleware/
├── utils/
└── server.js
```

---

## ⚠️ Limitations

* In-memory rate limiting (not suitable for distributed systems)
* No caching layer (Redis not implemented yet)
* No centralized logging or monitoring
* Basic request validation

---

## 🔮 Future Improvements

* 🚀 Redis-based rate limiting
* 📊 Logging & monitoring
* ⚡ Caching layer
* 🔐 Role-based access control
* 🧪 Automated testing

---

## 🤝 Contributing

Fork → Improve → Pull Request

---

## 📜 License

MIT License

---

## 👨‍💻 Author

**Anirban Banerjee**
https://github.com/AEVILOP

---

## ⭐ Support

Star the repo if you find it useful!
