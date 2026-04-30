

# AI Course Developer - Implementation Plan

## Overview
A full-stack web application that empowers instructors to create AI-generated courses and enables students to learn with an intelligent AI copilot assistant.

---

## Phase 1: Foundation & Authentication

### Landing Page
- Modern, clean hero section explaining the platform
- Feature highlights showcasing AI capabilities
- Dual call-to-action buttons: "Create Course" (for instructors) and "Start Learning" (for students)
- Testimonials section and footer

### Authentication System
- Email/password signup and login
- Role selection during registration (Instructor or Student)
- Secure role management using a separate `user_roles` table
- Protected routes based on user role

---

## Phase 2: Database & Core Structure

### Database Tables
- **profiles** - User profile information (name, avatar, bio)
- **user_roles** - Role assignments (instructor/student)
- **courses** - Course details (title, description, instructor, status)
- **lessons** - Lesson content within courses
- **enrollments** - Student course enrollments
- **progress** - Student lesson completion tracking
- **quizzes** - AI-generated quiz questions per lesson

---

## Phase 3: Instructor Experience

### Instructor Dashboard
- Overview of created courses with stats
- "Create New Course" workflow

### AI-Powered Course Creation
- Enter course topic/description
- AI generates:
  - Course title and description
  - Lesson structure and content
  - Key summaries for each lesson
  - Quiz questions with answers
- Edit and refine AI-generated content
- Publish/unpublish course controls

---

## Phase 4: Student Experience

### Student Dashboard
- Browse all published courses
- View enrolled courses with progress
- Quick access to continue learning

### Course Learning Pages
- Structured lesson navigation (sidebar)
- Clean, readable lesson content display
- Progress tracking (mark lessons complete)
- Take quizzes after lessons

---

## Phase 5: AI Copilot (Core Feature)

### Floating Chat Widget
- Available on all course/lesson pages
- Context-aware (knows current lesson content)

### Copilot Capabilities
- Explain concepts in simpler terms
- Answer student questions about the material
- Generate relevant examples
- Create practice quizzes on demand
- Provide study tips and summaries

---

## Phase 6: Polish & Enhancements

### User Experience
- Responsive design (mobile + desktop)
- Loading states and smooth transitions
- Toast notifications for actions

### Optional Features (Included)
- Course completion certificates (downloadable)
- Basic admin view for user/course management

---

## Design Approach
- **Style**: Modern & minimal with a professional feel
- **Colors**: Clean palette with accent colors for CTAs
- **Typography**: Clear, readable fonts optimized for learning

---

## Technical Stack
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **AI**: Lovable AI Gateway for content generation and copilot
- **State**: React Query for data fetching

