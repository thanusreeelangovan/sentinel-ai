# SentinelAI Frontend - Quick Start Guide

## 🚀 Fastest Way to Get Running

### Step 1: Install Dependencies (1 minute)
```bash
cd c:\Users\ADMIN\Desktop\sentinel-ai-team\frontend
npm install
```

### Step 2: Start Development Server (10 seconds)
```bash
npm run dev
```

### Step 3: Open in Browser
Navigate to: **http://localhost:3000**

## ✅ What You'll See

- **Dashboard**: Overview with metrics and charts
- **Navigation Sidebar**: 5 main sections
  - 📊 Dashboard
  - 🎯 Transaction Simulator
  - 🔎 Transaction Monitoring
  - 🚨 Salami Attack Alerts
  - ⚙️ Settings

## 🔧 Configuration

### Default API URL
Backend API: `http://localhost:8000`

### Change API URL (if needed)
Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://your-backend-url
```

Then restart dev server with `npm run dev`

## 📝 What Each Section Does

| Page | Purpose | URL |
|------|---------|-----|
| Dashboard | View KPIs and recent transactions | `/` |
| Transaction Simulator | Create new transaction | `/simulator` |
| Processing | Watch transaction evaluation | `/processing` |
| Monitoring | View all transactions | `/monitoring` |
| Salami Alerts | View fraud detected | `/salami-alerts` |
| Settings | App info & thresholds | `/settings` |

## 🎯 Try It Out

1. **Go to Transaction Simulator** (`/simulator`)
2. **Fill out the form**:
   - User ID: `USER-001`
   - Sender ID: `SENDER-001`
   - Receiver ID: `RECV-001`
   - Amount: `5000`
   - Keep other defaults
3. **Click "🎯 Initiate Transaction"**
4. **Watch the processing pipeline**
5. **See the decision and risk breakdown**

## 📦 Available Commands

```bash
# Development
npm run dev              # Start development server

# Production
npm run build           # Build for production
npm start               # Start production server

# Code Quality
npm run type-check      # Check TypeScript errors
npm run lint            # Run ESLint

# Cleanup
rm -rf .next            # Clear Next.js cache (if needed)
```

## ⚠️ Common Issues & Solutions

### Issue: "Failed to load dashboard data"
**Solution**: Backend API not running
- Start backend on `http://localhost:8000`
- Or update `NEXT_PUBLIC_API_URL` in `.env.local`

### Issue: Port 3000 already in use
**Solution**: Kill the process or use different port
```bash
npm run dev -- -p 3001  # Use port 3001 instead
```

### Issue: TypeScript errors
**Solution**: Run type check
```bash
npm run type-check
```

### Issue: Styling looks broken
**Solution**: Clear cache and rebuild
```bash
rm -rf .next
npm run dev
```

## 📱 Responsive Design

The app works on:
- ✅ Desktop (1920px+)
- ✅ Tablet (768px+)
- ✅ Mobile (320px+)

Toggle sidebar on mobile: Click hamburger menu

## 🔒 Features

- ✅ Real-time transaction analysis
- ✅ Risk scoring with 4 components
- ✅ Salami attack detection
- ✅ Decision explanations
- ✅ Transaction history
- ✅ Search & filtering
- ✅ Dark mode (always on)

## 📊 Visual Components

- **Circular Risk Gauge**: Shows composite score 0-100
- **Pie Charts**: Risk distribution
- **Bar Charts**: Decision distribution
- **Progress Bars**: Component breakdown
- **Data Tables**: Transaction listings
- **Status Badges**: Color-coded decisions (Green/Yellow/Red)

## 🎨 Color Scheme

- 🟢 **Green (#36d17c)**: APPROVE - Safe to process
- 🟡 **Amber (#e8b84b)**: VERIFY - Needs verification
- 🔴 **Red (#ff6262)**: BLOCK - Blocked for security

## 💡 Pro Tips

1. **Search transactions**: Use Ctrl+F in monitoring page
2. **Filter by risk**: Use dropdowns in monitoring page
3. **View details**: Click "View" button in any transaction row
4. **Back buttons**: Always available to navigate back
5. **Refresh**: Hit refresh in browser to reload data
6. **Real-time**: Dashboard updates on page load (no auto-refresh)

## 📞 Still Have Questions?

Check full documentation:
- `README.md` - Complete documentation
- `IMPLEMENTATION_SUMMARY.md` - Full implementation details
- `.env.example` - Environment variable template

---

**That's it! You're ready to go!** 🎉
