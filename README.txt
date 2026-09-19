Author: Vyshalini Rajendran
Email: vyshalini.rajendran@vanderbilt.edu

================================================================================
ONE PLACE
================================================================================

One Place is a full-stack web app for discovering, saving, and sharing images.
Users can create accounts, search for images, organize them into boards, edit
notes, share boards with unique links, invite collaborators by username, and
send friend requests to other users.


--------------------------------------------------------------------------------
TECH STACK
--------------------------------------------------------------------------------

Frontend
  - React
  - TypeScript
  - Vite
  - Material UI (MUI)
  - React Router

Backend
  - Node.js
  - Express (separate REST API server)
  - JWT authentication with bcrypt password hashing

Database
  - PostgreSQL (Neon)
  - node-postgres (pg)

External APIs
  - Pixabay (image search, proxied through the backend)


--------------------------------------------------------------------------------
FEATURES
--------------------------------------------------------------------------------

  - User registration and login
  - Image search and save-to-board flow
  - Create, view, edit, and delete boards
  - Public / private board toggle
  - Share boards via unique URL (link collaborators can add images)
  - Invite registered users to edit a board
  - Friends: send, accept, decline, and cancel friend requests


--------------------------------------------------------------------------------
CLONE AND RUN LOCALLY
--------------------------------------------------------------------------------

Prerequisites: Node.js 18+, npm, and Git.

1) Clone the repository

   git clone https://github.com/vysha-exe/YOUR-REPO-NAME.git
   cd YOUR-REPO-NAME

2) Create a Pixabay API key

   - Visit https://pixabay.com/api/docs/
   - Sign in and copy your API key

3) Create a PostgreSQL database

   - Sign up at https://neon.tech and create a free project
   - Copy the connection string from the Neon dashboard
     Example:
     postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

4) Configure the backend

   Create backend/.env (you can copy backend/.env.example) with:

     PORT=3001
     PIXABAY_API_KEY=your_pixabay_key
     JWT_SECRET=any_long_random_string
     DATABASE_URL=postgresql://...your_neon_connection_string...
     CORS_ORIGIN=http://localhost:5173

5) Start the backend (terminal 1)

   cd backend
   npm install
   npm run dev

   API: http://localhost:3001

6) Start the frontend (terminal 2)

   cd frontend
   npm install
   npm run dev

   App: http://localhost:5173

   Leave VITE_API_URL empty for local development. Vite proxies /api requests
   to the backend on port 3001.

7) Open the app

   Visit http://localhost:5173, create an account, search images on Discover,
   save them to boards, and try Friends / sharing from a board page.
