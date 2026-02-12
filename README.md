# Wedding Ledger (신혼부부 가계부)

신혼부부를 위한 자산 관리 및 가계부 웹 애플리케이션입니다.

## 🚀 Key Features

-   **Dashboard**: 전체 자산(현금 + 적금 + 주식) 현황 및 월별 수입/지출 추이 시각화
-   **Asset Management**: 통장(계좌) 관리 및 초기 잔액 설정
-   **Stocks**: 야후 파이낸스 API 연동 실시간 주가 조회 및 포트폴리오 관리
-   **Ledger**: 월별 수입/지출 내역 기입 및 카테고리별 통계
-   **Budget**: 카테고리별 월 예산 설정 및 지출 달성률 확인

## 🛠️ Tech Stack

-   **Frontend**: React, TypeScript, Vite, Tailwind CSS, Recharts
-   **Backend**: Node.js, Express, SQLite (better-sqlite3)
-   **External API**: Yahoo Finance (yahoo-finance2)

## 📦 Installation & Setup

이 프로젝트는 `client`(프론트엔드)와 `server`(백엔드)로 구성되어 있습니다.

### Prerequisites

-   Node.js (v18 이상 권장)
-   npm

### 1. Backend Setup

서버는 3000번 포트에서 실행됩니다. SQLite DB는 자동으로 생성됩니다.

```bash
cd server
npm install
```

### 2. Frontend Setup

클라이언트는 Vite를 통해 5173번(기본값) 포트에서 실행됩니다.

```bash
cd client
npm install
```

## ▶️ Running the App

터미널을 2개 열어서 각각 실행해주세요.

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
# Server running on http://localhost:3000
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
# App accessible at http://localhost:5173
```

## 📂 Project Structure

```
wedding-ledger/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── api/            # Axios API Clients
│   │   ├── components/     # Reusable UI Components
│   │   ├── pages/          # Page Components (Dashboard, Accounts, etc.)
│   │   └── ...
├── server/                 # Express Backend
│   ├── src/
│   │   ├── db/             # Database Schema & Connection
│   │   ├── routes/         # API Endpoints
│   │   └── services/       # External Services (Yahoo Finance)
│   └── ledger.db           # SQLite Database File (auto-generated)
└── ...
```

## ✅ Verification

전체 시스템이 정상 작동하는지 확인하려면 서버 디렉토리에서 통합 테스트를 실행할 수 있습니다.

```bash
cd server
npm install axios # 테스트 스크립트 의존성 (필요시)
node verify-full-flow.js
```
