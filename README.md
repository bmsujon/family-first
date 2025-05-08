# FamilyMatters Web Application

## 1. Overview

FamilyMatters is a responsive web-based solution designed to help multi-generational families manage their household responsibilities, finances, health-related tasks, and daily activities. It aims to be a comprehensive family management web application assisting users in tracking and organizing various aspects of family life. The application is designed with Progressive Web App (PWA) capabilities for offline functionality.

For more details, please refer to the [Software Requirements Specification (SRS)](docs/SRS.md).

## 2. Features

The application aims to include the following key features:

- **User Account Management:** Registration, login, profile management. (SRS §3.2.1)
- **Family Management:** Create families, add/remove members, manage roles. (SRS §3.2.1)
- **Task Management:** Create, assign, update, and delete tasks. (SRS §3.2.5, [docs/PRIORITY_LIST.md](docs/PRIORITY_LIST.md))
- **Calendar and Scheduling:** Manage events and view tasks in a calendar. (SRS §3.2.6)
- **Health Management:** Track health profiles, vital statistics, and appointments. (SRS §3.2.2, [docs/PRIORITY_LIST.md](docs/PRIORITY_LIST.md))
- **Financial Management:** Manage budgets, track income/expenses. (SRS §3.2.3)
- **Notifications and Alerts:** In-app, browser, and email notifications for key events. (SRS §3.2.7, [docs/PRIORITY_LIST.md](docs/PRIORITY_LIST.md))
- **Real-time Updates:** Using WebSockets for live updates on tasks, members, etc. ([docs/PRIORITY_LIST.md](docs/PRIORITY_LIST.md))
- **Offline Functionality:** PWA capabilities with local data storage (IndexedDB) and synchronization. (SRS §3.2.9, [docs/TaskList.md](docs/TaskList.md))
- **Reporting and Analytics:** Generate summaries and insights on finances, health, and tasks. (SRS §3.2.8)

For a detailed feature list and development priorities, see the [Feature Priority List](docs/PRIORITY_LIST.md) and [Task List](docs/TaskList.md).

## 3. Technology Stack

The project utilizes a modern technology stack:

- **Frontend:**
  - Framework: React 18+ ([frontend/README.md](frontend/README.md))
  - State Management: Redux with Redux Toolkit
  - UI Component Library: Material-UI (MUI)
  - Language: TypeScript
  - Offline Capabilities: Service Workers, IndexedDB
- **Backend:**
  - Framework: Express.js on Node.js ([backend/src/server.ts](backend/src/server.ts))
  - Language: TypeScript
  - Database: MongoDB ([docs/Technical_Requirements.md](docs/Technical_Requirements.md) §3.1)
  - Real-time Communication: Socket.io
- **DevOps & Tools:**
  - Containerization: Docker ([docker-compose.yml](docker-compose.yml))
  - CI/CD: GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml))
  - Testing: Jest, Cypress, React Testing Library
  - Linting/Formatting: ESLint, Prettier

For more details on the architecture and technology choices, refer to the [Technical Requirements Document](docs/Technical_Requirements.md).

## 4. Project Structure

The project is organized into the following main directories:

```
.
├── .github/              # GitHub Actions workflows
├── backend/              # Node.js/Express backend application
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json     # TypeScript configuration for backend
├── docs/                 # Project documentation (SRS, Technical Requirements, etc.)
├── frontend/             # React frontend application
│   ├── public/
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   ├── README.md         # Frontend specific README
│   └── tsconfig.json     # TypeScript configuration for frontend
├── docker-compose.yml    # Docker Compose configuration
└── README.md             # This file
```

## 5. Getting Started

### Prerequisites

- Node.js (latest LTS version recommended)
- npm or yarn
- Docker and Docker Compose (for containerized setup)

### Installation & Running Locally

**Backend:**

```bash
cd backend
npm install
# Create a .env file based on .env.example or environment variables in docs
# Example .env content:
# PORT=5000
# MONGO_URI=mongodb://localhost:27017/familymatters
# JWT_SECRET=your_jwt_secret
# FRONTEND_URL=http://localhost:3000
npm run dev # Or your script for starting the dev server (e.g., from backend/package.json)
```

**Frontend:**

```bash
cd frontend
npm install
npm start # (Usually starts on http://localhost:3000)
```

### Running with Docker Compose

This is the recommended way to run the entire application stack (frontend, backend, database).

1.  Ensure Docker and Docker Compose are installed.
2.  Configure environment variables:

    - The backend service in `docker-compose.yml` might require environment variables. You can set them directly in the `docker-compose.yml` file or use an `.env` file in the `backend` directory (e.g., `backend/.env`). Refer to [`docs/Technical_Requirements.md`](docs/Technical_Requirements.md) (section 8.3) for required variables like `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`.
    - The `FRONTEND_URL` in the backend's environment should point to where the frontend is accessible from the user's browser (e.g., `http://localhost:3000` if that's how Docker exposes it).
    - The `MONGO_URI` for the backend should point to the MongoDB service name defined in `docker-compose.yml` (e.g., `mongodb://mongo:27017/familymatters`).

3.  From the project root directory:

```bash
docker-compose up --build
```

The application should then be accessible, typically with the frontend at `http://localhost:3000` and the backend API at `http://localhost:5000` (ports might vary based on your `docker-compose.yml` and local setup).

## 6. Available Scripts

Common scripts are available in both the `frontend` and `backend` `package.json` files.

**Backend (`backend/package.json`):**

- `npm run build`: Compiles TypeScript to JavaScript.
- `npm start`: Starts the production server (after building).
- `npm run dev`: Starts the development server with hot reloading.
- `npm test`: Runs tests.

**Frontend (`frontend/package.json`):**

- `npm start`: Runs the app in development mode.
- `npm test`: Launches the test runner in interactive watch mode.
- `npm run build`: Builds the app for production.
- `npm run eject`: Ejects from Create React App (use with caution).

Refer to the respective `package.json` files for a full list of scripts.

## 7. Documentation

Detailed project documentation can be found in the [`docs/`](docs/) directory:

- [Software Requirements Specification (SRS)](docs/SRS.md)
- [Technical Requirements Document](docs/Technical_Requirements.md)
- [Task List](docs/TaskList.md)
- [Feature Priority List](docs/PRIORITY_LIST.md)

## 8. Contributing

Please refer to contribution guidelines if available (e.g., `CONTRIBUTING.md`). Key development practices include:

- Code Reviews & Refactoring
- Writing Unit/Integration/E2E Tests
- Managing Dependencies & Security Patching
- Ensuring UI/UX Consistency & Accessibility
- Updating Documentation

(See "Ongoing Tasks" in [docs/PRIORITY_LIST.md](docs/PRIORITY_LIST.md))

## 9. License

Specify your project's license here (e.g., MIT, Apache 2.0). If no `LICENSE` file is present, consider adding one.
