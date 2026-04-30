# AI Course Buddy

An AI-powered course development platform with exam preparation and student learning tools.

## Backend Setup

This project now uses a local Express.js backend instead of Supabase Edge Functions for AI-powered content generation.

### 1. Install Backend Dependencies

```bash
npm run backend:install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cd backend
```

Add the following to `backend/.env`:

```
PORT=3001
JWT_SECRET=your_secure_jwt_secret_here
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

#### Optional: Enable Real Email OTP Sending

To send OTP codes via Gmail instead of just logging them:

1. **Enable 2-Step Verification** on your Gmail account
2. **Generate an App Password**:
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and your device
   - Copy the 16-character password
3. **Add to backend/.env**:
   ```
   EMAIL_USER=yourname@gmail.com
   EMAIL_PASS=abcd efgh ijkl mnop
   ```

**Without Gmail setup**: OTPs will be logged to console for testing.

See `backend/README.md` for detailed email setup instructions.

### 3. Start Development Servers

Run both frontend and backend together:

```bash
npm run dev:full
```

This will start:
- Backend on `http://localhost:3001`
- Frontend on `http://localhost:5173` (default Vite port)

### Alternative: Run Services Separately

**Terminal 1 - Backend:**
```bash
npm run backend:dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## Features

- **Exam Time**: Upload syllabus files and generate exam questions, quizzes, MCQs, video recommendations, and summaries
- **Student Time**: Enter any topic and get learning resources including quizzes, homework, speeches, videos, research ideas, and Q&A
- **AI-Powered**: Uses Lovable AI API for content generation
- **File Support**: Supports .txt, .md, and .docx syllabus files

## API Endpoints

### Exam Time Generation
- **Endpoint**: `POST /api/exam-time-generate`
- **Body**: `{ "syllabusContent": "string", "section": "questions|quiz|mcq|videos|summary" }`

### Student Time Generation
- **Endpoint**: `POST /api/student-time-generate`
- **Body**: `{ "topic": "string", "resourceType": "quiz|homework|speech|videos|research|qa" }`

Both features should now generate AI-powered study materials successfully.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
