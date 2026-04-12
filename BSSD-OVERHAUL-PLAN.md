# REDLINE BSSD - Frontend Overhaul Checklist

> "Be Safe Stay Dangerous" - 80% Street Underground, Full Send Energy

**Last Updated:** 2026-03-20
**Status:** Planning Complete - Ready to Build

---

## The Vision

Transform Redline from MVP to **addictive street racing social platform**. Drunk-proof UX - big buttons, obvious actions, works outside on your phone at 2am. Raw energy, neon accents, stats that go UP.

---

## Phase 1: Design System Foundation

### Colors & Effects (`frontend/app/globals.css`)
- [ ] Add neon color palette
  - [ ] `--neon-red: #ff3b3b`
  - [ ] `--neon-blue: #00d4ff`
  - [ ] `--neon-green: #00ff88`
  - [ ] `--neon-yellow: #ffee00`
  - [ ] `--neon-purple: #bf5af2`
- [ ] Add glow effects
  - [ ] `--glow-red: 0 0 20px rgba(255,59,59,0.4)`
  - [ ] `--glow-blue: 0 0 20px rgba(0,212,255,0.4)`
  - [ ] `--glow-green: 0 0 20px rgba(0,255,136,0.4)`
- [ ] Add racing gradients
  - [ ] `--gradient-redline`
  - [ ] `--gradient-asphalt`
  - [ ] `--gradient-night`

### Typography (`frontend/app/layout.tsx`)
- [ ] Add Google Fonts import
  - [ ] Bebas Neue (display/headers)
  - [ ] Russo One (emphasis)
  - [ ] JetBrains Mono (stats/times)
- [ ] Define font variables in globals.css

### Animations (`frontend/app/globals.css`)
- [ ] `@keyframes pulse-glow` - Pulsing neon effect
- [ ] `@keyframes countdown-tick` - Timer animation
- [ ] `@keyframes stat-increase` - Numbers going up
- [ ] `@keyframes speed-lines` - Racing motion
- [ ] `@keyframes shake` - Error feedback
- [ ] `@keyframes slide-up` - Modal entrance

---

## Phase 2: UI Component Library

### Create `/frontend/components/ui/`
- [ ] `Button.tsx`
  - [ ] Primary variant (red glow)
  - [ ] Ghost variant
  - [ ] Danger variant
  - [ ] Neon variant
  - [ ] 48px minimum height
- [ ] `Card.tsx`
  - [ ] Default variant
  - [ ] Hover glow variant
  - [ ] Hero variant
- [ ] `Badge.tsx`
  - [ ] Live (pulsing animation)
  - [ ] Redline
  - [ ] Success
  - [ ] Warning
  - [ ] Info
- [ ] `Avatar.tsx`
  - [ ] User photo display
  - [ ] Online status indicator
  - [ ] Racing status indicator
- [ ] `Countdown.tsx`
  - [ ] Days/hours/minutes/seconds
  - [ ] Tick animation
  - [ ] Urgent mode (under 1hr)
- [ ] `StatNumber.tsx`
  - [ ] Animated number changes
  - [ ] Up arrow when increasing
  - [ ] Color flash on change
- [ ] `ProgressBar.tsx`
  - [ ] Win rate display
  - [ ] Accuracy meter
  - [ ] Trust score
- [ ] `Input.tsx`
  - [ ] Text input
  - [ ] Number input
  - [ ] Search with autocomplete
- [ ] `Toggle.tsx`
  - [ ] Switch component
- [ ] `Skeleton.tsx`
  - [ ] Loading placeholder

---

## Phase 3: Navigation Overhaul

### Enhanced Bottom Nav (`frontend/components/BottomNav.tsx`)
- [ ] Center FAB button
  - [ ] "CALL OUT" primary action
  - [ ] Neon red glow
  - [ ] Pulse animation
  - [ ] Elevated above other icons
- [ ] Notification dots on icons
- [ ] Active state animations
- [ ] Haptic feedback hooks

### Quick Action System
- [ ] Create `frontend/components/layout/FloatingAction.tsx`
- [ ] Create `frontend/components/layout/QuickActionMenu.tsx`
  - [ ] Call Out option
  - [ ] Quick Post option
  - [ ] Quick Pick option
  - [ ] Create Race option
  - [ ] Upload Media option
- [ ] Create `frontend/components/layout/ModalSheet.tsx`
  - [ ] Bottom sheet pattern
  - [ ] Swipe to dismiss
  - [ ] Backdrop blur

### Layout Components
- [ ] Create `frontend/components/layout/PageContainer.tsx`
- [ ] Create `frontend/components/layout/Header.tsx`
  - [ ] BSSD branding
  - [ ] Action buttons

---

## Phase 4: Feed Revolution

### Feed Components (`frontend/components/feed/`)
- [ ] `NextRaceBanner.tsx`
  - [ ] Prominent countdown
  - [ ] Race name/location
  - [ ] Tap to view details
  - [ ] Sticky at top
- [ ] `CallOutCard.tsx`
  - [ ] Challenger vs Challenged
  - [ ] Stakes display
  - [ ] Trash talk message
  - [ ] Accept/Decline buttons
  - [ ] Watch button
