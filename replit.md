# PolyLearn - Language Learning Platform

## Overview

PolyLearn is a comprehensive language learning platform that provides an immersive and gamified experience for users to master new languages. The application features three distinct learning modes: passive listening ("Lazy Listen"), interactive guided practice, and voice-based speaking exercises. Built with modern web technologies, it offers a scalable architecture supporting multiple languages with real-time progress tracking, achievements, and gamification elements.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern component patterns
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Library**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful API with structured JSON responses
- **Middleware**: Custom request logging, error handling, and CORS support
- **Development**: Hot module replacement with Vite integration

### Database & ORM
- **Database**: PostgreSQL for reliable relational data storage
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Schema**: Comprehensive relational model supporting users, languages, lessons, progress tracking, and achievements
- **Migrations**: Automated schema migrations with Drizzle Kit

### Data Models
- **Users**: Profile management with XP, streaks, and level progression
- **Languages**: Multi-language support with metadata (speakers, regions, descriptions)
- **Lessons**: Flexible JSON-based content structure supporting different learning modes
- **Progress Tracking**: Per-user, per-language progress with completion metrics
- **Achievements**: Gamification system with unlockable badges and XP rewards

### Learning System
- **Three Learning Modes**: 
  - Listen mode for passive absorption
  - Guide mode for interactive practice with feedback
  - Speak mode with speech recognition integration
- **Content Management**: Dynamic lesson content with flexible JSON structure
- **Progress Analytics**: Real-time tracking of user engagement and completion rates

### Audio & Speech Features
- **Text-to-Speech**: Browser Web Speech API integration for pronunciation
- **Speech Recognition**: Real-time voice input processing with language-specific recognition
- **Audio Playback**: Custom audio controls for lesson content

### Styling & Design
- **Design System**: Custom CSS variables for consistent theming
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Animations**: Smooth transitions and loading states
- **Accessibility**: ARIA-compliant components with keyboard navigation support

## External Dependencies

### Core Framework Dependencies
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React router
- **react**: Frontend framework (v18+)
- **express**: Backend web framework

### Database & ORM
- **drizzle-orm**: Type-safe ORM for database operations
- **drizzle-zod**: Schema validation integration
- **@neondatabase/serverless**: PostgreSQL database driver
- **connect-pg-simple**: PostgreSQL session store

### UI Component Libraries
- **@radix-ui/react-***: Comprehensive set of accessible UI primitives
- **class-variance-authority**: Type-safe CSS variant management
- **tailwindcss**: Utility-first CSS framework
- **clsx**: Conditional CSS class utility

### Form & Validation
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Runtime type validation

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for production

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation
- **embla-carousel-react**: Carousel component for lesson navigation