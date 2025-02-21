import streamlit as st
import pandas as pd
from supabase import create_client
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = st.secrets["supabase_url"]
supabase_key = st.secrets["supabase_key"]
supabase = create_client(supabase_url, supabase_key)

# Constants
CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"]

# Group tense options by category for better organization
TENSE_CATEGORIES = {
    "Simple Forms": [
        "Present Simple",
        "Past Simple",
        "Future Simple (will)",
        "Future Simple (going to)",
    ],
    "Continuous Forms": [
        "Present Continuous",
        "Past Continuous",
        "Future Continuous",
    ],
    "Perfect Forms": [
        "Present Perfect",
        "Past Perfect",
        "Future Perfect",
        "Present Perfect Continuous",
        "Past Perfect Continuous",
        "Future Perfect Continuous",
    ],
    "Modal Forms": [
        "Modal Present (would/could/might/should)",
        "Modal Past (would have/could have)",
    ],
    "Other Structures": [
        "Conditional (if clause)",
        "To-infinitive",
        "Bare infinitive",
        "Gerund (-ing form)",
        "Multiple Verbs"
    ]
}

# Flatten tense options for use in selectbox
TENSE_OPTIONS = [tense for category in TENSE_CATEGORIES.values() for tense in category]

def split_into_sentences(text):
    """Split text into sentences using basic punctuation rules."""
    sentences = []
    current = []
    
    for char in text:
        current.append(char)
        if char in '.!?' and len(current) > 0:
            sentences.append(''.join(current).strip())
            current = []
    
    if current:  # Add any remaining text as a sentence
        sentences.append(''.join(current).strip())
    
    return sentences

def load_data():
    """Load and process the CSV data."""
    try:
        df = pd.read_csv('public/sampled_data.csv')
        return df
    except Exception as e:
        st.error(f"Error loading data: {str(e)}")
        return None

def save_annotation(text, sentence_index, tense, cefr_level, user_id, notes="", original_text="", learner_id="unknown"):
    """Save annotation to Supabase."""
    try:
        data = {
            "annotator_id": user_id,
            "sentence": text,
            "target_tense": tense,
            "notes": notes,
            "cefr_level": cefr_level,
            "original_text": original_text,
            "learner_id": learner_id,
            "created_at": datetime.now().isoformat()
        }
        result = supabase.table("annotations").insert(data).execute()
        return True
    except Exception as e:
        st.error(f"Error saving annotation: {str(e)}")
        return False

def register():
    """Handle user registration."""
    with st.form("register_form"):
        st.subheader("Create New Account")
        email = st.text_input("Email")
        password = st.text_input("Password", type="password")
        confirm_password = st.text_input("Confirm Password", type="password")
        submitted = st.form_submit_button("Register")
        
        if submitted:
            if password != confirm_password:
                st.error("Passwords do not match!")
                return False
            
            if len(password) < 6:
                st.error("Password must be at least 6 characters long!")
                return False
            
            try:
                # Sign up the user
                response = supabase.auth.sign_up({
                    "email": email,
                    "password": password
                })
                
                if response.user:
                    st.success("Registration successful! Please check your email to verify your account.")
                    return True
            except Exception as e:
                st.error(f"Registration failed: {str(e)}")
    return False

def login():
    """Handle user login."""
    st.subheader("Login")
    
    # Add tabs for Annotator and Admin login
    tab1, tab2 = st.tabs(["Annotator Login", "Admin Login"])
    
    with tab1:
        with st.form("annotator_login_form"):
            email = st.text_input("Email", key="annotator_email")
            password = st.text_input("Password", type="password", key="annotator_password")
            submitted = st.form_submit_button("Login")
            
            if submitted:
                try:
                    response = supabase.auth.sign_in_with_password({
                        "email": email,
                        "password": password
                    })
                    
                    if response.user:
                        # Check if user is an annotator
                        user_data = supabase.table('profiles').select('role').eq('id', response.user.id).single().execute()
                        if user_data.data and user_data.data['role'] == 'annotator':
                            st.session_state.user = response.user
                            st.session_state.annotator_id = response.user.id
                            st.session_state.user_role = 'annotator'
                            return True
                        else:
                            st.error("This account does not have annotator privileges.")
                except Exception as e:
                    st.error("Login failed. Please check your credentials.")
    
    with tab2:
        with st.form("admin_login_form"):
            email = st.text_input("Email", key="admin_email")
            password = st.text_input("Password", type="password", key="admin_password")
            submitted = st.form_submit_button("Login")
            
            if submitted:
                try:
                    response = supabase.auth.sign_in_with_password({
                        "email": email,
                        "password": password
                    })
                    
                    if response.user:
                        # Check if user is an admin
                        user_data = supabase.table('profiles').select('role').eq('id', response.user.id).single().execute()
                        if user_data.data and user_data.data['role'] == 'admin':
                            st.session_state.user = response.user
                            st.session_state.user_id = response.user.id
                            st.session_state.user_role = 'admin'
                            return True
                        else:
                            st.error("This account does not have admin privileges.")
                except Exception as e:
                    st.error("Login failed. Please check your credentials.")
    
    return False

