# PROJ-4: Solution Architecture - Rollen und Berechtigungen

## Status: Draft

**Erstellt:** 2026-02-10
**Feature Spec:** [PROJ-4-roles.md](./PROJ-4-roles.md)

---

## 1. Übersicht

Dieses Dokument beschreibt die technische Architektur für das Rollen-basierte Zugriffskontrollsystem (RBAC). Das Feature ermöglicht drei Admin-Rollen (Super-Admin, Admin, Viewer) mit hierarchischen Berechtigungen und eine dedizierte User-Verwaltungsseite für Super-Admins.

### Scope

```
Rollen & Berechtigungen (RBAC)
├── User-Verwaltung (nur Super-Admin)
│   ├── User-Liste mit Rollen-Filter
│   ├── Rollen-Änderung
│   └── Account aktivieren/deaktivieren
├── Middleware für Berechtigungsprüfung
├── UI-Berechtigungen (Feature-Gating)
├── Rollen-Badge im Header
└── Audit-Logging für Rollen-Änderungen
```

---

## 2. Komponenten-Struktur

### 2.1 Seitenstruktur (Page Routes)

```
/settings
├── /users                    [NEU] User-Verwaltung (nur Super-Admin)
└── page.tsx                  [ERWEITERN] Neue Card "User-Verwaltung"

/dashboard
└── layout.tsx                [ERWEITERN] Rollen-Badge im Header
```

**Dateien:**
```
src/app/[locale]/(protected)/
├── settings/
│   ├── page.tsx                      [ERWEITERN] Card für User-Verwaltung
│   └── users/
│       └── page.tsx                  [NEU] User-Verwaltung
├── layout.tsx                        [ERWEITERN] Rollen-Badge im Header
└── middleware.ts                     [NEU] Rollen-Middleware

src/middleware.ts                     [ERWEITERN] Auth + Rollen-Check
```

### 2.2 UI-Komponenten-Baum

```
Settings-Hauptseite (page.tsx)
└── Card: "User-Verwaltung" → Link zu /settings/users (nur Super-Admin sichtbar)

User-Verwaltung (/settings/users)
├── Header
│   ├── Zurück-Button
│   ├── Titel "Benutzerverwaltung"
│   └── Suchfeld (Name/Email)
├── Filters-Bar
│   ├── Rollen-Filter (Super-Admin, Admin, Viewer, Alle)
│   └── Status-Filter (Aktiv, Deaktiviert, Alle)
├── Users-Table
│   ├── Tabellenkopf
│   │   ├── Name
│   │   ├── Email
│   │   ├── Rolle
│   │   ├── Status
│   │   ├── Letzter Login
│   │   └── Aktionen
│   └── Tabellenzeilen
│       ├── Avatar + Name
│       ├── Email
│       ├── Rollen-Badge (editierbar für Super-Admin)
│       ├── Status-Badge (Aktiv/Deaktiviert)
│       ├── Letztes Login-Datum
│       └── Actions-Dropdown
│           ├── [Rolle ändern]
│           ├── [Deaktivieren/Aktivieren]
│           └── [Audit-Log anzeigen]
└── Dialogs
    ├── Change-Role-Dialog (mit MFA-Bestätigung)
    ├── Deactivate-User-Dialog
    └── Activate-User-Dialog

App-Layout (Alle Seiten)
├── Header
│   └── User-Menu
│       ├── Avatar + Name
│       ├── Rollen-Badge (Super-Admin/Admin/Viewer)
│       └── Dropdown
│           ├── Profil
│           ├── Einstellungen
│           └── Abmelden
```

### 2.3 Neue Komponenten

