# TreeSure Admin - Reorganized Code Structure

## Overview
The codebase has been reorganized into a clean, modular structure with separation of concerns.

## Directory Structure

```
treesure_admin/
├── index.html                    # Entry point (redirects to login)
├── public/                       # Static files
├── assets/                       # Images, icons, fonts
├── package.json
├── package-lock.json
└── src/
    ├── auth/                     # Authentication pages
    │   ├── login/
    │   │   ├── index.html        # Main login page
    │   │   ├── login.css         # Login & signup shared styles
    │   │   └── login-alt.html    # Alternative login (backup)
    │   ├── signup/
    │   │   ├── signup.html       # Account creation
    │   │   └── signup.js*        # Auth logic
    │   └── landing/
    │       └── landing.html      # Landing/home page
    │
    ├── admin/                    # Admin dashboard pages
    │   ├── dashboard/
    │   │   ├── dashboard.html
    │   │   ├── dashboard.css
    │   │   └── dashboard.js
    │   │
    │   ├── applications/
    │   │   ├── applications.html
    │   │   ├── applications.css
    │   │   ├── application.js
    │   │   └── application-temp-fix.js  # Compatibility layer
    │   │
    │   ├── reports/
    │   │   ├── reports.html
    │   │   ├── reports.css
    │   │   └── reports.js
    │   │
    │   ├── users/
    │   │   ├── users.html
    │   │   ├── users.css
    │   │   └── users.js
    │   │
    │   ├── settings/
    │   │   ├── settings.html
    │   │   ├── settings.css
    │   │   └── settings.js
    │   │
    │   └── shared/               # Layout components
    │       ├── sidebar.html
    │       ├── sidebar.css
    │       ├── topbar.css
    │       └── js/
    │           ├── treeInventory.js
    │           └── trees.js
    │
    └── shared/                   # Core utilities & config
        ├── firebase-config.js
        ├── script.js            # Core auth & utilities
        └── signup.js            # Signup logic
```

## Changes Made

### Removed (Unused/Redundant Files)
- `app.html` - commented out/empty
- `mvc/` folder - controller.js, model.js, view.js (never referenced)
- `css/style.css` - unused
- `css/regtrees.css` - unused
- `js/main.js` - unused, referenced non-existent controller.js

### Improvements
✅ **Better separation of concerns** - Auth pages separate from admin pages
✅ **Cleaner imports** - All files use correct relative paths
✅ **Modular structure** - Each feature has its own folder
✅ **Shared assets** - Common layout components in `src/admin/shared/`
✅ **Core utilities** - Firebase config and auth in `src/shared/`

## File Organization by Feature

### Authentication (`src/auth/`)
- Login, signup, and landing pages
- All auth-related styles in login.css
- signup.js handles account creation logic

### Admin Dashboard (`src/admin/`)
- **Dashboard**: Main overview page with statistics
- **Applications**: Applicant management & document handling
- **Reports**: Analytics and data export
- **Users**: User management interface
- **Settings**: Admin preferences & configurations
- **Shared**: Sidebar navigation & topbar components

### Core Utilities (`src/shared/`)
- **firebase-config.js**: Firebase initialization
- **script.js**: Authentication, user checks, global utilities
- **signup.js**: Account creation logic

## Import Paths

### From auth pages → shared resources
```javascript
import { functionName } from "../../shared/script.js";
```

### From admin pages → shared resources
```javascript
import { functionName } from "../../shared/script.js";
```

### From admin subpages → admin shared
```javascript
import { functionName } from "../admin/shared/sidebar.html";
```

## Asset Paths

All assets are in the root `assets/` folder:
```
assets/
├── images/
│   └── treesurelogo.png
├── fonts/
├── icons/
```

Asset paths from HTML files:
- From `src/auth/*`: `../../assets/...`
- From `src/admin/*`: `../../../assets/...`

## Entry Point

Users start at `/index.html` which redirects to the login page:
```
/ (index.html) → /src/auth/login/index.html
└─ Dashboard at: /src/admin/dashboard/dashboard.html
```

## Development Notes

### Adding New Features
1. Create feature folder under `src/admin/`
2. Include: `feature.html`, `feature.css`, `feature.js`
3. Update sidebar navigation in `src/admin/shared/sidebar.html`
4. Use correct import paths for shared utilities

### Updating Imports
When modifying JS files, remember path depths:
- Pages in `src/admin/{page}/` → go up 2 levels: `../../shared/`
- Pages in `src/auth/{page}/` → go up 2 levels: `../../shared/`

