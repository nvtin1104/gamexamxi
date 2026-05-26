# Phase 05 — User Detail: Missing Fields in `UserDetailCard`, `UserEditForm`, `UserDetailPage`

## Files to change

| File | Change |
|------|--------|
| `apps/dashboard/src/components/users/UserDetailCard.tsx` | Add `address`, `birthdate`, email verified badge, ban/block reason, points breakdown |
| `apps/dashboard/src/components/users/UserEditForm.tsx` | Add `address`, `birthdate`, `banReason`, `blockReason`, `blockExpiresAt` fields |
| `apps/dashboard/src/components/users/UserDetailPage.tsx` | Fetch from `/users/:id/profile` (already does this) — no route change needed |

---

## 1. `UserDetailCard.tsx` — new display fields

### Points section

Currently shows: `pointsBalance` only.

Expand to a 4-cell grid:

```
┌──────────────────────────────────────────────────────┐
│  Điểm hiện tại   Đã kiếm    Đã tiêu     Đã hết hạn  │
│  pointsBalance   pointsEarned pointsSpent pointsExpired│
└──────────────────────────────────────────────────────┘
```

Below that, add a warning row if `pointsExpiring > 0`:
```
⚠ {pointsExpiring} điểm sắp hết hạn
```

### Identity / contact section

Add fields in the info grid:

| Label | Value | Notes |
|-------|-------|-------|
| Ngày sinh | `birthdate` formatted as `DD/MM/YYYY` | hide if null |
| Địa chỉ | `address` | hide if null |
| Email xác thực | Green badge "Đã xác thực" / Red badge "Chưa xác thực" | based on `emailVerifiedAt` |

### Account restriction section (show only if `status !== 'active'`)

```
┌─────────────────────────────────────┐
│  Trạng thái: [Bị ban / Bị block]    │
│  Lý do: {banReason / blockReason}   │
│  Hết hạn block: {blockExpiresAt}    │  (only for 'block')
└─────────────────────────────────────┘
```

Use a `destructive` variant card/callout for this section.

---

## 2. `UserEditForm.tsx` — new input fields

### Fields to add

All new fields go inside the existing `<form>` after the current `phone` field:

| Field | Input type | Label | Validation |
|-------|-----------|-------|-----------|
| `address` | `<Input>` | Địa chỉ | max 255 chars, optional |
| `birthdate` | `<Input type="date">` | Ngày sinh | optional, max today |
| `banReason` | `<Textarea>` | Lý do ban | optional, max 500 chars; only show if `status === 'banned'` or always show to admin |
| `blockReason` | `<Textarea>` | Lý do block | optional, max 500 chars |
| `blockExpiresAt` | `<Input type="datetime-local">` | Hết hạn block | optional; only relevant when status = 'block' |

### Conditional visibility

- `banReason`, `blockReason`, `blockExpiresAt` — only render if the current viewer has `role === 'admin'`
- Pass `viewerRole` as a prop (the logged-in user's role, already available from auth context)

### Form schema update (Zod, inside component)

```ts
const formSchema = z.object({
  name:           z.string().min(2).max(100),
  email:          z.string().email(),
  role:           z.enum(['admin', 'mod', 'user']),
  status:         z.enum(['active', 'banned', 'block']),
  avatar:         z.string().url().optional().or(z.literal('')),
  phone:          z.string().max(20).optional().or(z.literal('')),
  address:        z.string().max(255).optional().or(z.literal('')),
  birthdate:      z.string().optional(),    // date input returns string
  banReason:      z.string().max(500).optional().or(z.literal('')),
  blockReason:    z.string().max(500).optional().or(z.literal('')),
  blockExpiresAt: z.string().optional(),    // datetime-local returns string
})
```

### Submit mapping

Convert empty strings to `undefined` before calling `api.users.update()`, and convert date strings to the format the API expects:

```ts
const payload: UpdateUserInput = {
  ...values,
  address:        values.address        || undefined,
  birthdate:      values.birthdate      || undefined,
  banReason:      values.banReason      || undefined,
  blockReason:    values.blockReason    || undefined,
  blockExpiresAt: values.blockExpiresAt || undefined,
}
```

---

## 3. `UserDetailPage.tsx` — no structural changes needed

Already fetches `GET /users/:id/profile`. After Phase 1 the profile response will include all new fields since `findWithProfile()` selects `...user` which now includes the DB columns. No route or fetch changes needed.

Only add `viewerRole` prop threading to `UserEditForm`:

```tsx
// Get viewer role from auth context / localStorage
const viewerRole = useAuthRole() // hook that reads role from JWT claims
<UserEditForm user={profile} viewerRole={viewerRole} onSave={handleSave} />
```

If a `useAuthRole` hook doesn't exist, read from `localStorage.getItem('role')` (set during login alongside the token) — or decode the JWT. Keep it simple: read from localStorage.

---

## Acceptance criteria

- [ ] `UserDetailCard` shows `pointsEarned`, `pointsSpent`, `pointsExpired` alongside `pointsBalance`
- [ ] `pointsExpiring > 0` warning is visible
- [ ] `birthdate` and `address` appear when set
- [ ] Email verified badge is correct (green / red)
- [ ] Ban/block reason callout is visible only when `status !== 'active'`
- [ ] `UserEditForm` has `address`, `birthdate` fields for all editors
- [ ] `banReason`, `blockReason`, `blockExpiresAt` fields only render for admin viewers
- [ ] Form submits without TypeScript errors (all new fields in `UpdateUserInput`)
- [ ] No regression: existing fields (name, email, role, status, avatar, phone) still work
