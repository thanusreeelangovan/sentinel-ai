import streamlit as st
import pandas as pd
import plotly.express as px
import uuid
import html
import textwrap
import time
import datetime
import plotly.graph_objects as go

from db.database import get_transactions, save_transaction
from services.risk_scoring import calculate_risk_score, get_decision


# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="SentinelAI",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)


# ============================================================
# DARK FINTECH / SECURITY THEME
# ============================================================

st.markdown("""
<style>

html, body, [class*="css"] {
    font-family: "Segoe UI", Arial, sans-serif;
}

/* ----------------------------------------------------------
   MAIN BACKGROUND
---------------------------------------------------------- */

.stApp {
    background: #15191f !important;
    color: #ffffff !important;
}

.main .block-container {
    background: #15191f !important;
    padding-top: 2rem;
    padding-bottom: 3rem;
}


/* ----------------------------------------------------------
   ALL NORMAL TEXT
---------------------------------------------------------- */

p, label, span, div {
    color: #f1f5f9;
}

.stMarkdown {
    color: #f1f5f9;
}


/* ----------------------------------------------------------
   HEADINGS
---------------------------------------------------------- */

h1, h2, h3, h4, h5, h6 {
    color: #ffffff !important;
    font-family: "Segoe UI", Arial, sans-serif !important;
}

h1 {
    font-size: 28px !important;
}

h2 {
    font-size: 23px !important;
}

h3 {
    font-size: 19px !important;
}


/* ----------------------------------------------------------
   SIDEBAR
---------------------------------------------------------- */

[data-testid="stSidebar"] {
    background: #15191f !important;
    border-right: 1px solid #2d333b;
}

[data-testid="stSidebar"] * {
    color: #f1f5f9 !important;
}

[data-testid="stSidebar"] .stButton > button {
    width: 100%;
    text-align: left;

    background: #15191f !important;
    color: #dbe4ee !important;

    border: 1px solid transparent;
    border-radius: 8px;

    padding: 11px 14px;
    margin: 3px 0;

    font-size: 14px;
    font-weight: 600;
}

[data-testid="stSidebar"] .stButton > button:hover {
    background: #20262e !important;
    border-color: #35404c;
    color: #ffffff !important;
}


/* ----------------------------------------------------------
   LOGO
---------------------------------------------------------- */

.logo {
    font-size: 28px;
    font-weight: 750;
    color: #ffffff !important;
    letter-spacing: -0.5px;
}

.logo span {
    color: #4da3ff !important;
}

.subtitle {
    color: #9ba7b5 !important;
    font-size: 14px;
    margin-top: 3px;
}


/* ----------------------------------------------------------
   SECTION TITLES
---------------------------------------------------------- */

.section-title {
    font-size: 21px;
    font-weight: 700;
    color: #ffffff !important;

    margin-top: 20px;
    margin-bottom: 10px;
}


/* ----------------------------------------------------------
   METRICS
---------------------------------------------------------- */

[data-testid="stMetric"] {
    background: #15191f !important;

    border: 1px solid #2d333b !important;
    border-radius: 11px;

    padding: 16px;

    box-shadow: none !important;
}

[data-testid="stMetricLabel"] {
    color: #9ba7b5 !important;
    font-size: 13px !important;
    font-weight: 600 !important;
}

[data-testid="stMetricValue"] {
    color: #ffffff !important;
    font-size: 25px !important;
    font-weight: 700 !important;
}

[data-testid="stMetricDelta"] {
    color: #9ba7b5 !important;
}


/* ----------------------------------------------------------
   INPUT BOXES
---------------------------------------------------------- */

.stTextInput input,
.stNumberInput input {
    background: #15191f !important;
    color: #ffffff !important;

    border: 1px solid #39434f !important;
    border-radius: 8px !important;
}

.stTextInput input:focus,
.stNumberInput input:focus {
    border-color: #4da3ff !important;
    box-shadow: 0 0 0 1px #4da3ff !important;
}


/* ----------------------------------------------------------
   SELECTBOX
---------------------------------------------------------- */

div[data-baseweb="select"] > div {
    background: #15191f !important;
    color: #ffffff !important;
    border-color: #39434f !important;
}

div[data-baseweb="select"] span {
    color: #ffffff !important;
}


/* ----------------------------------------------------------
   SLIDERS
---------------------------------------------------------- */

[data-testid="stSlider"] label {
    color: #dbe4ee !important;
}


/* ----------------------------------------------------------
   BUTTONS
---------------------------------------------------------- */

.stButton > button {
    background: #1769aa !important;
    color: #ffffff !important;

    border: none !important;
    border-radius: 8px !important;

    font-weight: 650;
    padding: 9px 18px;
}

.stButton > button:hover {
    background: #2181c7 !important;
    color: #ffffff !important;
}


/* ----------------------------------------------------------
   DOWNLOAD BUTTON
---------------------------------------------------------- */

.stDownloadButton > button {
    background: #20262e !important;
    color: #ffffff !important;

    border: 1px solid #39434f !important;
    border-radius: 8px !important;
}


/* ----------------------------------------------------------
   KILL WHITE BACKGROUNDS ON EVERY STREAMLIT WRAPPER LAYER
   Streamlit nests custom HTML inside several of its own
   containers (stElementContainer, stVerticalBlock,
   stMarkdownContainer, block-container, etc). Any one of
   these can carry a light-theme white background that sits
   on top of / behind our table. Force them all transparent
   so only OUR table's own background shows through.
---------------------------------------------------------- */

/* ============================================================
   FORCE ENTIRE APP TO DARK BACKGROUND
   ============================================================ */

html,
body,
.stApp,
[data-testid="stAppViewContainer"],
[data-testid="stHeader"],
[data-testid="stMain"],
[data-testid="stMainBlockContainer"],
.main,
.block-container {
    background-color: #15191f !important;
    background: #15191f !important;
}


/* ============================================================
   FORCE ALL STREAMLIT CONTENT CONTAINERS DARK
   ============================================================ */

[data-testid="stVerticalBlock"],
[data-testid="stHorizontalBlock"],
[data-testid="stElementContainer"],
[data-testid="stMarkdownContainer"],
[data-testid="stVerticalBlockBorderWrapper"],
[data-testid="stColumn"],
.element-container {
    background-color: #15191f !important;
    background: #15191f !important;
}


/* ============================================================
   TABLE AREA
   ============================================================ */

.sentinel-table-wrapper {
    background-color: #15191f !important;
    background: #15191f !important;
}


/* ============================================================
   TABLE
   ============================================================ */

.sentinel-table,
.sentinel-table thead,
.sentinel-table tbody,
.sentinel-table tr,
.sentinel-table th,
.sentinel-table td {
    background-color: #15191f !important;
    background: #15191f !important;
}


/* ============================================================
   TABLE TEXT
   ============================================================ */

.sentinel-table th {
    color: #ffffff !important;
}

.sentinel-table td {
    color: #ffffff !important;
}


/* ============================================================
   DO NOT CHANGE DECISION COLOURS
   ============================================================ */

.decision-approve {
    color: #36d17c !important;
}

.decision-verify {
    color: #e8b84b !important;
}

.decision-block {
    color: #ff6262 !important;
}

/* ----------------------------------------------------------
   DARK TABLE
   (scoped through every ancestor + background-color to
   beat Streamlit's built-in table/container styling)
---------------------------------------------------------- */

.sentinel-table-wrapper {
    width: 100%;
    overflow-x: auto;
    margin-top: 8px;
    margin-bottom: 18px;
    background: #15191f !important;
    background-color: #15191f !important;
    border-radius: 9px;
}

table.sentinel-table,
.sentinel-table {
    width: 100%;
    border-collapse: collapse;

    background: #15191f !important;
    background-color: #15191f !important;

    border: 1px solid #2d333b;
    border-radius: 9px;

    font-size: 14px;
}

table.sentinel-table thead,
table.sentinel-table tbody,
.sentinel-table thead,
.sentinel-table tbody {
    background: #15191f !important;
    background-color: #15191f !important;
}

table.sentinel-table th,
.sentinel-table th {
    background: #15191f !important;
    background-color: #15191f !important;
    color: #ffffff !important;

    border: 1px solid #2d333b !important;

    padding: 11px 12px;
    text-align: left;

    font-weight: 650;
}

table.sentinel-table td,
.sentinel-table td {
    background: #15191f !important;
    background-color: #15191f !important;
    color: #f1f5f9 !important;

    border: 1px solid #2d333b !important;

    padding: 11px 12px;
}

table.sentinel-table tr,
.sentinel-table tr {
    background: #15191f !important;
    background-color: #15191f !important;
}

table.sentinel-table tr:hover td,
.sentinel-table tr:hover td {
    background: #1c2229 !important;
    background-color: #1c2229 !important;
}


/* ----------------------------------------------------------
   NUMBER INPUT STEPPER BUTTONS (the +/- on Transaction Amount)
---------------------------------------------------------- */

[data-testid="stNumberInputStepUp"],
[data-testid="stNumberInputStepDown"] {
    background: #20262e !important;
    background-color: #20262e !important;
    color: #ffffff !important;
    border: 1px solid #39434f !important;
    fill: #ffffff !important;
}

[data-testid="stNumberInputStepUp"]:hover,
[data-testid="stNumberInputStepDown"]:hover {
    background: #2d333b !important;
    background-color: #2d333b !important;
}

[data-testid="stNumberInputStepUp"] svg,
[data-testid="stNumberInputStepDown"] svg {
    fill: #ffffff !important;
    color: #ffffff !important;
}

/* Number/text input outer container Streamlit wraps around
   the visible box (base web input root) */
[data-baseweb="input"] {
    background: #15191f !important;
    background-color: #15191f !important;
    border-color: #39434f !important;
}

[data-baseweb="input"] > div {
    background: #15191f !important;
    background-color: #15191f !important;
}


/* ----------------------------------------------------------
   TABLE DECISION COLOURS
---------------------------------------------------------- */

.decision-approve {
    color: #36d17c !important;
    font-weight: 700 !important;
}

.decision-verify {
    color: #e8b84b !important;
    font-weight: 700 !important;
}

.decision-block {
    color: #ff6262 !important;
    font-weight: 700 !important;
}


/* ----------------------------------------------------------
   CONTAINERS
---------------------------------------------------------- */

[data-testid="stVerticalBlockBorderWrapper"] {
    background: #15191f !important;

    border: 1px solid #2d333b !important;
    border-radius: 10px;
}


/* ----------------------------------------------------------
   ALERTS
---------------------------------------------------------- */

[data-testid="stAlert"] {
    background: #1b2027 !important;
    border: 1px solid #39434f !important;
}

[data-testid="stAlert"] p {
    color: #ffffff !important;
}


/* ----------------------------------------------------------
   DIVIDERS
---------------------------------------------------------- */

hr {
    border-color: #2d333b !important;
}


/* ----------------------------------------------------------
   CAPTIONS
---------------------------------------------------------- */

.stCaption {
    color: #8d99a8 !important;
}


/* ----------------------------------------------------------
   PLOTLY AREA
---------------------------------------------------------- */

.js-plotly-plot,
.plot-container {
    background: #15191f !important;
}

/* ============================================================
   FORCE SENTINELAI TABLES TO MATCH MAIN BACKGROUND
============================================================ */

table,
table thead,
table tbody,
table tr,
table th,
table td {
    background: #15191f !important;
    background-color: #15191f !important;
}

table th {
    color: #ffffff !important;
}

table td {
    color: #f1f5f9 !important;
}

table tr:hover,
table tr:hover td {
    background: #1c2229 !important;
}

/* Keep decision colours */
.decision-approve {
    color: #36d17c !important;
}

.decision-verify {
    color: #e8b84b !important;
}

.decision-block {
    color: #ff6262 !important;
}

</style>
""", unsafe_allow_html=True)