| Komponente | Pfad | Beschreibung |
|------------|------|--------------|
| `UsersTable` | `src/components/settings/users-table.tsx` | Haupttabelle für User-Verwaltung |
| `RoleBadge` | `src/components/ui/role-badge.tsx` | Rollen-Anzeige (rot/blau/grau) |
| `ChangeRoleDialog` | `src/components/settings/change-role-dialog.tsx` | Rollen-Änderung mit MFA |
| `DeactivateUserDialog` | `src/components/settings/deactivate-user-dialog.tsx` | Account deaktivieren |
| `UserStatusBadge` | `src/components/ui/user-status-badge.tsx` | Status-Badge (Aktiv/Deaktiviert) |
| `requireRole()` | `src/lib/auth/require-role.ts` | Server-seitige Rollen-Prüfung |
| `usePermissions()` | `src/hooks/use-permissions.ts` | Client-Hook für Berechtigungen |

---

## 3. Daten-Modell

### 3.1 Erweiterte Tabelle: `user_profiles`

**WICHTIG:** Tabelle existiert bereits, wird nur erweitert!

```sql
-- Neue Spalten hinzufügen
ALTER TABLE user_profiles
  ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('super_admin', 'admin', 'viewer')),
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN last_login_at TIMESTAMPTZ;

-- Index für Performance
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);
```

### 3.2 Neue Tabelle: `user_role_audit_log`

Protokolliert alle Rollen-Änderungen und Account-Status-Änderungen.

```sql
CREATE TABLE user_role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Wer hat geändert?
  actor_id UUID NOT NULL REFERENCES user_profiles(id),

  -- Wer wurde geändert?
  target_user_id UUID NOT NULL REFERENCES user_profiles(id),

  -- Was wurde geändert?
  action TEXT NOT NULL CHECK (action IN ('role_change', 'activate', 'deactivate')),

  -- Bei Rollen-Änderung: Alte und neue Rolle
  old_role TEXT CHECK (old_role IN ('super_admin', 'admin', 'viewer')),
  new_role TEXT CHECK (new_role IN ('super_admin', 'admin', 'viewer')),

  -- Bei Status-Änderung: Grund
  reason TEXT,

  -- Metadaten
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indizes
CREATE INDEX idx_audit_log_target_user ON user_role_audit_log(target_user_id);
CREATE INDEX idx_audit_log_actor ON user_role_audit_log(actor_id);
CREATE INDEX idx_audit_log_created_at ON user_role_audit_log(created_at DESC);
```

### 3.3 Beziehungen

```
user_profiles
├── id (PK)
├── email
├── name
├── role (super_admin | admin | viewer)
├── is_active (boolean)
├── last_login_at
└── mfa_enabled

user_role_audit_log
├── id (PK)
├── actor_id (FK → user_profiles)
├── target_user_id (FK → user_profiles)
├── action
├── old_role / new_role
└── created_at
```

### 3.4 Datenbank-Migration

**Datei:** `supabase/migrations/YYYYMMDD_add_user_roles.sql`

```sql
-- 1. Spalten hinzufügen
ALTER TABLE user_profiles
  ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('super_admin', 'admin', 'viewer')),
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN last_login_at TIMESTAMPTZ;

-- 2. Erster User wird Super-Admin
UPDATE user_profiles
SET role = 'super_admin'
WHERE id = (SELECT id FROM user_profiles ORDER BY created_at ASC LIMIT 1);

-- 3. Audit-Log Tabelle
CREATE TABLE user_role_audit_log (
  -- siehe 3.2
);

-- 4. Indizes
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX idx_audit_log_target_user ON user_role_audit_log(target_user_id);
CREATE INDEX idx_audit_log_actor ON user_role_audit_log(actor_id);

-- 5. RLS Policies (siehe Abschnitt 11)
```

---

## 4. API-Design

### 4.1 Server Actions

**Datei:** `src/app/[locale]/(protected)/settings/users/actions.ts`