- [ ] `MediaPost.tsx`
  - [ ] Video thumbnail with play
  - [ ] Photo gallery
  - [ ] Caption
  - [ ] Reactions
- [ ] `QuickPost.tsx`
  - [ ] Floating compose bar
  - [ ] Text input
  - [ ] Media attach button
  - [ ] Post button
- [ ] `ReactionBar.tsx`
  - [ ] Fire emoji
  - [ ] 100 emoji
  - [ ] Lightning emoji
  - [ ] Animated counts
- [ ] `ContentTabs.tsx`
  - [ ] All posts
  - [ ] Call-outs only
  - [ ] Results only
  - [ ] Media only
- [ ] `CommentThread.tsx`
  - [ ] Reply/roast threads
  - [ ] Nested comments

### Feed Page Redesign (`frontend/app/feed/page.tsx`)
- [ ] Add sticky header with BSSD branding
- [ ] Add NextRaceBanner component
- [ ] Add ContentTabs filter
- [ ] Integrate CallOutCard posts
- [ ] Integrate MediaPost posts
- [ ] Add QuickPost floating bar
- [ ] Implement infinite scroll
- [ ] Add pull-to-refresh

---

## Phase 5: Picks System Explosion

### Pick Components (`frontend/components/picks/`)
- [ ] `HeadToHeadPicker.tsx`
  - [ ] Two-option selector
  - [ ] Odds display
  - [ ] Animated selection
- [ ] `PropCard.tsx`
  - [ ] Fun proposition bets
  - [ ] Question text
  - [ ] Yes/No or multiple options
  - [ ] Odds per option
- [ ] `OverUnderSlider.tsx`
  - [ ] Time prediction UI
  - [ ] Slider for ET guess
  - [ ] Over/under display
- [ ] `CallOutBet.tsx`
  - [ ] User search/select
  - [ ] Stakes input
  - [ ] Trash talk message
  - [ ] Send challenge
- [ ] `PickSlip.tsx`
  - [ ] Summary of pending bets
  - [ ] Total stake
  - [ ] Potential payout
  - [ ] Confirm button
- [ ] `AccuracyMeter.tsx`
  - [ ] Win rate percentage
  - [ ] Streak counter
  - [ ] Animated updates

### Pick Types to Implement
- [ ] WHO WINS - Classic head-to-head
- [ ] TIME OVER/UNDER - Guess the ET
- [ ] FUN PROPS:
  - [ ] "Will they actually show up?"
  - [ ] "First false start?"
  - [ ] "Who breaks down first?"
  - [ ] "What time does it ACTUALLY start?"
  - [ ] "Closest to predicted time?"
- [ ] CALL-OUT BETS - Tag + bet against

### Picks Page Redesign (`frontend/app/picks/page.tsx`)
- [ ] Balance display prominent at top
- [ ] Accuracy streak display
- [ ] Tab navigation: Featured | Props | Call-Outs
- [ ] Group picks by upcoming race
- [ ] Auto-generated props per race
- [ ] Pick slip summary
- [ ] Quick pick one-tap widgets

---

## Phase 6: Engagement & Addiction Features

### Engagement Components (`frontend/components/engagement/`)
- [ ] `StreakCounter.tsx`
  - [ ] Current streak
  - [ ] Best streak
  - [ ] Progress bar to next milestone
- [ ] `LeaderboardWidget.tsx`
  - [ ] Top 10 display
  - [ ] Your position highlighted
  - [ ] Period tabs (weekly/monthly/all-time)
  - [ ] Position change indicators
- [ ] `AchievementPopup.tsx`
  - [ ] Unlock animation
  - [ ] Achievement icon
  - [ ] Title and description
  - [ ] Dismiss button
- [ ] `StatsBoard.tsx`
  - [ ] Total wins
  - [ ] Pick accuracy
  - [ ] Money won
  - [ ] Races participated
  - [ ] All with animations
- [ ] `LiveIndicator.tsx`
  - [ ] Pulsing LIVE badge
  - [ ] Red dot animation

### New Stats Page (`frontend/app/stats/page.tsx`)
- [ ] Create page layout
- [ ] Your Season section
  - [ ] Streak counter
  - [ ] Win/Loss record
  - [ ] Accuracy percentage
  - [ ] Money won/lost
- [ ] Leaderboard section
  - [ ] Weekly tab
  - [ ] Monthly tab
  - [ ] All-time tab
  - [ ] Your rank highlighted
- [ ] Achievements section
  - [ ] Unlocked achievements
  - [ ] Locked (greyed out)
  - [ ] Progress indicators
- [ ] Recent activity

### Achievement System
- [ ] Define achievement types
  - [ ] First Win
  - [ ] Hot Streak (5 in a row)
  - [ ] Perfect Week
  - [ ] Big Winner ($X won)
  - [ ] Regular (X races)
  - [ ] Legend status
- [ ] Track progress in localStorage/API
- [ ] Trigger popup on unlock

---

## Phase 7: Call-Out System