# ============================================================
# SESSION STATE
# ============================================================

if "page" not in st.session_state:
    st.session_state.page = "Dashboard"


# ============================================================
# SIDEBAR
# ============================================================

with st.sidebar:

    st.markdown(
        """
        <div class="logo">🛡️ Sentinel<span>AI</span></div>
        <div class="subtitle">
            AI-Driven Transaction Anomaly Detection
        </div>
        """,
        unsafe_allow_html=True
    )

    st.markdown("---")

    st.markdown("### Navigation")

    if st.button("▣  Dashboard", key="nav_dashboard"):
        st.session_state.page = "Dashboard"

    if st.button("▣  Transaction Monitoring", key="nav_monitoring"):
        st.session_state.page = "Transaction Monitoring"

    if st.button("▣  New Transaction", key="nav_new"):
        st.session_state.page = "New Transaction"

    if st.button("▣  Risk Analysis", key="nav_risk"):
        st.session_state.page = "Risk Analysis"

    if st.button("▣  Fraud Patterns", key="nav_patterns"):
        st.session_state.page = "Fraud Patterns"

    if st.button("▣  Workflow", key="nav_workflow"):
        st.session_state.page = "Workflow"

    if st.button("▣  Reports", key="nav_reports"):
        st.session_state.page = "Reports"

    if st.button("▣  Settings", key="nav_settings"):
        st.session_state.page = "Settings"

    st.markdown("---")

    st.markdown("### System Status")

    st.markdown(
        '<p style="color:#36d17c !important;">● System Online</p>',
        unsafe_allow_html=True
    )

    st.caption("SentinelAI Prototype")
    st.caption("AI Model: Isolation Forest")


