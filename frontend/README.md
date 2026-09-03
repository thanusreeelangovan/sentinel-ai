# SentinelAI Frontend

Modern, premium fintech-grade frontend for AI-driven transaction anomaly detection and fraud prevention.

## 🏗️ Architecture

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS with custom dark fintech design system
- **UI Components**: Reusable, composable component library
- **Charts**: Recharts for data visualization
- **HTTP Client**: Axios for API communication
- **Icons**: Lucide React

## 📁 Project Structure

```
frontend/
├── app/                          # Next.js app directory
│   ├── page.tsx                 # Dashboard (home)
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # Global styles
│   ├── simulator/               # Transaction Simulator
│   ├── processing/              # Transaction Processing
│   ├── monitoring/              # Transaction Monitoring
│   ├── details/[id]/            # Transaction Details
│   ├── salami-alerts/           # Salami Attack Alerts
│   └── settings/                # Settings & Info
├── components/
│   ├── layout/                  # Layout components
│   │   └── AppLayout.tsx        # Main app layout with sidebar
│   ├── ui/                      # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   └── Metric.tsx
│   └── domain/                  # Domain-specific components
│       ├── RiskGauge.tsx        # Circular risk gauge
│       ├── DecisionDisplay.tsx  # Decision card
│       ├── ProcessingPipeline.tsx
│       ├── RiskBreakdownDisplay.tsx
│       └── SalamiIndicatorsDisplay.tsx
├── lib/
│   ├── types.ts                 # TypeScript interfaces
│   ├── api.ts                   # API client
│   └── utils.ts                 # Utility functions
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env.local
```

## 🎨 Design System

### Color Palette

- **Background Primary**: `#15191f`
- **Background Secondary**: `#1c2229`
- **Background Tertiary**: `#20262e`
- **Border Default**: `#2d333b`
- **Text Primary**: `#ffffff`
- **Text Secondary**: `#dbe4ee`
- **Text Tertiary**: `#9ba7b5`
- **Accent Blue**: `#4da3ff`
- **Decision Approve**: `#36d17c`
- **Decision Verify**: `#e8b84b`
- **Decision Block**: `#ff6262`

### Typography

- **Font Family**: Segoe UI, Arial, sans-serif
- **Heading Sizes**: 4xl (28px), 3xl (23px), 2xl (19px), lg (15px)
- **Body**: 14px

## 📋 Pages & Features

### 1. Dashboard (`/`)
- Real-time KPIs (Total Transactions, Approved, Verified, Blocked)
- Risk distribution pie chart
- Decision distribution bar chart
- Recent transactions table
- Amount protected metrics

### 2. Transaction Simulator (`/simulator`)
- Form to create new transactions
- Fields: User ID, Sender ID, Receiver ID, Amount, Currency, Device Type, Location
- Initiates transaction evaluation
- Redirects to processing page

### 3. Transaction Processing (`/processing`)
- Animated processing pipeline showing 7 steps
- Real-time risk gauge visualization
- Risk breakdown display
- Final decision with explanation
- Salami attack indicators (if detected)
- Links to monitoring and detail pages

### 4. Transaction Monitoring (`/monitoring`)
- Full transaction table with columns:
  - Transaction ID
  - User
  - Timestamp
  - Amount
  - Risk Score
  - Salami Risk Level
  - Decision
- Search functionality (ID, User)
- Filters: Decision, Risk Level
- Click-through to transaction details

### 5. Transaction Details (`/details/[id]`)
- Full transaction information
- Risk breakdown with weighted scores
- Salami attack indicators (if applicable)
- Cumulative suspicious amount (if applicable)
- Complete audit trail
- Links back to monitoring

### 6. Salami Attack Alerts (`/salami-alerts`)
- Dedicated Salami attack detection view
- Alert summary cards (Critical, High, Medium, Low)
- Search and filter alerts
- Indicators count
- Decision status
- Detected timestamp

