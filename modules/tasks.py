import streamlit as st
from ui.components import render_page_header
from database.db import get_db
from database.models import Task

def render():
    render_page_header("Tasks & Workflow", "Manage deals and due diligence tasks.")
    
    with get_db() as db:
        tasks = db.query(Task).all()
        
    st.markdown("### Action Items")
    if not tasks:
        st.info("Inbox Zero! No pending tasks.")
    else:
        for t in tasks:
            st.checkbox(t.title, key=f"task_{t.id}")
            
    with st.expander("+ Create Task"):
        with st.form("new_task"):
            title = st.text_input("Task Title")
            assignee = st.text_input("Assignee")
            if st.form_submit_button("Create"):
                with get_db() as db:
                    db.add(Task(title=title, assignee=assignee))
                    db.commit()
                st.success("Task created!")
                st.rerun()