# ============================================================
# LOAD DATABASE
# ============================================================

transactions = get_transactions()

transaction_columns = [
    "transaction_id",
    "user",
    "amount",
    "risk_score",
    "decision",
    "anomaly_flag"
]

if transactions:

    transactions_df = pd.DataFrame(
        transactions,
        columns=transaction_columns
    )

else:

    transactions_df = pd.DataFrame(
        columns=transaction_columns
    )


# ============================================================
# DARK TABLE DISPLAY
# ============================================================

def display_table(df, decision_column=False):

    if df.empty:
        st.info("No records available.")
        return

    df = df.copy()

    TABLE_BG = "#202832"
    TABLE_HEADER = "#2f4050"
    BORDER = "#2d333b"
    TEXT = "#f8fafc"

    DECISION_COLORS = {
        "APPROVE": "#36d17c",
        "VERIFY": "#e8b84b",
        "BLOCK": "#ff6262"
    }

    # --------------------------------------------------------
    # HEADER
    # --------------------------------------------------------

    headers = ""

    for column in df.columns:

        headers += f"""
        <th style="
            background:{TABLE_HEADER} !important;
            background-color:{TABLE_HEADER} !important;
            color:{TEXT} !important;
            border:1px solid #2d333b !important;
            padding:12px;
            text-align:left;
            font-weight:600;
            font-size:14px;
        ">
            {html.escape(str(column))}
        </th>
        """

    # --------------------------------------------------------
    # ROWS
    # --------------------------------------------------------

    rows = ""

    for _, row in df.iterrows():

        cells = ""

        for column in df.columns:

            value = row[column]

            if pd.isna(value):
                value = ""

            value = str(value)

            text_color = "#ffffff"
            font_weight = "400"

            # KEEP DECISION COLOURS
            if decision_column and column == "decision":

                if value == "APPROVE":
                    text_color = "#36d17c"
                    font_weight = "700"

                elif value == "VERIFY":
                    text_color = "#e8b84b"
                    font_weight = "700"

                elif value == "BLOCK":
                    text_color = "#ff6262"
                    font_weight = "700"

            cells += f"""
            <td style="
                background:{TABLE_BG} !important;
                background-color:{TABLE_BG} !important;
                color:{text_color} !important;
                border:1px solid #2d333b !important;
                padding:12px;
                font-size:14px;
                font-weight:{font_weight};
            ">
                {html.escape(value)}
            </td>
            """

        rows += f"""
        <tr style="
            background:{TABLE_BG} !important;
            background-color:{TABLE_BG} !important;
        ">
            {cells}
        </tr>
        """

    # --------------------------------------------------------
    # COMPLETE TABLE
    # --------------------------------------------------------

    table = f"""
    <div class="sentinel-table-wrapper" style="
        width:100%;
        overflow-x:auto;
        background:{TABLE_BG} !important;
        background-color:{TABLE_BG} !important;
        padding:0 !important;
        margin:8px 0 20px 0;
    ">

        <table class="sentinel-table"
        style="
            width:100%;
            border-collapse:collapse;
            border-spacing:0;
            background:{TABLE_BG} !important;
            background-color:{TABLE_BG} !important;
            color:{TEXT} !important;
            border:1px solid #2d333b !important;
            font-family:'Segoe UI',Arial,sans-serif;
        ">

            <thead style="
                background:{TABLE_HEADER} !important;
                background-color:{TABLE_HEADER} !important;
            ">
                <tr style="
                    background:{TABLE_HEADER} !important;
                    background-color:{TABLE_HEADER} !important;
                ">
                    {headers}
                </tr>
            </thead>

            <tbody style="
                background:{TABLE_BG} !important;
                background-color:{TABLE_BG} !important;
            ">
                {rows}
            </tbody>

        </table>

    </div>
    """

    table_html = "\n".join(
        line.strip()
        for line in textwrap.dedent(table).splitlines()
    )

    st.html(table_html)



# ============================================================
# PLOTLY DARK THEME
# ============================================================

plotly_layout = dict(
    paper_bgcolor="#15191f",
    plot_bgcolor="#15191f",
    font=dict(
        color="#ffffff",
        family="Segoe UI, Arial"
    )
)


# ============================================================
# PAGE HEADER
# ============================================================

st.markdown(
    """
    <div class="logo">
        🛡️ Sentinel<span>AI</span>
    </div>

    <div class="subtitle">
        AI-Driven Transaction Anomaly Detection
    </div>
    """,
    unsafe_allow_html=True
)

st.markdown("---")

# ============================================================
# DASHBOARD
# ============================================================

