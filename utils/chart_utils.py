import plotly.graph_objects as go
import plotly.express as px

# Linear Dark Theme colors
BG_COLOR = "rgba(0,0,0,0)"
TEXT_COLOR = "#efefef"
GRID_COLOR = "#222222"
ACCENT_COLOR = "#6366f1"

def create_radar_chart(scores_dict, title="AI Evaluation"):
    categories = list(scores_dict.keys())
    values = list(scores_dict.values())
    
    # Close the loop
    categories.append(categories[0])
    values.append(values[0])

    fig = go.Figure(data=go.Scatterpolar(
        r=values,
        theta=categories,
        fill='toself',
        fillcolor='rgba(99, 102, 241, 0.2)',
        line=dict(color=ACCENT_COLOR, width=2)
    ))

    fig.update_layout(
        polar=dict(
            radialaxis=dict(visible=True, range=[0, 10], color=TEXT_COLOR, gridcolor=GRID_COLOR, showticklabels=False),
            angularaxis=dict(color=TEXT_COLOR, gridcolor=GRID_COLOR)
        ),
        showlegend=False,
        paper_bgcolor=BG_COLOR,
        plot_bgcolor=BG_COLOR,
        margin=dict(t=30, b=30, l=30, r=30),
        title=dict(text=title, font=dict(color=TEXT_COLOR, size=16))
    )
    return fig

def create_funnel_chart(stages, counts):
    fig = go.Figure(go.Funnel(
        y=stages,
        x=counts,
        textinfo="value+percent initial",
        marker=dict(color=[ACCENT_COLOR]*len(stages))
    ))
    fig.update_layout(
        paper_bgcolor=BG_COLOR,
        plot_bgcolor=BG_COLOR,
        font=dict(color=TEXT_COLOR),
        margin=dict(t=0, b=0, l=0, r=0)
    )
    return fig
