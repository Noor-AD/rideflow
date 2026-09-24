# 🚕 RideFlow - Real-Time Taxi Booking & Fleet Mobility Platform

RideFlow is an end-to-end, full-stack mobility platform featuring real-time ride booking, live driver GPS tracking, OTP trip verification, in-app messaging, digital wallet payments, and an administrative fleet dashboard.

---

## 🏗️ System Architecture

```text
               ┌────────────────────────────────────────────────────────┐
               │                 React Native Mobile App                │
               │            (Rider Booking & Driver Terminal)           │
               └───────────────────────────┬────────────────────────────┘
                                           │ REST & WebSockets (STOMP)
                                           ▼
┌──────────────────────┐        ┌───────────────────────┐        ┌───────────────────────┐
│   Admin Dashboard    │───────▶│  Spring Boot Backend  │◀───────│ PostgreSQL & Redis DB │
│ (React + Vite + TS)  │  REST  │  (Security, JWT, WS)  │        │   (Persistence/Cache) │
└──────────────────────┘        └───────────────────────┘        └───────────────────────┘
```

---

## ⚡ Core Features

- **Passenger Flow**: Instant ride booking, estimated fare calculation, pickup/drop-off route mapping, 4-digit ride start OTP, live driver telemetry, and trip rating.
- **Driver Partner Flow**: Duty toggle (Online/Offline), incoming dispatch alerts, navigation tracking, trip acceptance, OTP-verified trip starts, and trip completion.
- **Real-Time Telemetry & STOMP**:
  - `/topic/rides/{rideId}/location`: Live driver GPS coordinates broadcast.
  - `/topic/rides/{rideId}/chat`: In-app real-time passenger-driver chat.
  - `/topic/drivers/requests`: Dynamic ride dispatch notifications.
- **Fintech & Digital Wallet**: In-app wallet ledger, Razorpay gateway integration, balance top-ups, transaction receipts, and driver commission splits.
- **Admin Control Tower**: Driver document verification, ride lifecycle audits, fleet revenue reporting, and user moderation.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Java 21, Spring Boot 4.x, Spring Security (JWT), Spring Data JPA, Spring WebSocket (STOMP), Hibernate |
| **Databases** | PostgreSQL (Relational schema), Redis (High-speed caching & sessions) |
| **Mobile App** | React Native, Expo, TypeScript, Axios, StompJS, SockJS, Lucide React Native |
| **Admin Dashboard** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons |
| **Infrastructure** | Docker, Railway / Render, Maven |

---

## 📁 Repository Structure

```text
rideflow/
├── backend/                  # Spring Boot REST API & WebSocket Server
│   ├── src/main/java/        # Controllers, Services, Entities, Repositories
│   ├── src/main/resources/   # application.properties & static assets
│   ├── Dockerfile            # Multi-stage production container build
│   └── pom.xml               # Maven project dependencies
├── mobile/                   # React Native Expo Mobile App
│   ├── src/screens/          # Rider, Driver, Auth, Wallet, and Chat screens
│   ├── src/api/              # Axios REST client & STOMP WebSocket service
│   ├── src/types/            # Strongly-typed TypeScript domain models
│   └── package.json
├── admin-dashboard/          # React + Vite Fleet Administration Web Portal
│   ├── src/                  # Analytics, Driver verification, Ride monitoring
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **JDK 21**
- **Node.js** (v18+) & **npm**
- **PostgreSQL** running on port `5432` (database named `rideflow_db`)
- **Redis** running on port `6379`

### 2. Start the Backend
```bash
cd backend
./mvnw clean spring-boot:run
```
*Backend runs on `http://localhost:8080` (WebSocket handshake endpoint: `ws://localhost:8080/ws`).*

### 3. Run the Mobile App
```bash
cd mobile
npm install
npx expo start
```
*Press `a` for Android Emulator, `i` for iOS Simulator, or scan the QR code using the Expo Go app on your physical device.*

### 4. Run the Admin Dashboard
```bash
cd admin-dashboard
npm install
npm run dev
```
*Access dashboard at `http://localhost:5173`.*

---

## ☁️ Cloud Deployment (Railway)

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit with full platform architecture"
   git branch -M main
   git remote add origin https://github.com/<your-username>/rideflow.git
   git push -u origin main
   ```

2. **Deploy on Railway**:
   - Create a project on [Railway](https://railway.app).
   - Provision **PostgreSQL** and **Redis**.
   - Connect your GitHub repository with root directory set to `/backend`.
   - Railway will automatically detect `backend/Dockerfile` and deploy the Spring Boot service.

---

## 🛡️ License

This project is open-source and available under the [MIT License](LICENSE).