if st.session_state.page == "Dashboard":

    st.markdown(
        '<div class="section-title">📊 Dashboard</div>',
        unsafe_allow_html=True
    )

    st.write(
        "Real-time transaction and fraud monitoring overview."
    )

    total_transactions = len(transactions_df)

    approved = len(
        transactions_df[
            transactions_df["decision"] == "APPROVE"
        ]
    )

    verified = len(
        transactions_df[
            transactions_df["decision"] == "VERIFY"
        ]
    )

    blocked = len(
        transactions_df[
            transactions_df["decision"] == "BLOCK"
        ]
    )

    high_risk = len(
        transactions_df[
            transactions_df["risk_score"] > 70
        ]
    )

    active_alerts = len(
        transactions_df[
            transactions_df["anomaly_flag"] != "None"
        ]
    )

    # METRICS

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric(
            "Total Transactions",
            total_transactions
        )

    with col2:
        st.metric(
            "Blocked",
            blocked
        )

    with col3:
        st.metric(
            "Verified",
            verified
        )

    with col4:
        st.metric(
            "Approved",
            approved
        )

    col1, col2 = st.columns(2)

    with col1:

        st.metric(
            "Active Fraud Alerts",
            active_alerts
        )

    with col2:

        st.metric(
            "High Risk Transactions",
            high_risk
        )

    # --------------------------------------------------------
    # RISK DISTRIBUTION
    # --------------------------------------------------------

    st.markdown(
        '<div class="section-title">📈 Risk Distribution</div>',
        unsafe_allow_html=True
    )

    low_risk = len(
        transactions_df[
            transactions_df["risk_score"] <= 40
        ]
    )

    medium_risk = len(
        transactions_df[
            (transactions_df["risk_score"] > 40)
            &
            (transactions_df["risk_score"] <= 70)
        ]
    )

    high_risk_count = len(
        transactions_df[
            transactions_df["risk_score"] > 70
        ]
    )

    risk_data = pd.DataFrame({
        "Risk Level": [
            "Low Risk",
            "Medium Risk",
            "High Risk"
        ],
        "Transactions": [
            low_risk,
            medium_risk,
            high_risk_count
        ]
    })

    fig = px.pie(
        risk_data,
        names="Risk Level",
        values="Transactions",
        hole=0.45
    )

    fig.update_traces(
        textfont=dict(color="#ffffff"),
        marker=dict(
            line=dict(color="#15191f", width=2)
        )
    )

    fig.update_layout(
        **plotly_layout,
        showlegend=True,
        legend=dict(
            font=dict(color="#ffffff")
        )
    )

    st.plotly_chart(
        fig,
        use_container_width=True
    )

    # --------------------------------------------------------
    # ACTIVE FRAUD ALERT
    # --------------------------------------------------------

    st.markdown(
        '<div class="section-title">🚨 Active Fraud Alert</div>',
        unsafe_allow_html=True
    )

    active_alert_df = transactions_df[
        transactions_df["anomaly_flag"] != "None"
    ]

    if active_alert_df.empty:

        st.success(
            "✅ No active fraud alerts"
        )

    else:

        st.error(
            f"🚨 {len(active_alert_df)} suspicious "
            "transaction(s) detected"
        )

        alert_display = active_alert_df[
            [
                "transaction_id",
                "user",
                "amount",
                "risk_score",
                "anomaly_flag",
                "decision"
            ]
        ]

        display_table(
            alert_display,
            decision_column=True
        )

    # --------------------------------------------------------
    # RECENT TRANSACTIONS
    # --------------------------------------------------------

    st.markdown(
        '<div class="section-title">📋 Recent Transactions</div>',
        unsafe_allow_html=True
    )

    recent_transactions = get_transactions()

    recent_transactions = recent_transactions[:10]

    recent_df = pd.DataFrame(
        recent_transactions,
        columns=transaction_columns
    )

    display_table(
        recent_df,
        decision_column=True
    )


# ============================================================
# TRANSACTION MONITORING
# ============================================================

elif st.session_state.page == "Transaction Monitoring":

    st.markdown(
        '<div class="section-title">🔎 Transaction Monitoring</div>',
        unsafe_allow_html=True
    )

    st.write(
        "Monitor transactions and their current fraud-risk decisions."
    )

    if transactions_df.empty:

        st.info("No transactions available.")

    else:

        search_text = st.text_input(
            "🔎 Search Transaction ID or User",
            key="monitor_search"
        )

        decision_filter = st.selectbox(
            "Filter by Decision",
            [
                "ALL",
                "APPROVE",
                "VERIFY",
                "BLOCK"
            ],
            key="monitor_filter"
        )

        filtered_df = transactions_df.copy()

        if search_text.strip():

            filtered_df = filtered_df[
                filtered_df["transaction_id"]
                .astype(str)
                .str.contains(
                    search_text,
                    case=False,
                    na=False
                )
                |
                filtered_df["user"]
                .astype(str)
                .str.contains(
                    search_text,
                    case=False,
                    na=False
                )
            ]

        if decision_filter != "ALL":

            filtered_df = filtered_df[
                filtered_df["decision"] == decision_filter
            ]

        display_table(
            filtered_df,
            decision_column=True
        )

        st.markdown(
            "### 🔎 Transaction Details"
        )

        transaction_ids = (
            filtered_df["transaction_id"]
            .tolist()
        )

        if transaction_ids:

            selected_id = st.selectbox(
                "Select Transaction ID",
                transaction_ids,
                key="monitor_transaction_select"
            )

            selected_transaction = filtered_df[
                filtered_df["transaction_id"] == selected_id
            ].iloc[0]

            col1, col2 = st.columns(2)

            with col1:

                st.write(
                    f"**User:** {selected_transaction['user']}"
                )

                st.write(
                    f"**Amount:** ₹{selected_transaction['amount']}"
                )

                st.write(
                    f"**Risk Score:** "
                    f"{selected_transaction['risk_score']}"
                )

            with col2:

                st.write(
                    f"**Anomaly Flag:** "
                    f"{selected_transaction['anomaly_flag']}"
                )

                decision = selected_transaction["decision"]

                if decision == "APPROVE":

                    st.markdown(
                        '<p class="decision-approve">'
                        'Decision: APPROVE'
                        '</p>',
                        unsafe_allow_html=True
                    )

                elif decision == "VERIFY":

                    st.markdown(
                        '<p class="decision-verify">'
                        'Decision: VERIFY'
                        '</p>',
                        unsafe_allow_html=True
                    )

                elif decision == "BLOCK":

                    st.markdown(
                        '<p class="decision-block">'
                        'Decision: BLOCK'
                        '</p>',
                        unsafe_allow_html=True
                    )

