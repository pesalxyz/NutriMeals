# NUTRIMEALS_CONTEXT.md

## 1) Project Overview
**Project Name:** NutriMeals  
**Tagline:** Scan. Eat. Know.

NutriMeals is an AI-powered food nutrition scanner. Users upload or capture food images, the system analyzes visible food components, estimates nutrition values, and allows users to edit results before saving. Saved meals are aggregated into daily tracking and history views.

**Core principle:** AI-assisted estimation, not medical-grade certainty.

---

## 2) Tech Stack
- **Web:** Next.js (mobile-first web experience)
- **Mobile:** Expo React Native
- **Backend API:** Node.js (NestJS-based service architecture)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** Google OAuth + backend token verification
- **AI layer:** Vision + nutrition inference pipeline (provider-based, backend-side)
- **Deployments:**
  - Web -> Vercel
  - API -> Railway

---

## 3) Architecture Summary
NutriMeals uses a shared backend and shared business concepts across web/mobile:

- Client (web/mobile) sends image to backend.
- Backend runs food analysis pipeline (computer vision + AI inference).
- Backend returns estimated components + nutrition.
- User can manually edit components/portion before saving.
- Backend persists meal data and aggregates daily dashboard stats.

Key architectural intent:
- Keep AI provider logic server-side.
- Keep contracts reusable across clients.
- Support extension without rewriting core flow.

---

## 4) Feature List (Current Scope)
- Food scan via camera or image upload
- AI-based food detection from image
- AI nutrition estimation (calories, protein, carbs, fat; plus related fields if available)
- Editable result before save (name, portion, unit, remove/add items)
- Save meal entries
- Meal history
- Daily dashboard summary and target progress

**Out of scope (current):**
- Personalized food recommendation engine
- Medical claims / diagnosis

---

## 5) Authentication System
- Google OAuth login is the primary auth method.
- Domain restriction was removed (previously campus-only).
- Now allows all Google accounts.
- Backend enforces `email_verified = true`.
- Auth/session security remains backend-validated (not frontend-only trust).

---

## 6) UX Flow
1. User logs in with Google  
2. Enters Dashboard  
3. Starts Scan (camera-first or upload)  
4. Waits for AI analysis  
5. Reviews and edits detected components/portions  
6. Saves meal  
7. Views updated daily totals and history

---

## 7) Page Structure
- **Login**
- **Dashboard**
- **Scan**
- **Result/Edit**
- **History**
- **Profile**

All pages should remain consistent in interaction patterns and visual hierarchy.

---

## 8) Design Goals (High Priority)
Target direction: modern 2025 startup health-tech product.

Design objectives:
- Premium, polished visual quality
- Strong readability and hierarchy
- Mobile-first usability
- Clear CTA focus (especially scan flow)
- Calm but modern atmosphere
- Subtle, meaningful motion (not decorative overload)

---

## 9) Current UI Problems
Known issues to fix in redesign work:
- Too plain and too white
- Feels like generic/basic dashboard
- Lacks visual depth and brand expression
- Insufficient premium feel for AI product positioning
- Inconsistent modern UX polish across screens

---

## 10) Brand Guidelines
- **Brand name:** NutriMeals
- **Tagline:** Scan. Eat. Know.
- **Primary identity:** Green + Blue
- **Preferred treatment:** Green->Blue gradients used intentionally (not everywhere)
- **Tone:** Modern, trustworthy, health-tech, clean

Visual guidance:
- Soft layered backgrounds over flat white
- Premium cards (subtle borders/shadows/tint)
- Clear typography hierarchy
- Consistent component language across pages

---

## 11) Rules for Future AI Tasks
When AI agents work on this project, follow these rules:

1. Preserve core product truth: nutrition is estimation-based.
2. Keep user-editability in scan results (never lock AI output).
3. Keep backend as source of truth for auth and AI processing.
4. Reuse shared contracts/services instead of duplicating logic.
5. Prioritize mobile-first UX and performance.
6. Prefer modular, maintainable changes over quick patching.
7. Keep language and UI copy consistent with NutriMeals brand voice.
8. Maintain parity of business flow between web and mobile where practical.

---

## 12) Things to Avoid
- Do not introduce medical-grade claims.
- Do not frame outputs as exact nutrition certainty.
- Do not silently add recommendation-system claims/features.
- Do not bypass backend validation for auth/API security.
- Do not overcomplicate UI with heavy effects or clutter.
- Do not regress scan/edit/save flow clarity.
- Do not break existing deployment assumptions (Vercel web, Railway API).

---

## 13) Expected Output for Redesign Tasks
For UI/UX redesign or product polish tasks, expected outcomes:

- Cohesive green-blue premium design system
- Updated app shell/navigation consistency
- Improved Dashboard, Scan, Result/Edit, History, Profile visual quality
- Better loading/empty/error states
- Clearer scan-to-save journey
- Preserved functionality and API contracts
- No regression in auth, scanning, editing, saving, and tracking flows

Deliverables should be practical, production-minded, and consistent with NutriMeals identity.
