# Tense Annotation Tool

A web application for annotating English tense-aspect structures in learner texts. This tool allows annotators to analyze and mark tenses in texts of different CEFR levels.

## Features

- User authentication (admin and annotator roles)
- CEFR level-based text selection
- Comprehensive tense annotation system with categorized options
- Detailed annotation instructions with examples
- Auto-saving annotations
- Admin dashboard for monitoring progress
- CSV data export functionality
- Progress tracking and statistics

## Annotation Categories

The tool supports the following verb form categories:

### Simple Forms
- Present Simple
- Past Simple
- Future Simple (will)
- Future Simple (going to)

### Continuous Forms
- Present Continuous
- Past Continuous
- Future Continuous

### Perfect Forms
- Present Perfect
- Past Perfect
- Future Perfect
- Present Perfect Continuous
- Past Perfect Continuous
- Future Perfect Continuous

### Modal Forms
- Modal Present (would/could/might/should)
- Modal Past (would have/could have)

### Other Structures
- Conditional (if clause)
- To-infinitive
- Bare infinitive
- Gerund (-ing form)
- Multiple Verbs

## Tech Stack

- Python 3.x
- Streamlit
- Supabase (Authentication & Database)
- Pandas
- Python-dotenv

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/fatihbozdag/annotator.git
   cd annotator
   ```

2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   Create a `.streamlit/secrets.toml` file with your Supabase credentials:
   ```toml
   supabase_url = "your_supabase_url"
   supabase_key = "your_supabase_anon_key"
   ```

5. Set up the database:
   - Create a new Supabase project
   - Run the SQL script in `src/lib/supabase/schema.sql` in your Supabase SQL editor

6. Process the data:
   - Place your `efcamdat_clean.csv` file in the `public` directory

7. Start the Streamlit app:
   ```bash
   streamlit run app.py
   ```

## Project Structure

```
.
├── app.py                 # Main Streamlit application
├── requirements.txt       # Python dependencies
├── .streamlit/           # Streamlit configuration
│   └── secrets.toml      # Secrets configuration
├── public/               # Data files
│   ├── efcamdat_clean.csv
│   └── sampled_data.csv
└── src/
    └── lib/
        └── supabase/
            └── schema.sql # Database schema
```

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
- `notes` (text)
- `cefr_level` (text)
- `original_text` (text)
- `learner_id` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## User Interface

### Annotator View
- Clear instructions with examples for each verb form
- Context-aware annotation interface
- Real-time progress tracking
- Sample size selection
- Notes field for additional observations
- Auto-saving functionality

### Admin Dashboard
- Overview of total annotations and annotators
- Recent annotations display
- Export functionality for all annotations
- User management capabilities

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