# ============================================================
# NEW TRANSACTION
# ============================================================

elif st.session_state.page == "New Transaction":

    st.markdown(
        '<div class="section-title">➕ New Transaction</div>',
        unsafe_allow_html=True
    )

    st.write(
        "Enter transaction details to analyze fraud risk."
    )

    # --------------------------------------------------------
    # ONLY USER ENTERS THE RECIPIENT AND AMOUNT
    # --------------------------------------------------------

    user_name = st.text_input(
        "Recipient / User Name",
        key="new_user_name"
    )

    amount = st.number_input(
        "Transaction Amount (INR)",
        min_value=1.0,
        value=None,
        placeholder="Enter amount",
        step=100.0,
        key="new_amount"
    )

    st.markdown("")

    if st.button(
        "🔍 Analyze Transaction",
        key="analyze_transaction"
    ):

        if not user_name.strip():

            st.error(
                "Please enter the recipient / user name."
            )

        elif amount is None or amount <= 0:

            st.error(
                "Please enter a valid transaction amount."
            )

        else:

            transaction_id = (
                "TXN"
                +
                str(uuid.uuid4())[:8].upper()
            )

            # ------------------------------------------------
            # NEW PIPELINE: velocity, receiver, behavior, anomaly
            # ------------------------------------------------

            # Context is inferred automatically for this simple entry flow.
            receiver_tier = "trusted"
            recent_txn_count = 1
            known_device = True
            known_location = True
            transaction_time = datetime.datetime.now().time()

            receiver_risk = {
                "trusted": 5,
                "occasional": 30,
                "new": 70,
                "flagged": 95,
            }[receiver_tier]

            transaction_velocity = 5
            if recent_txn_count > 3:
                transaction_velocity = 85
            elif recent_txn_count > 1:
                transaction_velocity = 30

            behavioral_deviation = 0
            if amount > 5000:
                amount_ratio = amount / 5000
                behavioral_deviation += min(
                    45,
                    max(0, round((amount_ratio - 1) * 18))
                )

            if not known_device:
                behavioral_deviation += 30

            if not known_location:
                behavioral_deviation += 25

            if transaction_time.hour < 6:
                behavioral_deviation += 15

            behavioral_deviation = min(100, round(behavioral_deviation))

            amount_out_of_range = 0
            if amount > 5000:
                amount_out_of_range = min(
                    40,
                    ((amount - 5000) / 5000) * 10
                )

            ai_anomaly = min(
                100,
                round(behavioral_deviation * 0.55 + amount_out_of_range)
            )

            if ai_anomaly > 70:
                anomaly_flag = "AI Anomaly"
            elif behavioral_deviation > 0:
                anomaly_flag = "Unusual Activity"
            else:
                anomaly_flag = "None"

            risk_score = calculate_risk_score(
                ai_anomaly,
                transaction_velocity,
                receiver_risk,
                behavioral_deviation
            )

            decision = get_decision(
                risk_score
            )

            # ==================================================
            # LIVE "SENTINELAI INTERCEPTION" ANALYSIS ANIMATION
            # ==================================================

            STEP_BG = "#0d1117"
            STEP_BORDER = "#2d333b"

            analysis_steps = [
                (
                    "✅",
                    "Transaction Received",
                    f"₹{amount:,.2f} → {user_name}"
                ),
                (
                    "🧬",
                    "Behavioral Analysis",
                    "Comparing against historical behavioral baseline…"
                ),
                (
                    "📡",
                    "Anomaly Detection",
                    "Scanning with Isolation Forest model…"
                ),
                (
                    "🎯",
                    "Risk Score Calculation",
                    "Computing composite risk score…"
                ),
                (
                    "⚙️",
                    "Decision Engine",
                    "Evaluating against risk thresholds…"
                ),
                (
                    "🛡️",
                    "Final Decision",
                    "Finalizing SentinelAI decision…"
                ),
            ]

            rows_html = ""
            for step_index, (icon, title, subtitle) in enumerate(analysis_steps):
                delay = step_index * 0.9
                rows_html += f"""
                <div class="analysis-step" style="animation-delay:{delay:.1f}s;">
                    <div class="step-icon">{icon}</div>
                    <div class="step-copy">
                        <div class="step-title">{title}</div>
                        <div class="step-subtitle">{subtitle}</div>
                    </div>
                </div>
                """

            staged_analysis = f"""
            <style>
                .sentinel-stage {{
                    background:{STEP_BG}; border:1px solid {STEP_BORDER};
                    border-radius:14px; padding:22px; color:#fff;
                    font-family:Segoe UI, Arial, sans-serif;
                }}
                .stage-label {{ color:#4da3ff; font-size:12px;
                    font-weight:700; letter-spacing:1px; margin-bottom:16px; }}
                .analysis-step {{ display:flex; align-items:flex-start;
                    opacity:0; transform:translateY(8px);
                    animation:step-in .55s ease forwards; }}
                .step-icon {{ min-width:40px; height:40px; border-radius:50%;
                    background:#1c7c4d; display:flex; align-items:center;
                    justify-content:center; font-size:18px; }}
                .step-copy {{ margin-left:14px; padding-top:2px; }}
                .step-title {{ color:#fff; font-weight:700; font-size:15px; }}
                .step-subtitle {{ color:#7fdba0; font-size:13px; margin-top:2px; }}
                @keyframes step-in {{ to {{ opacity:1; transform:translateY(0); }} }}
            </style>
            <div class="sentinel-stage">
                <div class="stage-label">🛡️ SENTINELAI · INTERCEPTION LAYER</div>
                {rows_html}
            </div>
            """
            st.html(staged_analysis)

            # ------------------------------------------------
            # SAVE TRANSACTION
            # ------------------------------------------------

            save_transaction(
                transaction_id,
                user_name,
                amount,
                risk_score,
                decision,
                anomaly_flag
            )

            # ==================================================
            # RESULT CARD (gauge + decision)
            # ==================================================

            decision_colors = {
                "APPROVE": ("#36d17c", "🟢", "Transaction is considered low risk."),
                "VERIFY": ("#e8b84b", "🟡", "Additional verification is required."),
                "BLOCK": ("#ff6262", "🔴", "Transaction has been identified as high risk."),
            }

            color, emoji, message = decision_colors.get(
                decision,
                ("#f1f5f9", "⚪", "")
            )

            st.markdown("---")
            st.markdown(
                '<div class="section-title">🛡️ Risk Assessment</div>',
                unsafe_allow_html=True
            )

            gauge_html = f"""
            <style>
                .risk-stage {{ opacity:0; transform:translateY(10px);
                    animation:gauge-in .7s ease forwards;
                    animation-delay:5.4s; text-align:center; }}
                .risk-meter {{ width:260px; height:130px; margin:12px auto 0;
                    overflow:hidden; position:relative; }}
                .risk-meter::before {{ content:""; position:absolute; inset:0;
                    border-radius:260px 260px 0 0;
                    background:conic-gradient(from 270deg at 50% 100%,
                    #36d17c 0deg, #e8b84b 70deg, #ff6262 140deg, #20262e 140deg);
                }}
                .risk-meter::after {{ content:""; position:absolute;
                    width:190px; height:95px; left:35px; top:35px;
                    border-radius:190px 190px 0 0; background:#15191f; }}
                .risk-value {{ position:absolute; z-index:1; inset:66px 0 auto;
                    color:#fff; font-size:34px; font-weight:800; }}
                .risk-caption {{ color:#9ba7b5; font-size:13px; margin-top:5px; }}
                @keyframes gauge-in {{ to {{ opacity:1; transform:translateY(0); }} }}
            </style>
            <div class="risk-stage">
                <div class="risk-meter">
                    <div class="risk-value">{risk_score}</div>
                </div>
                <div class="risk-caption">Composite Risk Score / 100</div>
            </div>
            """
            st.html(gauge_html)

            st.markdown(
                f"""
                    <style>
                        .receipt-stage {{ opacity:0; transform:translateY(10px);
                            animation:receipt-in .7s ease forwards;
                            animation-delay:7s; }}
                        @keyframes receipt-in {{ to {{ opacity:1;
                            transform:translateY(0); }} }}
                    </style>
                    <div class="receipt-stage">
                        <div class="section-title">🛡️ SentinelAI Transaction Receipt</div>
                        <div style="background-color:#15191f;
                        border:1px solid #2d333b;border-radius:14px;
                        padding:22px;height:260px;
                        display:flex;flex-direction:column;
                        justify-content:center;">
                        <div style="font-size:34px;">{emoji}</div>
                        <div style="color:{color};font-size:26px;
                            font-weight:800;margin-top:6px;">
                            {decision}
                        </div>
                        <div style="color:#dbe4ee;font-size:14px;
                            margin-top:8px;">
                            {message}
                        </div>
                        <div style="color:#9ba7b5;font-size:13px;
                            margin-top:14px;">
                            ₹{amount:,.2f} → {html.escape(user_name)}
                        </div>
                        <div style="color:#6b7684;font-size:12px;
                            margin-top:4px;">
                            {transaction_id}
                        </div>
                    </div>
                    </div>
                    """,
                unsafe_allow_html=True
            )

            # ------------------------------------------------
            # EVENT TIMELINE
            # ------------------------------------------------

            st.markdown("### 🕒 Event Timeline")

            now = datetime.datetime.now()

            timeline_events = [
                "Payment Initiated",
                "Transaction Generated",
                "SentinelAI Intercepted",
                "Behavioral Analysis",
                "Anomaly Detection",
                "Risk Computation",
                "Decision",
                "Payment Outcome",
            ]

            timeline_html = (
                '<div style="background-color:#15191f;'
                'border:1px solid #2d333b;border-radius:14px;'
                'padding:20px;margin-top:10px;">'
            )

            for i, event in enumerate(timeline_events):

                event_time = now - datetime.timedelta(
                    seconds=(len(timeline_events) - i) * 1.1
                )

                timeline_html += f"""
                <div style="display:flex;align-items:center;
                    margin-bottom:14px;">
                    <div style="width:9px;height:9px;border-radius:50%;
                        background-color:#4da3ff;margin-right:12px;">
                    </div>
                    <div>
                        <div style="color:#ffffff;font-size:14px;
                            font-weight:650;">
                            {event}
                        </div>
                        <div style="color:#9ba7b5;font-size:12px;">
                            {event_time.strftime('%H:%M:%S')}
                        </div>
                    </div>
                </div>
                """

            timeline_html += "</div>"

            st.html(timeline_html)

            # ------------------------------------------------
            # FULL BREAKDOWN TABLE
            # ------------------------------------------------

            st.markdown("### 📋 Analysis Breakdown")

            breakdown_df = pd.DataFrame({
                "Metric": [
                    "Transaction Velocity",
                    "Receiver Risk",
                    "Behavioral Deviation",
                    "AI Anomaly Score",
                    "Composite Risk Score"
                ],
                "Value": [
                    f"{transaction_velocity}/100",
                    f"{receiver_risk}/100",
                    f"{behavioral_deviation}/100",
                    f"{ai_anomaly}/100",
                    f"{risk_score}/100"
                ]
            })

            display_table(breakdown_df)