def admin_dashboard():
    """Display admin dashboard."""
    st.title("Admin Dashboard")
    
    # Add logout button in the top right
    with st.container():
        col1, col2 = st.columns([6, 1])
        with col2:
            if st.button("🚪 Logout", key="admin_logout", use_container_width=True):
                supabase.auth.sign_out()
                st.session_state.clear()
                st.experimental_rerun()
    
    # Display statistics in a nice card layout
    try:
        # Get statistics
        annotations = supabase.table('annotations').select('*', count='exact').execute()
        total_annotations = annotations.count if annotations.count is not None else 0
        
        annotators = supabase.table('profiles').select('*', count='exact').eq('role', 'annotator').execute()
        total_annotators = annotators.count if annotators.count is not None else 0
        
        # Create a card-like container for statistics
        st.markdown("""
        <style>
        .stat-card {
            padding: 20px;
            border-radius: 10px;
            background-color: #f0f2f6;
            margin: 10px 0;
        }
        .stat-label {
            font-size: 14px;
            color: #666;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #1f77b4;
        }
        </style>
        """, unsafe_allow_html=True)

        col1, col2 = st.columns(2)
        with col1:
            st.markdown(f"""
            <div class="stat-card">
                <div class="stat-label">Total Annotations</div>
                <div class="stat-value">{total_annotations}</div>
            </div>
            """, unsafe_allow_html=True)
        with col2:
            st.markdown(f"""
            <div class="stat-card">
                <div class="stat-label">Total Annotators</div>
                <div class="stat-value">{total_annotators}</div>
            </div>
            """, unsafe_allow_html=True)
        
        # Display recent annotations with improved styling
        st.markdown("### 📝 Recent Annotations")
        recent = supabase.table('annotations').select('*').order('created_at', desc=True).limit(10).execute()
        if recent.data:
            df = pd.DataFrame(recent.data)
            # Format the dataframe
            df['created_at'] = pd.to_datetime(df['created_at']).dt.strftime('%Y-%m-%d %H:%M')
            df = df[['sentence', 'target_tense', 'cefr_level', 'notes', 'created_at']]
            df.columns = ['Sentence', 'Tense', 'CEFR', 'Notes', 'Created At']
            st.dataframe(df, use_container_width=True, hide_index=True)
        
        # Export section with improved styling
        st.markdown("### 📊 Export Data")
        if st.button("📥 Export All Annotations", type="primary"):
            all_annotations = supabase.table('annotations').select('*').execute()
            if all_annotations.data:
                df = pd.DataFrame(all_annotations.data)
                csv = df.to_csv(index=False)
                st.download_button(
                    label="💾 Download CSV",
                    data=csv,
                    file_name=f"annotations_export_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
                    mime="text/csv",
                    use_container_width=True
                )
    
    except Exception as e:
        st.error(f"Error loading admin dashboard: {str(e)}")