### Call-Out Flow
- [ ] Create `frontend/app/callout/page.tsx` or modal
- [ ] Step 1: Select opponent
  - [ ] User search with autocomplete
  - [ ] Recent opponents
  - [ ] Suggestions
- [ ] Step 2: Set terms
  - [ ] Race type
  - [ ] Stakes amount
  - [ ] Location (optional)
  - [ ] Date/time (optional)
- [ ] Step 3: Talk trash
  - [ ] Message input
  - [ ] Optional media attach
- [ ] Step 4: Send
  - [ ] Confirm modal
  - [ ] Send challenge

### Call-Out Display
- [ ] Pending call-outs in your feed
- [ ] Call-out notifications
- [ ] Public feed visibility
- [ ] Accept/Decline actions
- [ ] Accepted → creates Run

---

## Phase 8: Media System (Supabase Storage)

### API Layer (`frontend/lib/api.ts`)
- [ ] Add Supabase Storage client setup
- [ ] `uploadMedia(file)` function
- [ ] `getMediaUrl(path)` function
- [ ] Handle video vs image types

### Media Uploader Component
- [ ] Create `frontend/components/feed/MediaUploader.tsx`
- [ ] File/camera selection
- [ ] Client-side compression
  - [ ] Image resize (max 1920px)
  - [ ] Video compression
- [ ] Upload progress indicator
- [ ] Thumbnail generation
- [ ] Error handling

### Integration
- [ ] Add media to Post creation
- [ ] Add media to Call-outs
- [ ] Add media to Race results

---

## Phase 9: Run Enhancements

### Runs Page (`frontend/app/runs/page.tsx`)
- [ ] Featured Race hero banner
  - [ ] Next big race prominent
  - [ ] Large countdown
  - [ ] Quick join CTA
- [ ] Countdown chips instead of dates
  - [ ] "2h 34m" format
  - [ ] Color coding (urgent = red)
- [ ] Quick Join buttons
  - [ ] One-tap registration
  - [ ] 56px height
- [ ] Live indicator
  - [ ] Pulsing badge
  - [ ] "IN PROGRESS" status
- [ ] Participant preview
  - [ ] Stacked avatars
  - [ ] "+X more" indicator

### Run Detail Page (`frontend/app/runs/[id]/page.tsx`)
- [ ] Inline pick placement
  - [ ] Pick widgets embedded
  - [ ] Quick pick from detail
- [ ] Call-out option
  - [ ] Challenge participant
- [ ] Pre-race trash talk thread
  - [ ] Comments section
  - [ ] Participant banter
- [ ] Live status updates
  - [ ] Status changes
  - [ ] Results posting

---

## Phase 10: API Extensions

### New Endpoints (`frontend/lib/api.ts`)
- [ ] Call-outs
  - [ ] `createCallOut(data)`
  - [ ] `getPendingCallOuts()`
  - [ ] `acceptCallOut(id)`
  - [ ] `declineCallOut(id)`
- [ ] Props
  - [ ] `getPropsForRun(runId)`
  - [ ] `createProp(data)`
  - [ ] `placePropPick(data)`
- [ ] Stats/Engagement
  - [ ] `getMyStats()`
  - [ ] `getLeaderboard(period)`
  - [ ] `getAchievements()`
  - [ ] `unlockAchievement(type)`
- [ ] Notifications
  - [ ] `getNotifications()`
  - [ ] `markNotificationsRead(ids)`

### Backend Requirements (Separate Task)
- [ ] `POST /callouts` - Create call-out
- [ ] `GET /callouts/pending` - Get pending
- [ ] `POST /callouts/{id}/accept` - Accept
- [ ] `POST /callouts/{id}/decline` - Decline
- [ ] `GET /stats/me` - Personal stats
- [ ] `GET /stats/leaderboard` - Rankings
- [ ] `GET /picks/props/{run_id}` - Auto-generated props
- [ ] `POST /picks/props` - Create prop

---

## Phase 11: Polish & Testing

### Performance
- [ ] Lazy load components
- [ ] Image optimization
- [ ] Code splitting
- [ ] Bundle analysis

### PWA Enhancements
- [ ] Update manifest
- [ ] Push notification setup
- [ ] Offline indicator

### Testing
- [ ] Component testing
- [ ] User flow testing
- [ ] Mobile device testing
- [ ] Drunk test (seriously - test at night, tired)

### Accessibility
- [ ] ARIA labels
- [ ] Keyboard navigation
- [ ] Color contrast (neons on dark)
- [ ] Touch target verification (48px+)

---

## Design Principles Reference

### Drunk-Proof UX Rules
- **48px minimum** touch targets
- **3 taps max** for any action
- **ONE** primary action per screen
- **Red = do this**, everything else secondary
- High contrast, big text
- Obvious icons, minimal reading

### BSSD Experience Goals
Every screen should make you want to:
1. Check the countdown - When's the next race?
2. See your stats - Did my numbers go up?
3. Talk trash - Who can I call out?
4. Make picks - What's the action?
5. Show off - Post that win, flex that ride

---

## Notes

_Add implementation notes here as work progresses..._

---

**Be Safe. Stay Dangerous.**