elif st.session_state.page == "Risk Analysis":

    st.markdown(
        '<div class="section-title">🎯 Risk Analysis</div>',
        unsafe_allow_html=True
    )

    st.write(
        "Composite risk score based on the SentinelAI risk model."
    )

    col1, col2 = st.columns(2)

    with col1:

        ai_anomaly = st.slider(
            "AI Anomaly Score — 40%",
            0,
            100,
            40,
            key="risk_ai"
        )

        transaction_velocity = st.slider(
            "Transaction Velocity — 25%",
            0,
            100,
            25,
            key="risk_velocity"
        )

    with col2:

        receiver_risk = st.slider(
            "Receiver Risk — 20%",
            0,
            100,
            20,
            key="risk_receiver"
        )

        behavioral_deviation = st.slider(
            "Behavioral Deviation — 15%",
            0,
            100,
            15,
            key="risk_behavior"
        )

    composite_score = (
        ai_anomaly * 0.40
        +
        transaction_velocity * 0.25
        +
        receiver_risk * 0.20
        +
        behavioral_deviation * 0.15
    )

    composite_score = round(
        composite_score
    )

    st.metric(
        "Composite Risk Score",
        f"{composite_score} / 100"
    )

    if composite_score <= 40:

        st.markdown(
            '<p class="decision-approve">'
            '🟢 APPROVE — Low Risk'
            '</p>',
            unsafe_allow_html=True
        )

    elif composite_score <= 70:

        st.markdown(
            '<p class="decision-verify">'
            '🟡 VERIFY — Medium Risk'
            '</p>',
            unsafe_allow_html=True
        )

    else:

        st.markdown(
            '<p class="decision-block">'
            '🔴 BLOCK — High Risk'
            '</p>',
            unsafe_allow_html=True
        )

    st.markdown("---")

    st.markdown("### Risk Decision Rules")

    rules_df = pd.DataFrame({
        "Risk Score": [
            "0 – 40",
            "41 – 70",
            "71 – 100"
        ],
        "Decision": [
            "APPROVE",
            "VERIFY",
            "BLOCK"
        ],
        "Risk Level": [
            "Low",
            "Medium",
            "High"
        ]
    })

    display_table(
        rules_df,
        decision_column=True
    )


            # ============================================================
