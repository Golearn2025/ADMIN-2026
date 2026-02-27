# Vantage Lane Admin Enterprise

Enterprise-ready admin dashboard pentru Vantage Lane, construit cu Next.js 14+, TypeScript, și design sistem dark + gold premium.

## 🎯 Status Implementare

### ✅ FAZA 0 - UI Skeleton (COMPLETAT)

Layout enterprise complet, navigație funcțională, design system, și structură de bază pregătită pentru integrare cu baza de date.

## 🛠 Stack Tehnologic

### Core
- **Next.js 15.5** (App Router) - Framework React production-ready
- **TypeScript** (strict mode) - Type safety complet
- **React 19** - Ultima versiune

### UI & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** (Radix UI) - Componente accesibile și customizabile
- **lucide-react** - Iconițe moderne și consistente
- **Dark + Gold Theme** - Design premium Vantage Lane
  - Background: `#0B0F14`
  - Surface: `#101824`
  - Gold Accent: `#D6B25E`
  - Text: `#E8EEF6`

### State Management
- **Zustand** - UI state management (sidebar collapse, filters)
- **React Query** (TanStack Query) - Data fetching și cache (pregătit pentru FAZA 1)

### Database (pregătit pentru FAZA 1)
- **Supabase** - PostgreSQL database cu view-uri optimizate
- Anon key pentru citire din VIEW-uri
- Service role pentru operații admin (API routes)

### Code Quality
- **ESLint** - Linting strict
- **Prettier** - Code formatting consistent
- **TypeScript strict** - Zero compromisuri pe type safety

## 📁 Structură Proiect

```
vantage-lane-admin-enterprise/
├── app/
│   ├── (admin)/              # Grup de rute admin
│   │   ├── layout.tsx        # Layout cu AppShell + Sidebar + Topbar
│   │   ├── dashboard/        # Dashboard principal
│   │   ├── bookings/         # Gestionare rezervări
│   │   ├── jobs/             # Job tracking
│   │   ├── live-map/         # Hartă live drivers
│   │   ├── payments/         # Gestionare plăți
│   │   ├── refunds/          # Procesare refund-uri
│   │   ├── financials/       # Overview financiar
│   │   ├── drivers/          # Gestionare șoferi
│   │   ├── vehicles/         # Fleet management
│   │   ├── documents/        # Documente șoferi/vehicule
│   │   ├── customers/        # Gestionare clienți
│   │   ├── billing/          # Facturare clienți
│   │   ├── team/             # Team & permisiuni
│   │   ├── organizations/    # Gestionare organizații
│   │   ├── settings/         # Setări aplicație
│   │   └── sign-out/         # Sign out redirect
│   ├── globals.css           # Stiluri globale + CSS variables
│   ├── layout.tsx            # Root layout cu font Inter
│   └── page.tsx              # Root redirect la dashboard
│
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx     # Container principal (topbar, sidebar, content)
│   │   ├── sidebar.tsx       # Sidebar collapsible cu groups + accordion
│   │   ├── topbar.tsx        # Topbar cu logo + user menu placeholder
│   │   └── index.ts          # Exports centralizate
│   ├── common/
│   │   ├── page-header.tsx   # Header reutilizabil cu title, subtitle, actions
│   │   ├── empty-state.tsx   # Empty state cu icon, title, description, action
│   │   └── index.ts          # Exports centralizate
│   └── ui/
│       ├── button.tsx        # shadcn Button cu variante
│       └── accordion.tsx     # shadcn Accordion pentru sidebar groups
│
├── lib/
│   ├── nav.ts                # Nav config centralizat (toate rutele)
│   └── utils.ts              # Utilități (cn pentru class merge)
│
├── stores/
│   └── ui-store.ts           # Zustand store (sidebar collapse state)
│
└── styles/                   # (pregătit pentru assets viitoare)
```

## 🎨 Design System

### Culori (CSS Variables)
Toate culorile sunt definite în `app/globals.css` ca HSL values:

```css
--background: 215 24% 7%      /* #0B0F14 - Background principal */
--card: 216 24% 10%           /* #101824 - Surface cards */
--primary: 42 55% 61%         /* #D6B25E - Gold accent */
--foreground: 216 25% 91%     /* #E8EEF6 - Text principal */
--muted-foreground: 216 15% 65% /* Text secundar */
```

### Componente UI (shadcn/ui)
- **Button** - 4 variante: default, outline, ghost, secondary
- **Accordion** - Pentru sidebar groups collapsible
- Badge, Card, Input, etc. (se adaugă la cerere)

### Spacing & Typography
- Font: **Inter** (Google Fonts)
- Border radius: `0.5rem` (customizabil via `--radius`)
- Spacing consistent via Tailwind utilities

## 🗺 Navigație Implementată

### Sidebar Structure

**Dashboard** (link direct)
- `/dashboard` - Overview metrics și activity

**Bookings** (accordion)
- `/bookings` - Toate rezervările
- `/jobs` - Job assignments
- `/live-map` - Hartă live cu șoferi

