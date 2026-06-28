```markdown
# 🛡️ Cyber Incident Report Manager - (Purple Team )

A full-stack web application designed to streamline cybersecurity incident reporting and management. The system enables organizations and security teams to record, track, update, and manage cyber incidents through a centralized dashboard, improving incident response and operational efficiency.

---

## 📖 Overview

Cyber Incident Report Manager provides a structured platform for managing cybersecurity incidents throughout their lifecycle. It allows users to create incident reports, classify incidents based on severity and type, monitor investigation progress, and maintain historical records for future analysis.

The project demonstrates full-stack web development skills while applying cybersecurity concepts such as incident handling, risk assessment, and incident lifecycle management.

---

## 🚀 Features

- Create new cyber incident reports
- View all reported incidents in a centralized dashboard
- Update existing incident information
- Delete incident records
- Real NVD API Used 
- Categorize incidents by type
- Assign severity levels (Low, Medium, High, Critical)
- Track incident status
- Search and filter incidents
- Responsive and user-friendly interface
- RESTful API integration
- Persistent data storage using MongoDB

---

## 🛠️ Tech Stack

### Frontend
- React.js
- JavaScript
- HTML5
- CSS3

### Backend
- Node.js
- Express.js

### Database
- MongoDB

### Tools
- Git
- GitHub
- REST APIs
- npm

---

## 📂 Project Structure

```

Cyber-Incident-Report-Manager/
│
├── client/                 # React Frontend
│   ├── public/
│   ├── src/
│   └── package.json
│
├── server/                 # Node.js Backend
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── config/
│   └── server.js
│
├── README.md
└── package.json

````

---

## ⚙️ Installation

### Clone the repository

```bash
git clone https://github.com/shivm2003/Cyber-Incident-Report-Manager.git
````

Move into the project directory

```bash
cd Cyber-Incident-Report-Manager
```

---

### Install Backend Dependencies

```bash
cd server
npm install
```

---

### Install Frontend Dependencies

```bash
cd ../client
npm install
```

---

## 🔧 Environment Variables

Create a `.env` file inside the server directory.

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string
```

---

## ▶️ Run the Project

### Start Backend

```bash
cd server
npm start
```

### Start Frontend

```bash
cd client
npm start
```

The application will be available at:

```
Frontend:
http://localhost:3000

Backend:
http://localhost:5000
```

---

## 📊 Incident Workflow

```
Report Incident
        │
        ▼
Store in Database
        │
        ▼
Assign Severity
        │
        ▼
Investigation
        │
        ▼
Update Status
        │
        ▼
Resolve Incident
```

---

## 📌 Example Incident Fields

| Field         | Description                             |
| ------------- | --------------------------------------- |
| Title         | Incident title                          |
| Description   | Detailed information                    |
| Incident Type | Malware, Phishing, DDoS, Insider Threat |
| Severity      | Low / Medium / High / Critical          |
| Status        | Open / In Progress / Resolved / Closed  |
| Reported By   | Reporter details                        |
| Date          | Incident timestamp                      |

---

## 🎯 Learning Outcomes

This project helped strengthen skills in:

* Full-Stack MERN Development
* REST API Development
* MongoDB Database Design
* CRUD Operations
* Cybersecurity Incident Management
* Incident Lifecycle
* Backend Architecture
* Frontend State Management
* Git Version Control

---

## 🔮 Future Enhancements

* User Authentication (JWT)
* Role-Based Access Control (RBAC)
* Email Notifications
* File Attachments
* Dashboard Analytics
* Incident Timeline
* Audit Logs
* PDF Report Generation
* Dark Mode
* Docker Deployment
* Cloud Deployment

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature-name
```

3. Commit your changes

```bash
git commit -m "Add new feature"
```

4. Push the branch

```bash
git push origin feature-name
```

5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Shivam Mishra**

GitHub: https://github.com/shivm2003

Link: - (https://www.linkedin.com/in/shivam-mishra-8b3091290/?skipRedirect=true)

Email: 2003shivam1990@gmail.com

---

## ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub. Your support helps improve the project and encourages future development.

```
```