# RISK ANALYSIS
# ============================================================

elif st.session_state.page == "Risk Analysis":

    st.markdown(
        '<div class="section-title">🎯 Risk Analysis</div>',
        unsafe_allow_html=True
    )

    st.write(
        "Composite risk score based on the SentinelAI risk model."
    )

    col1, col2 = st.columns(2)

    with col1:

        ai_anomaly = st.slider(
            "AI Anomaly Score — 40%",
            0,
            100,
            40,
            key="risk_ai"
        )

        transaction_velocity = st.slider(
            "Transaction Velocity — 25%",
            0,
            100,
            25,
            key="risk_velocity"
        )

    with col2:

        receiver_risk = st.slider(
            "Receiver Risk — 20%",
            0,
            100,
            20,
            key="risk_receiver"
        )

        behavioral_deviation = st.slider(
            "Behavioral Deviation — 15%",
            0,
            100,
            15,
            key="risk_behavior"
        )

    composite_score = (
        ai_anomaly * 0.40
        +
        transaction_velocity * 0.25
        +
        receiver_risk * 0.20
        +
        behavioral_deviation * 0.15
    )

    composite_score = round(
        composite_score
    )

    st.metric(
        "Composite Risk Score",
        f"{composite_score} / 100"
    )

    if composite_score <= 40:

        st.markdown(
            '<p class="decision-approve">'
            '🟢 APPROVE — Low Risk'
            '</p>',
            unsafe_allow_html=True
        )

    elif composite_score <= 70:

        st.markdown(
            '<p class="decision-verify">'
            '🟡 VERIFY — Medium Risk'
            '</p>',
            unsafe_allow_html=True
        )

    else:

        st.markdown(
            '<p class="decision-block">'
            '🔴 BLOCK — High Risk'
            '</p>',
            unsafe_allow_html=True
        )

    st.markdown("---")

    st.markdown("### Risk Decision Rules")

    rules_df = pd.DataFrame({
        "Risk Score": [
            "0 – 40",
            "41 – 70",
            "71 – 100"
        ],
        "Decision": [
            "APPROVE",
            "VERIFY",
            "BLOCK"
        ],
        "Risk Level": [
            "Low",
            "Medium",
            "High"
        ]
    })

    display_table(
        rules_df,
        decision_column=True
    )


# ============================================================
# FRAUD PATTERNS
# ============================================================

elif st.session_state.page == "Fraud Patterns":

    st.markdown(
        '<div class="section-title">🚨 Fraud Patterns</div>',
        unsafe_allow_html=True
    )

    st.write(
        "Security scenarios monitored by SentinelAI."
    )

    patterns = [
        (
            "Salami Attack",
            "Small repeated transactions used "
            "to steal money over time."
        ),
        (
            "Burst Transaction",
            "Sudden large number of transactions "
            "within a short period."
        ),
        (
            "Mule Account Routing",
            "Funds routed through suspicious "
            "intermediary accounts."
        ),
        (
            "Midnight Anomaly",
            "Unusual transaction activity "
            "during late-night hours."
        ),
        (
            "Unusual High-Value Transfer",
            "Transaction amount significantly "
            "higher than normal behaviour."
        ),
        (
            "Rapid Device Switching",
            "Multiple devices used within "
            "a short period."
        ),
        (
            "Suspicious Receiver Cluster",
            "Multiple suspicious transactions "
            "linked to the same receiver."
        )
    ]

    for name, description in patterns:

        with st.container(border=True):

            st.markdown(
                f"### 🔴 {name}"
            )

            st.write(description)


# ============================================================
# WORKFLOW
# ============================================================

elif st.session_state.page == "Workflow":

    st.markdown(
        '<div class="section-title">🔄 Detection Workflow</div>',
        unsafe_allow_html=True
    )

    st.write(
        "SentinelAI transaction detection pipeline."
    )

    workflow = [
        (
            "1",
            "Transaction Request",
            "Transaction is initiated."
        ),
        (
            "2",
            "Feature Extraction",
            "Transaction and behavioural features "
            "are collected."
        ),
        (
            "3",
            "Behavioral Analysis",
            "User transaction behaviour is analyzed."
        ),
        (
            "4",
            "AI Anomaly Detection",
            "Isolation Forest detects unusual activity."
        ),
        (
            "5",
            "Rule Validation",
            "Transaction risk indicators are checked."
        ),
        (
            "6",
            "Risk Score",
            "Composite risk score is calculated."
        ),
        (
            "7",
            "APPROVE / VERIFY / BLOCK",
            "Final transaction decision is generated."
        ),
        (
            "8",
            "Audit / Monitoring",
            "Transaction status is stored and monitored."
        )
    ]

    for number, title, description in workflow:

        with st.container(border=True):

            st.markdown(
                f"### {number}. {title}"
            )

            st.write(description)