| Action | Beschreibung | Rolle |
|--------|--------------|-------|
| `getAllUsers()` | Alle User mit Rollen laden | Super-Admin |
| `getUserById(userId)` | Einzelnen User laden | Super-Admin |
| `changeUserRole(userId, newRole, mfaCode)` | Rolle ändern (mit MFA) | Super-Admin |
| `deactivateUser(userId, reason)` | User deaktivieren | Super-Admin |
| `activateUser(userId)` | User aktivieren | Super-Admin |
| `getUserAuditLog(userId)` | Audit-Log für User laden | Super-Admin |
| `getSuperAdminCount()` | Anzahl Super-Admins (für "letzter Super-Admin"-Check) | Super-Admin |

**Datei:** `src/lib/auth/permissions.ts`

| Function | Beschreibung |
|----------|--------------|
| `getCurrentUserRole()` | Rolle des aktuellen Users laden |
| `requireRole(role)` | Server-seitige Middleware für Rollen-Check |
| `can(action)` | Prüft ob User eine Aktion ausführen darf |
| `isSuperAdmin()` | Prüft ob User Super-Admin ist |
| `isAdmin()` | Prüft ob User Admin oder Super-Admin ist |

### 4.2 Datenfluss: Rolle ändern

```
Client                          Server                      Datenbank
──────                          ──────                      ──────────

1. User klickt "Rolle ändern"
   ───────────────────────────►
                                changeUserRole(userId, newRole, mfaCode)
                                ├── requireRole('super_admin') ─────────►
                                ├── MFA-Code validieren
                                ├── Prüfe: Ist User der letzte Super-Admin?
                                │   └── getSuperAdminCount() ──────────►
                                │       ◄───────────────────────────────
                                ├── UPDATE user_profiles SET role = ...
                                │   ───────────────────────────────────►
                                │   ◄───────────────────────────────────
                                └── INSERT INTO user_role_audit_log
                                    ───────────────────────────────────►
                                    ◄───────────────────────────────────
   ◄───────────────────────────
   Toast: "Rolle erfolgreich geändert"
   revalidatePath('/settings/users')
```

### 4.3 Datenfluss: Session-Update bei Rollen-Änderung

```
User A (aktiv eingeloggt, Rolle: Admin)
  │
  │ Super-Admin ändert Rolle zu "Viewer"
  │
  ▼
Nächste API-Anfrage von User A
  │
  ├── Middleware lädt aktuelle Rolle aus DB
  ├── Erkennt: Rolle geändert (admin → viewer)
  ├── Session wird aktualisiert
  └── API-Response mit neuen Berechtigungen

UI aktualisiert sich automatisch (neue Rolle wirkt sofort)
```

---

## 5. Wiederverwendbare Komponenten

### 5.1 Bestehende UI-Komponenten (nutzen)

| Komponente | Verwendung |
|------------|------------|
| `Table`, `TableHeader`, `TableRow`, `TableCell` | User-Tabelle |
| `Dialog`, `DialogContent`, `DialogHeader` | Rollen-Änderung, Deaktivierung |
| `Button` | Alle Buttons |
| `Input` | Suchfeld, MFA-Code-Eingabe |
| `Select`, `SelectContent`, `SelectItem` | Rollen-Filter, Rollen-Auswahl |
| `Badge` | Rollen-Badge, Status-Badge |
| `Avatar`, `AvatarImage`, `AvatarFallback` | User-Avatar |
| `DropdownMenu` | Actions-Dropdown |
| `toast` (sonner) | Erfolgs-/Fehlermeldungen |
| `AlertDialog` | Bestätigungsdialog (Deaktivierung) |

### 5.2 Bestehende Patterns (übernehmen)

| Pattern | Quelle | Verwendung |
|---------|--------|------------|
| Settings-Seiten-Layout | `account-types/page.tsx` | Header, Zurück-Button |
| Table mit Actions | `account-types-table.tsx` | Tabellen-Struktur |
| Role-Check in Server Action | `projections/actions.ts` | `requireRole()` Pattern |
| Audit-Logging | Neue Implementierung | Alle Rollen-Änderungen loggen |

---

## 6. Zustandsverwaltung

### 6.1 Client State

