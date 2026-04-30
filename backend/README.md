# AI Course Buddy Backend

This is the Express.js backend for the AI Course Buddy application, replacing the Supabase Edge Functions.

## Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with the following variables:
   ```
   PORT=3001
   JWT_SECRET=your_secure_jwt_secret_here
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_gmail_app_password
   ```

### Email Setup (Optional but Recommended)

To enable **real OTP email sending** via Gmail:

#### Step 1: Enable 2-Step Verification
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click "Security" in the left sidebar
3. Find "2-Step Verification" and click it
4. Follow the prompts to enable 2-Step Verification

#### Step 2: Generate Gmail App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - You must have 2-Step Verification enabled
2. Select "Mail" for the app
3. Select "Windows Computer" (or your device) for the device
4. Google will generate a 16-character password like: `abcd efgh ijkl mnop`
5. **Copy this password** (without spaces)

#### Step 3: Update backend/.env
Open `backend/.env` and set:
```
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=abcdefghijklmnop
```

**Example:**
```
EMAIL_USER=coursesupport@gmail.com
EMAIL_PASS=pyoc jsqb agcr xyzw
```

#### Step 4: Restart the Backend
```bash
npm run dev
# or
node server.js
```

You should see:
```
✓ Email server ready
Email transporter configured with: coursesupport@gmail.com
```

#### Verification
1. Sign up a new user with any email
2. Check that email's inbox for the OTP verification code
3. Use the OTP to verify the account

#### Troubleshooting

**"EMAIL_USER and EMAIL_PASS not configured"**
- Ensure `.env` is in the `backend/` folder (not root)
- Check that EMAIL_USER and EMAIL_PASS have values
- Restart the backend after changes

**"Email configuration error"**
- Verify 2-Step Verification is enabled on Gmail
- Verify the app password is correct (no spaces)
- Regenerate the app password and try again

**"Failed to send OTP email"**
- Check that the recipient email is valid
- Verify Gmail account is not locked/restricted
- Check backend logs for error details

#### Local Development Mode
If you don't set EMAIL_USER and EMAIL_PASS:
- OTPs are logged in the backend console
- Perfect for testing without Gmail setup
- Example: `OTP email not sent (local mode): 123456 to test@example.com`
- Use the logged OTP to verify accounts

#### Security Notes
- **NEVER commit `.env` to version control**
- App Passwords are less secure than your main Gmail password but safer than sharing your main password
- Each app password is specific to this application
- You can revoke app passwords anytime in Gmail settings

4. Start the development server:
   ```bash
   npm run dev
   ```

The backend will run on `http://localhost:3001`.

## API Endpoints

### POST /api/exam-time-generate
Generates exam preparation content based on syllabus content.

**Request Body:**
```json
{
  "syllabusContent": "string",
  "section": "questions" | "quiz" | "mcq" | "videos" | "summary"
}
```

**Response:**
```json
{
  "result": "generated content"
}
```

### POST /api/student-time-generate
Generates student learning resources for a topic.

**Request Body:**
```json
{
  "topic": "string",
  "resourceType": "quiz" | "homework" | "speech" | "videos" | "research" | "qa"
}
```

**Response:**
```json
{
  "result": "generated content"
}
```

### GET /health
Health check endpoint.

## Running with Frontend

To run both frontend and backend together:

1. Install backend dependencies:
   ```bash
   npm run backend:install
   ```

2. Run both services:
   ```bash
   npm run dev:full
   ```

This will start the backend on port 3001 and the frontend on port 5173 (default Vite port).