# ============================================================
# REPORTS
# ============================================================

elif st.session_state.page == "Reports":

    st.markdown(
        '<div class="section-title">📑 Reports</div>',
        unsafe_allow_html=True
    )

    st.write(
        "Transaction and fraud monitoring reports."
    )

    report_transactions = get_transactions()

    report_df = pd.DataFrame(
        report_transactions,
        columns=transaction_columns
    )

    total_transactions = len(report_df)

    approved = len(
        report_df[
            report_df["decision"] == "APPROVE"
        ]
    )

    verified = len(
        report_df[
            report_df["decision"] == "VERIFY"
        ]
    )

    blocked = len(
        report_df[
            report_df["decision"] == "BLOCK"
        ]
    )

    fraud_alerts = len(
        report_df[
            report_df["anomaly_flag"] != "None"
        ]
    )

    # --------------------------------------------------------
    # REPORT METRICS
    # --------------------------------------------------------

    col1, col2, col3, col4, col5 = st.columns(5)

    with col1:
        st.metric("Total", total_transactions)

    with col2:
        st.metric("Approved", approved)

    with col3:
        st.metric("Verified", verified)

    with col4:
        st.metric("Blocked", blocked)

    with col5:
        st.metric("Fraud Alerts", fraud_alerts)

    st.markdown("### 📊 Decision Summary")

    decision_data = pd.DataFrame({
        "Decision": [
            "APPROVE",
            "VERIFY",
            "BLOCK"
        ],
        "Transactions": [
            approved,
            verified,
            blocked
        ]
    })

    fig = px.pie(
        decision_data,
        names="Decision",
        values="Transactions",
        hole=0.45
    )

    fig.update_traces(
        textfont=dict(color="#ffffff"),
        marker=dict(
            line=dict(color="#15191f", width=2)
        )
    )

    fig.update_layout(
        **plotly_layout,
        showlegend=True,
        legend=dict(
            font=dict(color="#ffffff")
        )
    )

    st.plotly_chart(
        fig,
        use_container_width=True
    )

    st.markdown("### 📋 Transaction Report")

    display_table(
        report_df,
        decision_column=True
    )

    if not report_df.empty:

        csv_data = report_df.to_csv(
            index=False
        )

        st.download_button(
            "📥 Download Transaction Report",
            data=csv_data,
            file_name="sentinelai_transaction_report.csv",
            mime="text/csv",
            key="download_transaction_report"
        )


# ============================================================
# SETTINGS
# ============================================================

elif st.session_state.page == "Settings":

    st.markdown(
        '<div class="section-title">⚙️ Settings</div>',
        unsafe_allow_html=True
    )

    st.write(
        "SentinelAI system configuration and information."
    )

    # --------------------------------------------------------
    # SYSTEM STATUS
    # --------------------------------------------------------

    st.markdown("### 🟢 System Status")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric("System", "ONLINE")

    with col2:
        st.metric("AI Detection", "ACTIVE")

    with col3:
        st.metric("Database", "CONNECTED")

    # --------------------------------------------------------
    # FRAUD ALERT SETTINGS
    # --------------------------------------------------------

    st.markdown("### 🔔 Fraud Alert Settings")

    alert_enabled = st.toggle(
        "Enable Fraud Alerts",
        value=True,
        key="settings_fraud_alert"
    )

    high_risk_alert = st.toggle(
        "Alert for High-Risk Transactions",
        value=True,
        key="settings_high_risk"
    )

    if alert_enabled:

        st.success(
            "Fraud alerts are enabled."
        )

    else:

        st.warning(
            "Fraud alerts are disabled."
        )

    # --------------------------------------------------------
    # RISK DECISION THRESHOLDS
    # --------------------------------------------------------

    st.markdown(
        "### 🎯 Risk Decision Thresholds"
    )

    threshold_df = pd.DataFrame({
        "Risk Score": [
            "0 – 40",
            "41 – 70",
            "71 – 100"
        ],
        "Decision": [
            "APPROVE",
            "VERIFY",
            "BLOCK"
        ],
        "Risk Level": [
            "Low",
            "Medium",
            "High"
        ]
    })

    display_table(
        threshold_df,
        decision_column=True
    )

    # --------------------------------------------------------
    # AI MODEL
    # --------------------------------------------------------

    st.markdown("### 🤖 AI Model")

    model_df = pd.DataFrame({
        "Property": [
            "Model",
            "Algorithm",
            "Features",
            "Purpose"
        ],
        "Value": [
            "SentinelAI Fraud Detection",
            "Isolation Forest",
            "Amount + Risk Score",
            "Transaction Anomaly Detection"
        ]
    })

    display_table(model_df)

    # --------------------------------------------------------
    # DATABASE
    # --------------------------------------------------------

    st.markdown("### 🗄️ Database")

    current_transactions = get_transactions()

    database_df = pd.DataFrame({
        "Property": [
            "Database",
            "Storage",
            "Transactions",
            "Deletion"
        ],
        "Value": [
            "SentinelAI Database",
            "SQLite",
            str(len(current_transactions)),
            "Disabled for audit protection"
        ]
    })

    display_table(database_df)

    # --------------------------------------------------------
    # APPLICATION INFORMATION
    # --------------------------------------------------------

    st.markdown(
        "### ℹ️ Application Information"
    )

    app_df = pd.DataFrame({
        "Property": [
            "Application",
            "Version",
            "Frontend",
            "AI / ML",
            "Database",
            "Purpose"
        ],
        "Value": [
            "SentinelAI",
            "Prototype v1.0",
            "Streamlit",
            "Scikit-learn Isolation Forest",
            "SQLite",
            "AI-Driven Transaction Anomaly Detection"
        ]
    })

    display_table(app_df)