def main():
    # Set wider layout and custom theme
    st.set_page_config(
        page_title="Tense Annotation Tool",
        page_icon="📝",
        layout="wide",
        initial_sidebar_state="expanded"
    )

    # Custom CSS
    st.markdown("""
    <style>
    .stButton button {
        width: 100%;
    }
    .main .block-container {
        padding-top: 2rem;
    }
    .annotation-box {
        padding: 20px;
        border-radius: 10px;
        background-color: #f8f9fa;
        margin: 10px 0;
    }
    .context-box {
        padding: 15px;
        border-radius: 8px;
        background-color: #e9ecef;
        margin: 10px 0;
        border-left: 4px solid #1f77b4;
    }
    .instruction-box {
        padding: 20px;
        border-radius: 10px;
        background-color: #fff3cd;
        margin: 20px 0;
        border: 1px solid #ffeeba;
    }
    .instruction-title {
        color: #856404;
        font-weight: bold;
        margin-bottom: 10px;
    }
    .instruction-text {
        color: #533f03;
        margin-bottom: 5px;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Initialize session state
    if 'user' not in st.session_state:
        st.session_state.user = None
    if 'user_role' not in st.session_state:
        st.session_state.user_role = None
    if 'current_index' not in st.session_state:
        st.session_state.current_index = 0
    if 'filtered_data' not in st.session_state:
        st.session_state.filtered_data = None
    
    # Login/Register interface
    if not st.session_state.user:
        st.title("📝 Tense Annotation Tool")
        tab1, tab2 = st.tabs(["🔑 Login", "📝 Register"])
        
        with tab1:
            login()
        with tab2:
            register()
        return
    
    # Route to appropriate interface
    if st.session_state.user_role == 'admin':
        admin_dashboard()
    else:
        # Annotator interface
        with st.sidebar:
            st.markdown(f"### 👤 Annotator ID: {st.session_state.annotator_id}")
            
            if st.button("🚪 Logout", use_container_width=True):
                supabase.auth.sign_out()
                st.session_state.clear()
                st.experimental_rerun()
            
            st.markdown("---")
            st.markdown("### 📊 Data Selection")
            
            cefr_level = st.selectbox("CEFR Level", [""] + CEFR_LEVELS)
            sample_size = st.number_input("Sample Size", min_value=1, max_value=1000, value=200)
            
            if st.button("📥 Load Data", type="primary", use_container_width=True):
                if not cefr_level:
                    st.error("Please select a CEFR level")
                    return
                    
                with st.spinner("Loading data..."):
                    df = load_data()
                    if df is not None:
                        filtered_df = df[df['cefr'] == cefr_level].sample(n=min(sample_size, len(df)))
                        processed_data = []
                        
                        for _, row in filtered_df.iterrows():
                            sentences = split_into_sentences(row['text_corrected'])
                            for idx, sentence in enumerate(sentences):
                                processed_data.append({
                                    'text_corrected': row['text_corrected'],
                                    'sentence': sentence,
                                    'sentence_index': idx,
                                    'cefr': row['cefr'],
                                    'learner_id': row['learner_id']
                                })
                        
                        st.session_state.filtered_data = processed_data
                        st.session_state.current_index = 0
                        st.success("Data loaded successfully!")
        
        # Main content
        if st.session_state.filtered_data:
            # Instructions panel
            st.markdown("## 📋 Instructions for Annotators")
            st.markdown("1. Each text is from a learner's writing, corrected for grammar but maintaining the original tense usage.")
            st.markdown("2. Focus on the **Current Sentence** and identify the main verb construction.")
            st.markdown("3. Use the **Context** to understand the temporal setting and choose the appropriate form.")
            
            st.markdown("### 🎯 How to Handle Different Verb Forms")
            
            st.markdown("#### Simple Tenses")
            st.markdown("• Present Simple: 'I work' → Regular present actions")
            st.markdown("• Past Simple: 'I worked' → Completed past actions")
            st.markdown("• Future Simple: 'I will work' or 'I am going to work' → Future plans/predictions")
            
            st.markdown("#### Perfect & Continuous Forms")
            st.markdown("• Present Perfect: 'I have worked' → Past actions with present relevance")
            st.markdown("• Present Continuous: 'I am working' → Ongoing actions")
            st.markdown("• Past Perfect: 'I had worked' → Actions before another past event")
            
            st.markdown("#### Modal Verbs & Conditionals")
            st.markdown("• Modal Present: 'would/could/might/should' + base verb")
            st.markdown("  - 'I would like...' → Modal Present")
            st.markdown("  - 'I could do it' → Modal Present")
            st.markdown("• Modal Past: 'would/could/might/should' + have + past participle")
            st.markdown("  - 'I would have liked...' → Modal Past")
            st.markdown("  - 'I could have done it' → Modal Past")
            st.markdown("• Conditionals: Pay attention to both clauses")
            st.markdown("  - 'If I study...' → Conditional (Type 1)")
            st.markdown("  - 'If I had studied...' → Conditional (Type 3)")
            
            st.markdown("#### Special Constructions")
            st.markdown("• To-infinitive: Verb combinations with 'to'")
            st.markdown("  - 'want/need/plan/hope to do'")
            st.markdown("  - 'decide/agree/promise to help'")
            st.markdown("• Gerund: Verb + -ing form")
            st.markdown("  - 'enjoy/finish/consider doing'")
            st.markdown("  - 'avoid/suggest/recommend doing'")
            
            st.markdown("### 📝 Complex Examples")
            st.markdown("• 'I would like to have studied abroad' → Modal Present + To-infinitive (note both)")
            st.markdown("• 'She has been trying to learn' → Present Perfect Continuous + To-infinitive")
            st.markdown("• 'If I had studied, I would have passed' → Conditional (note type in notes)")
            st.markdown("• 'I might be going to visit' → Modal Present + Future (going to)")
            
            st.markdown("### 💡 Important Tips")
            st.markdown("1. For complex constructions, identify the main/controlling verb first")
            st.markdown("2. Use the notes field to describe additional verb forms in the construction")
            st.markdown("3. When in doubt between forms, explain your reasoning in notes")
            st.markdown("4. Consider the wider context when choosing between similar forms")
            st.markdown("5. Pay special attention to auxiliary verbs (have, be, do) and their role")
            
            # Add some spacing
            st.markdown("---")
            
            current_item = st.session_state.filtered_data[st.session_state.current_index]
            
            # Display current sentence and context in styled boxes
            st.markdown("### Current Sentence")
            st.markdown(f"""
            <div class="annotation-box">
                {current_item['sentence']}
            </div>
            """, unsafe_allow_html=True)
            
            st.markdown("### Context")
            st.markdown(f"""
            <div class="context-box">
                {current_item['text_corrected']}
            </div>
            """, unsafe_allow_html=True)
            
            # Annotation form with improved styling
            with st.form("annotation_form"):
                # Group tenses by category in the selectbox
                tense_options = [""]
                for category, tenses in TENSE_CATEGORIES.items():
                    tense_options.append(f"------ {category} ------")
                    tense_options.extend(tenses)
                
                selected_tense = st.selectbox(
                    "Select Tense",
                    tense_options,
                    format_func=lambda x: "" if x.startswith("------") else x
                )
                
                # Skip category headers when processing selection
                if selected_tense and selected_tense.startswith("------"):
                    selected_tense = ""

                # Add a warning if no tense is selected
                if not selected_tense:
                    st.warning("Please select a tense before saving.")

                # Add keyboard shortcuts hint
                st.markdown("""
                <div style="background-color: #e7f3fe; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                    <span style="color: #0c5460;">💡 Tip: Use keyboard shortcuts:</span>
                    <ul style="margin: 5px 0; color: #0c5460;">
                        <li>Press <b>Enter</b> to Save</li>
                        <li>Press <b>Shift + Enter</b> to Save & Next</li>
                    </ul>
                </div>
                """, unsafe_allow_html=True)
                
                notes = st.text_area("Notes (optional)", 
                    placeholder="Add any observations about the verb construction, ambiguities, or special cases...")

                # Add character count for notes
                if notes:
                    st.markdown(f"<div style='text-align: right; color: #666;'>{len(notes)}/500 characters</div>", 
                        unsafe_allow_html=True)
                
                cols = st.columns([1, 2, 1])
                with cols[0]:
                    prev_button = st.form_submit_button("⬅️ Previous")
                with cols[1]:
                    save_button = st.form_submit_button("💾 Save")
                with cols[2]:
                    next_button = st.form_submit_button("➡️ Next")
                
                if save_button or next_button or prev_button:
                    if selected_tense and not selected_tense.startswith("------"):  # Only save if a valid tense is selected
                        if save_annotation(
                            current_item['sentence'],
                            current_item['sentence_index'],
                            selected_tense,
                            current_item['cefr'],
                            st.session_state.annotator_id,
                            notes,
                            current_item['text_corrected'],
                            current_item['learner_id']
                        ):
                            st.success("✅ Annotation saved!")
                    else:
                        st.error("Please select a valid tense before saving.")
                    
                    if next_button and st.session_state.current_index < len(st.session_state.filtered_data) - 1:
                        st.session_state.current_index += 1
                        st.rerun()
                    
                    if prev_button and st.session_state.current_index > 0:
                        st.session_state.current_index -= 1
                        st.rerun()
            
            # Progress bar with improved styling and more detailed stats
            progress = (st.session_state.current_index + 1) / len(st.session_state.filtered_data)
            st.progress(progress)
            col1, col2 = st.columns(2)
            with col1:
                st.markdown(f"**Progress:** {st.session_state.current_index + 1} / {len(st.session_state.filtered_data)}")
            with col2:
                remaining = len(st.session_state.filtered_data) - (st.session_state.current_index + 1)
                st.markdown(f"**Remaining:** {remaining} sentences")

if __name__ == "__main__":
    main() 