```typescript
UsersPage (State)
├── users: UserProfile[]              // Alle User
├── filteredUsers: UserProfile[]      // Nach Filter/Suche
├── searchQuery: string               // Suchbegriff
├── roleFilter: Role | 'all'          // Rollen-Filter
├── statusFilter: 'active' | 'inactive' | 'all'
├── selectedUser: UserProfile | null  // Für Dialogs
└── isLoading: boolean
```

### 6.2 Server State

- User-Liste wird initial vom Server geladen
- Nach Änderungen: `revalidatePath('/settings/users')`
- `router.refresh()` für Client-Update

### 6.3 Permissions Context (Optional)

Für globale Berechtigungsprüfung im UI:

```typescript
// src/context/permissions-context.tsx
const PermissionsContext = React.createContext<{
  role: Role;
  can: (action: string) => boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}>();

// Verwendung:
const { can, isSuperAdmin } = usePermissions();

if (can('manage_users')) {
  // Zeige User-Verwaltung
}
```

---

## 7. Berechtigungs-Matrix

### 7.1 Feature-Gating (UI-Sichtbarkeit)

| Feature | Super-Admin | Admin | Viewer |
|---------|-------------|-------|--------|
| User-Verwaltung Seite | ✅ | ❌ | ❌ |
| Versicherte anlegen/bearbeiten | ✅ | ✅ | ❌ |
| Arbeitgeber anlegen/bearbeiten | ✅ | ✅ | ❌ |
| Dokumente hochladen | ✅ | ✅ | ❌ |
| Berechnungen durchführen | ✅ | ✅ | ❌ |
| Reports erstellen | ✅ | ✅ | ❌ |
| Alle Daten ansehen | ✅ | ✅ | ✅ |
| Eigenes Profil bearbeiten | ✅ | ✅ | ✅ |

### 7.2 API-Berechtigungen

```typescript
// Server-seitige Prüfung in jeder Action
export async function createInsuredPerson(data: InsuredPersonInput) {
  await requireRole(['super_admin', 'admin']); // Wirft 403 wenn nicht berechtigt

  // ... Implementation
}

// Verwendung in Components:
const { can } = usePermissions();

{can('create_insured_person') && (
  <Button>Neue versicherte Person</Button>
)}
```

---

## 8. Middleware

### 8.1 Rollen-Middleware

**Datei:** `src/middleware.ts` (erweitern)

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // 1. Auth-Check
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2. User-Profile mit Rolle laden
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('id', session.user.id)
    .single();

  // 3. Deaktivierte User ausloggen
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=account_deactivated', req.url));
  }

  // 4. Rollen-basierte Route-Protection
  const path = req.nextUrl.pathname;

  if (path.startsWith('/settings/users') && profile.role !== 'super_admin') {
    return NextResponse.redirect(new URL('/dashboard?error=unauthorized', req.url));
  }

  // 5. Rolle in Header setzen (für Server Components)
  res.headers.set('x-user-role', profile.role);

  return res;
}

export const config = {
  matcher: [
    '/(protected)/:path*',
    '/settings/:path*',
    '/dashboard/:path*'
  ]
};
```

### 8.2 Server Action Helper

**Datei:** `src/lib/auth/require-role.ts`

```typescript
import { createServerClient } from '@/lib/supabase/server';

export async function requireRole(allowedRoles: Role[]) {
  const supabase = createServerClient();

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('id', session.user.id)
    .single();

  if (!profile?.is_active) {
    throw new Error('Account deactivated');
  }

  if (!allowedRoles.includes(profile.role)) {
    throw new Error('Forbidden');
  }

  return { userId: session.user.id, role: profile.role };
}