### 7. Settings (`/settings`)
- Application information
- Risk decision thresholds
- Risk scoring model breakdown
- Feature list

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (currently using v25.8.2)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.local .env.local  # Already configured
```

Update `NEXT_PUBLIC_API_URL` if backend is on a different host:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build & Production

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

### Type Checking

Check TypeScript errors:
```bash
npm run type-check
```

## 📡 API Integration

The frontend communicates with the backend via the REST API defined in `lib/api.ts`:

### Base Endpoints

- `POST /transactions/evaluate` - Evaluate a transaction
- `GET /transactions` - Get all transactions
- `GET /transactions/{transaction_id}` - Get single transaction
- `GET /transactions/alerts/salami` - Get Salami attack alerts
- `GET /dashboard/summary` - Get dashboard metrics
- `GET /dashboard/risk-distribution` - Get risk distribution
- `GET /health` - Health check

### Transaction Fields (Preserved from Backend)

The frontend preserves all backend field names:
- `transaction_id`
- `user_id`
- `sender_id`
- `receiver_id`
- `receiver_type`
- `amount`
- `currency`
- `timestamp`
- `device_id`
- `device_type`
- `location`
- `ip_address`

### Response Fields

Backend response is strictly typed per contract:
- `composite_score` - 0-100 risk score
- `decision` - APPROVE | VERIFY | BLOCK
- `risk_breakdown` - { anomaly, velocity, receiver, behavioral }
- `reason_codes` - Array of reason codes

Optional fields (when backend adds them):
- `salami_attack_detected`
- `salami_indicators`
- `salami_risk_level`
- `cumulative_suspicious_amount`
- `explanation`

## 🔧 Configuration

### Tailwind CSS

Dark fintech colors and spacing customized in `tailwind.config.ts`:
- Custom color scales
- Custom spacing values
- Box shadows for depth
- Border radius scales

### Next.js

Configured in `next.config.ts`:
- TypeScript support
- Path aliases (`@/*`)
- Strict mode enabled

## 🛠️ Development Patterns

### Creating New Pages

1. Create file in `app/` directory
2. Use `"use client"` directive for client-side interactivity
3. Wrap with `<AppLayout>` component
4. Import domain components as needed

Example:
```typescript
"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";

export default function NewPage() {
  return (
    <AppLayout>
      <Card>
        {/* Content */}
      </Card>
    </AppLayout>
  );
}
```

### Creating New Components

1. **UI Components** (`components/ui/`): Base, reusable components
   - Use Tailwind CVA for variants
   - Export React.forwardRef for flexibility

2. **Domain Components** (`components/domain/`): Business logic components
   - Risk gauges, decision displays, etc.
   - Can use multiple UI components

### API Integration

Use the `transactionAPI` client from `lib/api.ts`:

```typescript
import { transactionAPI } from "@/lib/api";

const data = await transactionAPI.getTransactions();
```

All requests are typed with TypeScript interfaces from `lib/types.ts`.

## 📦 Dependencies

### Core
- `react` - UI library
- `react-dom` - DOM rendering
- `next` - Framework

### Data Visualization
- `recharts` - Charts and graphs

### Styling
- `tailwindcss` - Utility CSS
- `clsx` - Class name utilities
- `class-variance-authority` - Component variants

### HTTP
- `axios` - HTTP client

### Icons
- `lucide-react` - Icon library

### Development
- `typescript` - Type safety
- `eslint` - Code linting
- `autoprefixer` - CSS prefixing
- `postcss` - CSS processing

## 🎯 Next Steps

### Backend Integration
1. Ensure backend API is running on `http://localhost:8000`
2. Implement endpoints according to contract
3. Test with real transaction data

### Enhancements
- Add real-time WebSocket for live updates
- Implement authentication/authorization
- Add transaction export functionality
- Build admin dashboard
- Add notification system
- Implement transaction history charts
- Add user preferences storage

### Production
- Deploy to hosting (Vercel, AWS, etc.)
- Configure environment variables
- Set up monitoring and error tracking
- Configure CORS for backend
- Add rate limiting
- Implement caching strategies

## 📝 Notes

- All pages are fully typed with TypeScript
- Responsive design (mobile, tablet, desktop)
- Dark mode fintech aesthetic throughout
- Professional, premium appearance
- No hardcoded fake data in production code
- Mock data only used while backend unavailable
- API is source of truth when available

## 🚨 Troubleshooting

### Backend Connection Failed
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify backend is running
- Check CORS configuration
- Look for network errors in browser console

### Components Not Rendering
- Ensure `"use client"` directive at top of client components
- Check TypeScript errors with `npm run type-check`
- Verify imports use correct paths

### Styling Issues
- Clear `.next` cache: `rm -rf .next`
- Rebuild: `npm run build`
- Check Tailwind CSS configuration

## 📞 Support

For issues or questions, refer to the project documentation or contact the development team.
