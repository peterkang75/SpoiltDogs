# SpoiltDogs — Australian Pet E-commerce

## Overview
SpoiltDogs is a high-end e-commerce application for premium pet products, specifically targeting the Australian market. Its primary purpose is to provide a seamless shopping experience for pet owners, offering personalized product recommendations and a sophisticated user interface. The project aims to capture a significant share of the Australian pet supply market by focusing on quality, brand experience, and innovative features like an AI-powered concierge.

## User Preferences
I prefer iterative development with clear communication on significant changes. I want detailed explanations for complex architectural decisions. Do not make changes to folder `shared/schema.ts`.

## System Architecture
The application is built with a modern web stack:
- **Frontend**: React 18 with Vite, using `wouter` for routing, and `TanStack Query` for server state management. Styling is handled with `Tailwind CSS`, enhanced by `shadcn/ui` components and `Lucide React` for icons.
- **Backend**: An Express 5 REST API serves data to the frontend.
- **Styling & UI/UX**: Emphasizes a sophisticated, premium aesthetic inspired by "Scratch" brands. A vibrant color palette (Deep Forest Green, Brighter Cream, Coral, Bright Yellow) is defined using CSS custom properties (HSL). Typography uses `Inter` for body text and `Fraunces` for headings, with `Geist Mono` or `JetBrains Mono` for monospaced elements. UI components feature subtle 1px borders, soft box shadows, and clean button styling. Custom animations like `animate-marquee` and `animate-spin-slow` are used for dynamic elements.
- **State Management**: Client-side state (e.g., shopping cart) uses React Context, while server state is managed by `TanStack Query`. Pet profiles are stored in localStorage.
- **Core Features**:
    - **Dynamic Home Page**: A comprehensive landing page with 14 distinct sections, including hero, trust badges, product showcases, testimonials, and a newsletter signup.
    - **Shopping Cart**: Client-side cart implemented with React Context, featuring a slide-out cart drawer and a dedicated cart page.
    - **Pet Profile System**: A 3-step modal wizard (`PetWizard`) allows users to create a pet profile (name, breed, age), which personalizes the shopping experience and product recommendations.
    - **AI Concierge Chat**: An interactive chat interface that provides personalized recommendations and assistance. It integrates with OpenAI (gpt-4o-mini) and dynamically embeds product cards into responses.
    - **Order Management**: Client-side order persistence using localStorage, with an option to generate branded HTML order confirmation emails.
    - **Admin CRM Dashboard**: A password-protected `/admin/crm` area with a 3-column integrated workspace UI:
      - **Left panel** (w-72, collapsible): Customer conversation list grouped by profile, with search and "Add Customer" button. Shows last message preview, unread count, and pet info.
      - **Center panel**: Hybrid messenger-style timeline with channel-based chat bubbles. Email bubbles (blue) show summary cards (subject + preview + AI summary + "View Full" + "Reply"). WhatsApp bubbles (green) and SMS bubbles (gray) show plain text. Order events appear as centered pill badges. When no customer is selected, shows a Global Overview with "Messages" and "Orders" tabs.
      - **Right panel** (w-80, collapsible): Customer profile card, admin notes, order history with status management, and channel-tagged message summary.
      - **Email Detail Panel**: Sliding overlay panel (w-480, from right) shows full HTML email content when "View Full" is clicked on an email bubble.
      - **Channel-specific Reply**: Email reply opens full composer (subject, body, AI draft, attachments). WhatsApp/SMS reply opens quick chat input. Channel is inferred via `inferChannel()` (currently all email; extensible for future integrations).
      - **Live Chat**: Socket.io-based real-time chat. Storefront widget (`ChatWidget.tsx`) allows visitors to start chat sessions with email. Messages are persisted to DB with `status: "chat"` and appear instantly in CRM as orange "Live Chat" bubbles. Admin can reply in real-time via `LiveChatComposer`. Chat history endpoint (`GET /api/chat/history/:email`) returns last 50 messages for returning visitors.
      - **Admin Notifications**: New incoming live chat triggers Web Audio API notification sound and toast popup with sender name + message preview. Pulsing orange dot badge on profile list for unread chats (clears on profile selection).
      - **Unified Customer Identity**: Case-insensitive email normalization across all channels (chat, email, inbound). Profile merge API (`POST /api/admin/profiles/merge`) reassigns messages/orders, combines stats, and stores old email as alias in `preferences` JSON. Admin CRM merge UI with search dialog and confirmation. Phone number stored in `preferences` JSON via inline editor. Aliases displayed under profile card.
      - **Smart Input Bar**: All chat/messaging composers (LiveChat, WhatsApp, SMS) have intelligent AI processing. `detectIsKorean()` auto-detects language: Korean input shows "EN" translate button, English input shows "Refine" grammar/tone button. `Enter` triggers AI processing, `Shift+Enter` sends directly. Backend supports `tone: "chat"` (Korean→friendly Aussie English) and `tone: "refine"` (English grammar/tone polishing).
      - **Universal AI Toolset**: Every bubble type (Email, WhatsApp, SMS, Live Chat) has "AI 요약" (summary/sentiment) and "AI 번역" (translate to Korean) buttons. Pink analysis box shows mood, Korean summary, and suggested action. Indigo translation box shows detected language and Korean translation.
      - **Unified Channel Selector**: Header bar shows Email / Chat / WhatsApp / SMS buttons with active state highlighting. Switches composer between channels.
      - **Real-time UI**: Timeline auto-scrolls to bottom when new messages arrive. Socket.io invalidates queries on `chat:new-message` events. Admin socket joins `admin:crm` room for targeted notifications.
      - **AI Product Recommendations**: Integrated product recommendation panel in conversation view. Toggle via "제품" button in header. Two modes: (1) AI tab — analyzes conversation thread + customer profile to recommend top 3 products with Korean reasons and confidence scores; (2) Search tab — manual keyword search across product catalogue. Each product card shows image, name, price, badges, and "카드 전송" / "텍스트 전송" button. Email channel sends styled HTML product card via Resend; WhatsApp/SMS generates plain text with product link for clipboard. `/recommend [keyword]` slash command in all composers opens panel with search results. **Decoupled delivery**: Chat channel saves to DB first, attempts Socket.io delivery, then falls back to email (Resend) if visitor is offline. Admin sees differentiated toast: "전송 완료" (socket), "이메일로 전송됨" (fallback), or "이메일 전송 실패" (error). PCARD metadata in message body is parsed and rendered as styled product cards in all bubble types (Chat, WhatsApp, SMS) and in GlobalOverview/right panel summaries.
      - **In-context AI**: AI summary card (mood + summary + suggested action) embedded directly in each bubble. AI-powered draft composer available in email reply. All bubble AI buttons (Summary, Translate, Recommend) are icon-only with Radix tooltips. Message-level "Recommend" button (ShoppingBag icon) on every bubble triggers targeted AI product recommendations based on that specific message content instead of the full conversation. ProductRecommendationPanel supports `focusMessage` prop for single-message mode with focus banner and clear button. Backend `/api/admin/ai/recommend-products` accepts `focusMessageBody`/`focusMessageSubject` for focused prompt injection.
      - **Mobile Responsive**: Full mobile support with `useIsMobile()` hook (768px breakpoint). Left sidebar becomes fixed overlay with hamburger toggle + backdrop. Right panel becomes fixed overlay with close button. Channel selector scrolls horizontally with hidden scrollbar. Global overview orders stack vertically. Email composer fields stack on small screens. Add Customer dialog uses responsive grid. Conversation click auto-closes sidebar on mobile.
      - All labels in Korean. Dates use Australia/Sydney timezone.