// Verwendung:
export async function changeUserRole(targetUserId: string, newRole: Role) {
  await requireRole(['super_admin']); // Wirft Error wenn nicht Super-Admin

  // ... Implementation
}
```

---

## 9. Validierung

### 9.1 Client-seitige Validierung

| Feld | Regel | Nachricht |
|------|-------|-----------|
| Rolle | super_admin, admin, viewer | "Ungültige Rolle" |
| MFA-Code | 6 Ziffern | "MFA-Code muss 6 Ziffern haben" |
| Deaktivierungs-Grund | min. 10 Zeichen | "Bitte Grund angeben (mind. 10 Zeichen)" |

### 9.2 Server-seitige Validierung

```typescript
// Bei Rollen-Änderung:
export async function changeUserRole(
  targetUserId: string,
  newRole: Role,
  mfaCode: string
) {
  const { userId } = await requireRole(['super_admin']);

  // 1. MFA validieren
  const isMfaValid = await verifyMfaCode(userId, mfaCode);
  if (!isMfaValid) {
    throw new Error('Ungültiger MFA-Code');
  }

  // 2. Prüfe: User versucht eigene Rolle zu ändern
  if (targetUserId === userId) {
    throw new Error('Sie können Ihre eigene Rolle nicht ändern');
  }

  // 3. Prüfe: Letzter Super-Admin
  if (newRole !== 'super_admin') {
    const { data: currentUser } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', targetUserId)
      .single();

    if (currentUser?.role === 'super_admin') {
      const { count } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'super_admin');

      if (count === 1) {
        throw new Error('Der letzte Super-Admin kann nicht herabgestuft werden');
      }
    }
  }

  // 4. Rolle ändern
  const { data: oldUser } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', targetUserId)
    .single();

  await supabase
    .from('user_profiles')
    .update({ role: newRole })
    .eq('id', targetUserId);

  // 5. Audit-Log
  await supabase.from('user_role_audit_log').insert({
    actor_id: userId,
    target_user_id: targetUserId,
    action: 'role_change',
    old_role: oldUser.role,
    new_role: newRole,
  });

  revalidatePath('/settings/users');
}
```

---

## 10. Rollen-Badge Implementierung

### 10.1 RoleBadge Component

**Datei:** `src/components/ui/role-badge.tsx`

```typescript
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Role = 'super_admin' | 'admin' | 'viewer';

const ROLE_CONFIG = {
  super_admin: {
    label: 'Super-Admin',
    variant: 'destructive', // rot
    description: 'Vollzugriff auf alle Funktionen'
  },
  admin: {
    label: 'Admin',
    variant: 'default', // blau
    description: 'Kann Daten bearbeiten'
  },
  viewer: {
    label: 'Viewer',
    variant: 'secondary', // grau
    description: 'Nur Lese-Zugriff'
  }
} as const;

export function RoleBadge({ role }: { role: Role }) {
  const config = ROLE_CONFIG[role];

  return (
    <Badge variant={config.variant} title={config.description}>
      {config.label}
    </Badge>
  );
}
```

### 10.2 Integration im Header

**Datei:** `src/app/[locale]/(protected)/layout.tsx`

```typescript
import { RoleBadge } from '@/components/ui/role-badge';
import { getCurrentUserRole } from '@/lib/auth/permissions';

export default async function ProtectedLayout({ children }) {
  const role = await getCurrentUserRole();

  return (
    <div>
      <header>
        <UserMenu>
          <div className="flex items-center gap-2">
            <Avatar />
            <div>
              <p className="font-medium">{user.name}</p>
              <RoleBadge role={role} />
            </div>
          </div>
        </UserMenu>
      </header>
      {children}
    </div>
  );
}
```

---

## 11. Sicherheit

### 11.1 Row Level Security (RLS)

**Policies für `user_profiles`:**

```sql
-- Super-Admin kann alle User sehen
CREATE POLICY "super_admin_can_view_all_users"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Jeder User kann sein eigenes Profil sehen
CREATE POLICY "users_can_view_own_profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Nur Super-Admin kann Rollen ändern
CREATE POLICY "only_super_admin_can_update_roles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );
```

**Policies für `user_role_audit_log`:**

```sql
-- Nur Super-Admin kann Audit-Logs lesen
CREATE POLICY "super_admin_can_view_audit_log"
  ON user_role_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- System kann Audit-Logs schreiben (via Service Role)
