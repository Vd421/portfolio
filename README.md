# Vaibhav Dhir - Portfolio Website

A professional developer portfolio showcasing AI/ML expertise with modern web technologies.

## Features

- **Modern Design**: Black glossy background with 3D effects and glass morphism
- **Database Integration**: PostgreSQL with portfolio analytics and contact form
- **Project Showcase**: 5 AI/ML projects with GitHub links and interaction tracking
- **Admin Dashboard**: Analytics dashboard with charts and contact message management
- **Responsive Design**: Works on all devices with smooth animations

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS with custom styling
- Radix UI components with shadcn/ui
- Wouter (routing)
- TanStack Query (data fetching)
- Recharts (analytics charts)

### Backend
- Node.js with Express
- PostgreSQL with Drizzle ORM
- Neon Database (serverless PostgreSQL)
- RESTful API design

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file with your database URL:
   ```
   DATABASE_URL=your_postgresql_connection_string
   ```

3. **Database Setup**
   ```bash
   npm run db:push
   ```

4. **Development Server**
   ```bash
   npm run dev
   ```

5. **Production Build**
   ```bash
   npm run build
   npm start
   ```

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                # Backend Express application
│   ├── db.ts             # Database connection
│   ├── storage.ts        # Database operations
│   └── routes.ts         # API routes
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema with Drizzle
└── components.json       # shadcn/ui configuration
```

## API Endpoints

- `GET /api/portfolio/stats` - Portfolio analytics
- `POST /api/portfolio/view` - Track portfolio views
- `POST /api/contact` - Submit contact form
- `GET /api/contact/messages` - Get contact messages
- `POST /api/projects/interaction` - Track project interactions

## Features

### Portfolio Sections
- **Hero**: Introduction with resume download
- **About**: Professional background and interests
- **Skills**: Technical skills with proficiency levels
- **Projects**: AI/ML projects with GitHub links
- **Experience**: Work and leadership experience
- **Education**: Academic background
- **Contact**: Contact form with database storage

### Admin Dashboard
- Visit `/admin` to view analytics
- Portfolio view tracking
- Project interaction statistics
- Contact message management

## Database Schema

- **portfolio_views**: Track page visits and user engagement
- **contact_messages**: Store contact form submissions
- **project_interactions**: Track GitHub clicks and project views
- **skills_data**: Manage technical skills and proficiency levels

## Deployment

The application is ready for deployment on platforms like:
- Replit Deployments
- Vercel
- Netlify
- Railway
- Render

Make sure to set the `DATABASE_URL` environment variable in your deployment platform.

## Contact

- **Email**: vaibhavdhir@example.com
- **LinkedIn**: [LinkedIn Profile](https://linkedin.com/in/vaibhavdhir)
- **GitHub**: [GitHub Profile](https://github.com/vaibhavdhir)

## License

This project is open source and available under the MIT License.