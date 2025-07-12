# Personal Portfolio Website

## Overview

This is a full-stack personal portfolio website built using modern web technologies. The application showcases a professional portfolio for an Electrical and Electronics Engineering student specializing in AI/ML development. It features a clean, responsive design with smooth animations and a comprehensive display of skills, projects, education, and contact information.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: Radix UI components with shadcn/ui design system
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **Animations**: CSS-based animations with Intersection Observer for scroll-triggered effects

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: Express sessions with PostgreSQL session store
- **API Structure**: RESTful API with `/api` prefix

### Development Setup
- **Monorepo Structure**: Shared code between client and server
- **Development Server**: Vite dev server with HMR integration
- **Build Process**: Separate client and server builds using Vite and esbuild
- **Type Safety**: Shared TypeScript types between frontend and backend

## Key Components

### Client-Side Components
- **Portfolio Sections**: Hero, About, Skills, Projects, Experience, Education, Contact, Footer
- **UI Components**: Comprehensive shadcn/ui component library including buttons, cards, forms, navigation, and more
- **Responsive Design**: Mobile-first approach with Tailwind CSS breakpoints
- **Accessibility**: ARIA labels and keyboard navigation support

### Server-Side Components
- **Storage Interface**: Abstracted storage layer with in-memory implementation
- **User Management**: Basic user schema with authentication capabilities
- **Route Registration**: Modular route system for API endpoints
- **Middleware**: Request logging, error handling, and CORS support

### Shared Components
- **Database Schema**: Drizzle ORM schemas with Zod validation
- **Type Definitions**: Shared TypeScript interfaces and types
- **Validation**: Schema validation using Zod and drizzle-zod integration

## Data Flow

1. **Client Requests**: React components make API calls using TanStack Query
2. **Server Processing**: Express routes handle requests and interact with storage layer
3. **Database Operations**: Drizzle ORM manages database queries and transactions
4. **Response Handling**: Server returns JSON responses with proper error handling
5. **State Management**: TanStack Query manages caching and synchronization

## External Dependencies

### Frontend Dependencies
- **UI Framework**: React, React DOM
- **UI Components**: Radix UI primitives, Lucide React icons
- **Styling**: Tailwind CSS, class-variance-authority, clsx
- **Forms**: React Hook Form with Hookform resolvers
- **Data Fetching**: TanStack React Query
- **Utilities**: date-fns, wouter, cmdk

### Backend Dependencies
- **Server Framework**: Express.js
- **Database**: Drizzle ORM, @neondatabase/serverless
- **Session Management**: connect-pg-simple
- **Validation**: Zod, drizzle-zod
- **Development**: tsx, esbuild

### Development Dependencies
- **Build Tools**: Vite, TypeScript, PostCSS, Autoprefixer
- **Linting**: ESLint configuration
- **Database**: Drizzle Kit for migrations and schema management

## Deployment Strategy

### Production Build
- **Client Build**: Vite builds optimized static assets to `dist/public`
- **Server Build**: esbuild bundles server code to `dist/index.js`
- **Asset Serving**: Express serves static files in production mode

### Environment Configuration
- **Development**: Hot module replacement with Vite dev server
- **Production**: Optimized builds with code splitting and asset optimization
- **Database**: Environment-based connection strings with Neon Database

### Scripts
- `dev`: Development server with hot reloading
- `build`: Production build for both client and server
- `start`: Production server startup
- `check`: TypeScript type checking
- `db:push`: Database schema deployment

The application is designed to be deployed on platforms like Replit, Vercel, or similar services with automatic PostgreSQL database provisioning and environment variable management.