-- Keine INSERT Policy für regular users
```

### 11.2 MFA-Pflicht für kritische Aktionen

- Rollen-Änderung: MFA-Code erforderlich
- Account-Deaktivierung: MFA-Code erforderlich
- Super-Admin-Ernennung: MFA-Code erforderlich

---

## 12. Internationalisierung

### 12.1 Neue Übersetzungsschlüssel

**Datei:** `messages/de.json`

```json
{
  "settings.users": {
    "title": "Benutzerverwaltung",
    "description": "Verwalten Sie Benutzer und deren Rollen",
    "searchPlaceholder": "Suche nach Name oder Email...",
    "filters": {
      "role": "Rolle",
      "status": "Status",
      "all": "Alle",
      "active": "Aktiv",
      "inactive": "Deaktiviert"
    },
    "table": {
      "name": "Name",
      "email": "Email",
      "role": "Rolle",
      "status": "Status",
      "lastLogin": "Letzter Login",
      "actions": "Aktionen"
    },
    "roles": {
      "super_admin": "Super-Admin",
      "admin": "Admin",
      "viewer": "Viewer"
    },
    "actions": {
      "changeRole": "Rolle ändern",
      "deactivate": "Deaktivieren",
      "activate": "Aktivieren",
      "viewAuditLog": "Audit-Log anzeigen"
    },
    "dialogs": {
      "changeRole": {
        "title": "Rolle ändern",
        "description": "Ändern Sie die Rolle von {{name}}",
        "selectRole": "Neue Rolle wählen",
        "mfaCode": "MFA-Code",
        "mfaPlaceholder": "6-stelliger Code",
        "submit": "Rolle ändern",
        "cancel": "Abbrechen"
      },
      "deactivate": {
        "title": "Benutzer deaktivieren",
        "description": "Möchten Sie {{name}} wirklich deaktivieren?",
        "reason": "Grund (optional)",
        "reasonPlaceholder": "Warum wird dieser Account deaktiviert?",
        "submit": "Deaktivieren",
        "cancel": "Abbrechen"
      }
    },
    "errors": {
      "lastSuperAdmin": "Der letzte Super-Admin kann nicht herabgestuft werden",
      "cannotChangeSelf": "Sie können Ihre eigene Rolle nicht ändern",
      "invalidMfa": "Ungültiger MFA-Code",
      "userNotFound": "Benutzer nicht gefunden"
    },
    "success": {
      "roleChanged": "Rolle erfolgreich geändert",
      "userDeactivated": "Benutzer deaktiviert",
      "userActivated": "Benutzer aktiviert"
    }
  },
  "header": {
    "yourRole": "Ihre Rolle"
  }
}
```

---

## 13. Abhängigkeiten

### 13.1 Bestehende Dependencies (bereits installiert)

- `next-intl` - Internationalisierung
- `@supabase/supabase-js` - Datenbank-Client
- `sonner` - Toast-Benachrichtigungen
- `lucide-react` - Icons
- `tailwindcss` - Styling

### 13.2 Neue Dependencies

**Keine neuen Dependencies erforderlich!** Alle Features können mit bestehenden Packages implementiert werden.

---

## 14. Implementierungs-Reihenfolge

### Phase 1: Datenbank (Backend Developer)
1. Migration erstellen (`user_profiles` erweitern + `user_role_audit_log` erstellen)
2. RLS Policies konfigurieren
3. `database.types.ts` aktualisieren (Supabase CLI)
4. Ersten User zu Super-Admin machen

### Phase 2: Auth-Layer (Backend Developer)
1. `requireRole()` Helper implementieren
2. `getCurrentUserRole()` implementieren
3. Middleware erweitern (Rollen-Check + Deaktivierungs-Check)
4. Server Actions für User-Verwaltung implementieren
   - `getAllUsers()`
   - `changeUserRole()`
   - `deactivateUser()`
   - `activateUser()`

### Phase 3: UI Grundstruktur (Frontend Developer)
1. `RoleBadge` Component erstellen
2. Rollen-Badge im Header integrieren
3. Settings-Seite erweitern (neue Card "User-Verwaltung")
4. User-Verwaltungsseite erstellen (`/settings/users`)

### Phase 4: User-Verwaltung Table (Frontend Developer)
1. `UsersTable` Component implementieren
2. Suche + Filter (Rolle, Status)
3. User-Status-Badge
4. Actions-Dropdown

### Phase 5: Dialogs (Frontend Developer)
1. `ChangeRoleDialog` mit MFA-Eingabe
2. `DeactivateUserDialog` mit Grund-Eingabe
3. `ActivateUserDialog`
4. Bestätigungsdialoge

### Phase 6: Berechtigungs-System (Frontend Developer)
1. `usePermissions()` Hook erstellen
2. Feature-Gating in bestehenden Komponenten implementieren
3. Buttons/Links basierend auf Rolle ein/ausblenden

### Phase 7: Testing & Polish
1. Unit-Tests für `requireRole()`
2. Integration-Tests für User-Verwaltung
3. E2E-Tests für Rollen-Änderung
4. Übersetzungen (DE/EN/FR)
5. Code-Review

---

## 15. Risiken und Mitigationen

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| Letzter Super-Admin löscht sich selbst | Mittel | Validierung: Anzahl Super-Admins prüfen vor Änderung |
| Session-Inkonsistenz nach Rollen-Änderung | Mittel | Middleware lädt Rolle bei jeder Anfrage neu aus DB |
| MFA-Bypass bei Rollen-Änderung | Niedrig | Server-seitige MFA-Validierung (nicht nur Client) |
| Concurrent Editing (2 Admins ändern gleichzeitig) | Niedrig | Optimistic Locking + Audit-Log zeigt alle Änderungen |

---

## 16. Offene Fragen

1. **Automatische Deaktivierung:** Sollen User nach X Tagen Inaktivität automatisch deaktiviert werden?
   - Entscheidung: Nein (MVP), manuell durch Super-Admin

2. **Email-Benachrichtigung:** Soll User per Email benachrichtigt werden bei Rollen-Änderung?
   - Entscheidung: Nice-to-have (späteres Feature)

3. **Audit-Log UI:** Soll es eine dedizierte Seite für Audit-Logs geben?
   - Entscheidung: Ja, aber als separates Feature (nicht in PROJ-4 Scope)

4. **Role-Based Navigation:** Soll die Sidebar nur relevante Menüpunkte zeigen?
   - Entscheidung: Ja, implementieren in Phase 6

---

## 17. Integration mit PROJ-18 (Versicherten-Rolle)

### Hinweis
PROJ-4 behandelt nur **Admin-seitige Rollen** (Super-Admin, Admin, Viewer).
PROJ-18 behandelt die **Versicherten-Rolle** (eigenes Portal, separates Login).

**Kein Konflikt:** Die Rollen-Systeme sind getrennt:
- Admin-Rollen: Spalte `user_profiles.role`
- Versicherten-Rolle: Separate Tabelle `portal_users`

---

## 18. Checkliste für Review

- [ ] Datenbank-Schema bestätigt (user_profiles + audit_log)
- [ ] RLS Policies bestätigt
- [ ] API-Design bestätigt (Server Actions)
- [ ] UI-Komponenten bestätigt (UsersTable, RoleBadge, Dialogs)
- [ ] Middleware-Konzept bestätigt
- [ ] Berechtigungsmatrix bestätigt
- [ ] Sicherheitskonzept bestätigt (MFA, letzer Super-Admin)
- [ ] Implementierungs-Reihenfolge akzeptiert

---

**Nächster Schritt:** Review durch Produkt-Manager, dann Handoff an Backend Developer für Phase 1 (Datenbank-Migration).
