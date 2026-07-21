# best_code - IT Request Management System

Premium IT Request Management System featuring multi-theme support, custom permission layers, and JWT-based stateless authentication.

## Getting Started

### Backend Setup
1. Configure your virtual host or Apache folder to map to `backend/public/`.
2. Run database migrations:
   ```bash
   php backend/database/migrate.php
   ```

### Frontend Setup
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
