# Tense Annotation Tool

A web application for annotating English tense-aspect structures in learner texts. This tool allows annotators to analyze and mark tenses in texts of different CEFR levels.

## Features

- User authentication (admin and annotator roles)
- CEFR level-based text selection
- Tense annotation with correctness marking
- Auto-saving annotations
- Admin dashboard for monitoring progress
- CSV data export functionality

## Tech Stack

- Next.js 15.1.7
- React 19
- Supabase (Authentication & Database)
- TypeScript
- Tailwind CSS
- shadcn/ui components

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/fatihbozdag/annotator.git
   cd annotator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Set up the database:
   - Create a new Supabase project
   - Run the SQL script in `src/lib/supabase/schema.sql` in your Supabase SQL editor

5. Process the data:
   - Place your `efcamdat_clean.csv` file in the `public` directory
   - Run the data processing script:
   ```bash
   npm run process-csv
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

- `/src/app` - Next.js pages and routing
- `/src/components` - React components
- `/src/lib` - Utility functions and configurations
- `/src/scripts` - Data processing scripts
- `/public` - Static files and data

## Database Schema

### Profiles Table
- `id` (uuid, primary key)
- `email` (text, unique)
- `role` (text, 'admin' or 'annotator')
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Annotations Table
- `id` (uuid, primary key)
- `annotator_id` (uuid, foreign key)
- `sentence` (text)
- `target_tense` (text)
- `is_correct` (boolean)
- `notes` (text)
- `cefr_level` (text)
- `original_text` (text)
- `learner_id` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