**Finance** (accordion)
- `/payments` - Tranzacții plăți
- `/refunds` - Gestionare refund-uri
- `/financials` - Overview financiar

**Fleet** (accordion)
- `/drivers` - Profile șoferi
- `/vehicles` - Fleet vehicule
- `/documents` - Documente

**Customers** (accordion)
- `/customers` - Profiluri clienți
- `/billing` - Facturare

**Organization** (accordion)
- `/team` - Team members & roles
- `/organizations` - Setări organizații

**Bottom Nav (sticky)**
- `/settings` - Setări aplicație
- `/sign-out` - Sign out action

### Features Sidebar
- **Collapsible** - Buton toggle pentru expand/collapse
- **Persistent state** - Zustand + localStorage
- **Active state** - Highlight pe rută curentă
- **Icons** - Iconițe pentru fiecare grup și item
- **Responsive** - Pe mobil devine drawer (pregătit)

## 🚀 Cum Rulezi Proiectul

### Prerequisite
- Node.js 18+ (recomandat 20+)
- npm sau pnpm

### Instalare

```bash
# Instalare dependințe
npm install

# Rulare în development
npm run dev

# Build pentru production
npm run build

# Start production server
npm start
```

### Development Server
Aplicația va rula pe **http://localhost:3000** (sau alt port specificat)

### Scripts Disponibile

```bash
npm run dev      # Development server cu hot reload
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm run format   # Format cu Prettier
```

## 📋 Reguli Enterprise (Code Guidelines)

### Structură & Organizare
✅ **Max 250 linii/fișier** - Componente mici și focusate
✅ **Separation of concerns** - Paginile doar compun componente, zero logică
✅ **Config centralizat** - Nav în `lib/nav.ts`, constante în `lib/`
✅ **Componente reutilizabile** - În `components/common/`
✅ **Type safety** - TypeScript strict, zero `any`

### Naming Conventions
- **Componente**: PascalCase (`PageHeader.tsx`)
- **Utilities**: camelCase (`utils.ts`)
- **CSS modules**: kebab-case (când se folosesc)
- **Foldere**: kebab-case (`common/`, `layout/`)

### Import Order
1. React / Next.js
2. External libraries
3. Internal components
4. Utilities & types
5. Styles

## 🎯 Următorii Pași (Roadmap)

### Pas 5: Common Kit
Componente reutilizabile pentru a evita duplicare:
- `LoadingSkeleton` - Loading states consistente
- `Badge` - Status badges (pending, confirmed, completed, etc.)
- `StatCard` - Cards pentru metrici în dashboard
- `FiltersBar` - Toolbar pentru filtre (placeholder)

### Pas 6: DataTableShell
Framework reutilizabil pentru toate listele:
- Toolbar (search input + filters)
- Table container generic (acceptă columns + rows)
- Pagination UI
- Sorting UI (pregătit pentru backend)

### Pas 7: FAZA 1 - DB Integration
Prima integrare completă cu Supabase:
- **Bookings List** - citire din `admin_bookings_list_v1`
- **Booking Details** - citire din view-uri detalii
- React Query pentru cache și optimistic updates
- API routes server-side pentru operații write (service role)

### Pas 8+: Module Complete
- **Payments Module** - `admin_latest_booking_payment`
- **Refunds Module** - `admin_refunds_list`
- **Financials Module** - `admin_latest_booking_financials`
- **Fleet Module** - Drivers + Vehicles (read-only inițial)
- **Live Map** - `driver_locations` + Mapbox + realtime

## 🔒 Securitate & Best Practices

### Database Access Pattern
- **Citire**: Supabase anon key + VIEW-uri optimizate (RLS activat)
- **Scriere**: API routes server-side cu service role key
- **Contract-first**: UI citește DOAR din view-uri, nu face JOIN-uri

### Type Safety
- Toate tipurile vor fi generate din Supabase schema
- Zero `any`, folosim `unknown` când e necesar
- Validare input cu Zod (se adaugă în FAZA 1)

### Performance
- React Query pentru cache inteligent
- Pagination server-side (nu client-side)
- Lazy loading pentru componente mari
- Optimistic updates pentru UX fluid

## 📝 Convenții Git

### Commit Messages
```
feat: Add DataTableShell component
fix: Sidebar collapse state persistence
refactor: Extract common filters to FiltersBar
docs: Update README with setup instructions
```

### Branch Strategy
- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

## 🤝 Contributing

Acest proiect urmează "enterprise rules":
1. Toate fișierele sub 250 linii
2. TypeScript strict, zero compromisuri
3. Componente reutilizabile, zero duplicare
4. Testare înainte de merge (când se implementează)
5. Code review obligatoriu

## 📄 License

Private - Vantage Lane Internal Use Only

---

**Built with ❤️ for Vantage Lane**

*Version: 0.1.0 (FAZA 0 - UI Skeleton Complete)*