## Customer Authentication (Supabase Auth)
- **Auth provider**: Supabase (`@supabase/supabase-js`). Client initialized in `client/src/lib/supabase.ts` using `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- **Auth context**: `client/src/context/auth-context.tsx` — `AuthProvider` wraps the app, exposes `useAuth()` hook with `{ session, user, loading, signOut }`. On auth state change, calls `POST /api/auth/sync-profile` to upsert the profile in the DB.
- **Sign-in methods**: Magic Link (email OTP, passwordless) + Google OAuth. Both redirect to `/my-account` after login.
- **Login page**: `/login` — email field + "Send Magic Link" button + "Continue with Google" button. Shows confirmation screen after magic link send.
- **My Account page**: `/my-account` — shows customer's active conversations, order history, and account details. Protected route — redirects to `/login` if not authenticated. Uses Bearer token from Supabase session to call `GET /api/auth/my-account`.
- **Backend endpoints**:
  - `POST /api/auth/sync-profile` — creates/updates profile row from Supabase user data (email + name).
  - `GET /api/auth/my-account` — validates Supabase JWT (service role key), returns profile + messages + orders.
- **Header integration**: Both `Navbar` (home page) and `Header` (inner pages) show User icon → `/login` when logged out, and avatar initials dropdown (My Account / My Orders / Sign out) when logged in.
- **New storage method**: `getOrdersByEmail(email)` added to `IStorage` and `DatabaseStorage`.

## External Dependencies
- **Supabase**: Customer authentication (Magic Link + Google OAuth). Secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Frontend env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- **Stripe**: Integrated for payment processing, utilizing `stripe-replit-sync` for seamless setup within the Replit environment. Handles checkout sessions and webhooks.
- **OpenAI**: Used for the AI Concierge chat and Admin CRM AI consultation assistant (gpt-4o-mini via Replit AI Integrations).
- **Resend**: Integrated for sending branded HTML order confirmation emails and for email communication from the Admin CRM.
- **PostgreSQL**: Primary database for `stripe-replit-sync` and the Admin CRM's `profiles`, `messages`, and `orders` tables, managed via Drizzle ORM.
- **Socket.io**: Real-time bidirectional communication for live chat between storefront visitors and CRM admin.
- **wouter**: A small routing library for React.
- **TanStack Query**: For efficient data fetching and caching.
- **Tailwind CSS**: For utility-first styling.
- **shadcn/ui**: A collection of re-usable components.
- **Lucide React & react-icons**: For UI icons and brand logos.
## MANDATORY RULES — Agent Must Always Follow

### 1. PLAN.md Update (NON-NEGOTIABLE)
After completing ANY task, you MUST update PLAN.md:
- Mark completed items with [x] and add completion date
- Add notes about what was implemented
- Add any new pending tasks discovered
- NEVER skip this step under any circumstances

### 2. Code Delivery Format
- Always provide COMPLETE file contents — never partial snippets
- User will copy-paste entire file to replace existing content
- Never say "add this section" or "find this line and replace"

### 3. Architecture Rules
- Never store brand prompts or logic in external services (Make.com 등)
- All core logic lives in our Express server
- External services (FAL.AI, Claude API, Meta API) called directly from server
- All user-facing text in Korean, code and comments in English

### 4. Database Rules
- Do not make changes to shared/schema.ts without explicit instruction
- Always run npm run db:push after schema changes
