# Trading Helper — UI Design Specification

## 1. Information Architecture

### Screen Inventory
| Screen | Purpose | PRD Reference | Priority |
|--------|---------|---------------|----------|
| Dashboard | Home — account summary, recent evaluations, quick-start | FR-010 | High |
| Evaluate Trade | Core scoring flow — select asset, input factors, get score | FR-005, FR-006 | Critical |
| Confirmation Dashboard | One-page go/no-go recommendation | FR-008 | Critical |
| Assets | Manage tickers and S/R levels | FR-001, FR-002 | High |
| Asset Detail | View/edit levels for a single asset | FR-002 | High |
| Journal | Trade history — confirmed, passed, outcomes | FR-013 | High |
| Settings | Accounts, Plaid, checklist config | FR-003, FR-004, FR-010 | Medium |

### Navigation Structure
```
┌─────────────────────────────────────────────────────┐
│  [TH]  Trading Helper              [Accounts: $342K] │
├────────┬────────────────────────────────────────────┤
│        │                                            │
│  HOME  │   (main content area)                      │
│        │                                            │
│  NEW   │                                            │
│  TRADE │                                            │
│        │                                            │
│  ASSETS│                                            │
│        │                                            │
│  JOURNAL                                            │
│        │                                            │
│  ──────│                                            │
│  SETTINGS                                           │
│        │                                            │
└────────┴────────────────────────────────────────────┘
```

- Left sidebar: icon + label, collapsible on smaller screens
- "NEW TRADE" is visually emphasized (primary action button in sidebar)
- Top bar: app name + total account balance summary
- Main content fills remaining space

### Primary User Flows

**Flow 1: Evaluate a Trade (Critical Path)**
```
Dashboard → Click "New Trade" → Select Asset → Select Direction + Timeframe
→ Input/Confirm Checklist Factors → Set Entry/Stop/Targets
→ View Confirmation Dashboard → Confirm or Pass
```

**Flow 2: Add an Asset with Levels**
```
Assets → Click "Add Asset" → Enter Ticker/Class → Save
→ Asset Detail → Add S/R Levels (manual or fib calc) → Save
```

**Flow 3: Log a Trade Outcome**
```
Journal → Find confirmed trade → Click "Log Outcome"
→ Enter actual entry/exit/P&L/notes → Save
```

**Flow 4: Connect Accounts**
```
Settings → Accounts tab → Click "Connect with Plaid"
→ Plaid Link flow → Set account type + risk % → Save
```

---

## 2. Screen Wireframes

### 2.1 Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  [TH]  Trading Helper                        [Accounts: $342K] │
├────────┬────────────────────────────────────────────────────────┤
│        │                                                        │
│  HOME  │  ACCOUNTS                                              │
│  ●     │  ┌─────────────────────┐ ┌─────────────────────────┐  │
│        │  │ Taxable      $92,000│ │ IRA            $250,000 │  │
│ [NEW   │  │ Risk: 1% ($920/trade│ │ Risk: 1% ($2,500/trade) │  │
│  TRADE]│  │ ● Synced 2m ago     │ │ ● Synced 2m ago         │  │
│        │  └─────────────────────┘ └─────────────────────────┘  │
│ ASSETS │                                                        │
│        │  ┌─────────────────────────────────────────────────┐   │
│ JOURNAL│  │              [ ▶ NEW TRADE EVALUATION ]          │   │
│        │  └─────────────────────────────────────────────────┘   │
│ ────── │                                                        │
│SETTINGS│  RECENT EVALUATIONS                                    │
│        │  ┌─────────────────────────────────────────────────┐   │
│        │  │ BTC  LONG 4h  │ Score: 82 🟢 │ Confirmed │ 2h ago│  │
│        │  │ AAPL SHORT 1h │ Score: 45 🔴 │ Passed    │ 5h ago│  │
│        │  │ GLD  LONG  D  │ Score: 68 🟡 │ Passed    │ 1d ago│  │
│        │  └─────────────────────────────────────────────────┘   │
│        │                                                        │
│        │  OPEN TRADES (awaiting outcome)                        │
│        │  ┌─────────────────────────────────────────────────┐   │
│        │  │ BTC LONG │ Entry: $97,200 │ Stop: $94,500       │   │
│        │  │ Score: 82│ Target: $105K  │ [Log Outcome]       │   │
│        │  └─────────────────────────────────────────────────┘   │
│        │                                                        │
└────────┴────────────────────────────────────────────────────────┘
```

**States:**
- **Empty:** No evaluations yet → "Run your first trade evaluation" with arrow pointing to New Trade button
- **Plaid not connected:** Account cards show "Connect Account" button instead of balance
- **Stale balance:** Yellow dot + "Balance may be stale — last updated [time]"

---

### 2.2 Evaluate Trade — Step 1: Setup

```
┌─────────────────────────────────────────────────────────────────┐
│  [TH]  Trading Helper                        [Accounts: $342K] │
├────────┬────────────────────────────────────────────────────────┤
│        │                                                        │
│  HOME  │  NEW TRADE EVALUATION                                  │
│        │                                                        │
│ [NEW   │  Asset     [ BTC ▼ ]  (search/select dropdown)        │
│  TRADE]│                                                        │
│  ●     │  Direction [ LONG ▼ ]  [ SHORT ▼ ]  (toggle buttons)  │
│        │                                                        │
│ ASSETS │  Timeframe [ Weekly | Daily | 4h | 1h ]  (radio pills) │
│        │                                                        │
│ JOURNAL│  Account   [ Taxable ($92K) ▼ ]                        │
│        │                                                        │
│ ────── │  ─────────────────────────────────────────────         │
│SETTINGS│                                                        │
│        │  PRICE LEVELS                                          │
│        │  Entry Price    [ $_________ ]                         │
│        │  Stop Loss      [ $_________ ]                         │
│        │  Target 1       [ $_________ ]                         │
│        │  Target 2       [ $_________ ]  (optional)             │
│        │  Target 3       [ $_________ ]  (optional)             │
│        │                                                        │
│        │  R:R Ratio:  2.4 : 1  ✅  (auto-calculated)           │
│        │  Position Size: 184 shares ($18,400)                   │
│        │  Risk Amount: $920 (1.0% of $92,000)                   │
│        │                                                        │
│        │  ⚠️ IRA: Short selling not permitted                   │
│        │     (shown only when IRA + short selected)             │
│        │                                                        │
│        │  S/R LEVELS FOR BTC (from asset profile)               │
│        │  ┌──────────────────────────────────────┐              │
│        │  │ $105,000  Resistance  (manual)       │              │
│        │  │  $98,500  Fib 38.2%                  │              │
│        │  │  $95,000  Fib 61.8%   ← nearest     │              │
│        │  │  $91,200  Support     (manual)       │              │
│        │  └──────────────────────────────────────┘              │
│        │                                                        │
│        │            [ Next: Score Checklist → ]                 │
│        │                                                        │
└────────┴────────────────────────────────────────────────────────┘
```

**Key interactions:**
- Asset dropdown searches as you type, shows asset class badge
- Direction is a toggle — selecting SHORT on IRA account shows inline warning immediately
- R:R, position size, and risk amount recalculate live as you type entry/stop/target
- S/R levels are pulled from the asset profile and displayed for reference while setting entry/stop
- "Nearest" label highlights the S/R level closest to current entry price

---

### 2.3 Evaluate Trade — Step 2: Checklist Scoring

```
┌─────────────────────────────────────────────────────────────────┐
│  [TH]  Trading Helper                        [Accounts: $342K] │
├────────┬────────────────────────────────────────────────────────┤
│        │                                                        │
│  HOME  │  SCORE CHECKLIST — BTC LONG 4h                         │
│        │  Entry: $97,200 → Stop: $94,500 → Target: $104,000    │
│ [NEW   │                                                        │
│  TRADE]│  ┌─────────────────────────────────────────────────┐   │
│  ●     │  │                                                 │   │
│        │  │  1. Trend Direction (W/D)         Weight: 15    │   │
│ ASSETS │  │     [ Strong Up | Up | Neutral | Down | Str Dn ]│   │
│        │  │     Score: 15/15 ✅                              │   │
│ JOURNAL│  │                                                 │   │
│        │  │  2. Trend Direction (4h/1h)       Weight: 10    │   │
│ ────── │  │     [ Strong Up | Up | Neutral | Down | Str Dn ]│   │
│SETTINGS│  │     Score: 7.5/10                                │   │
│        │  │                                                 │   │
│        │  │  3. RSI (14) Status               Weight: 10    │   │
│        │  │     [ Overbought | Neutral | Oversold ]         │   │
│        │  │     Thresholds: 70/30 (W/D) 80/20 (4h/1h)      │   │
│        │  │     Score: 10/10 ✅                              │   │
│        │  │                                                 │   │
│        │  │  4. RSI Divergence                Weight: 10    │   │
│        │  │     [ Yes ● | No ○ ]                            │   │
│        │  │     Score: 10/10 ✅                              │   │
│        │  │                                                 │   │
│        │  │  5. Mean Reversion (BB 20/2)      Weight: 10    │   │
│        │  │     [ At/Beyond Band ● | No ○ ]                 │   │
│        │  │     Score: 0/10 ❌                               │   │
│        │  │                                                 │   │
│        │  │  6. MR Confirmation (VWAP/MA)     Weight: 5     │   │
│        │  │     [ Yes ● | No ○ ]                            │   │
│        │  │     Score: 0/5 ❌                                │   │
│        │  │                                                 │   │
│        │  │  7. Price Near S/R Level          Weight: 15    │   │
│        │  │     [ At Level | Within 1% | Within 2% | No ]   │   │
│        │  │     Score: 11.25/15                              │   │
│        │  │                                                 │   │
│        │  │  8. Risk/Reward Ratio             Weight: 15    │   │
│        │  │     Auto: 2.4:1                                 │   │
│        │  │     Score: 15/15 ✅  (≥2:1 = full)              │   │
│        │  │                                                 │   │
│        │  │  9. Timeframe Alignment           Weight: 10    │   │
│        │  │     [ Yes ● | No ○ ]                            │   │
│        │  │     Score: 10/10 ✅                              │   │
│        │  │                                                 │   │
│        │  └─────────────────────────────────────────────────┘   │
│        │                                                        │
│        │  ┌─────────────────────────────────────┐               │
│        │  │  COMPOSITE SCORE:  78.75 / 100  🟢  │               │
│        │  │  HIGH CONVICTION SETUP               │               │
│        │  └─────────────────────────────────────┘               │
│        │                                                        │
│        │     [ ← Back ]            [ View Recommendation → ]   │
│        │                                                        │
└────────┴────────────────────────────────────────────────────────┘
```

**Key interactions:**
- Each factor has an inline input matching its type (toggle, radio pills, auto-calculated)
- Score updates live as you fill in each factor
- R:R factor (8) is auto-filled from Step 1 — no double-entry
- Composite score bar at bottom fills and changes color as you go (red→yellow→green)
- Factors with 0 score are highlighted with ❌ so you see weaknesses at a glance

---

### 2.4 Confirmation Dashboard (Critical Screen)

```
┌─────────────────────────────────────────────────────────────────┐
│  [TH]  Trading Helper                        [Accounts: $342K] │
├────────┬────────────────────────────────────────────────────────┤
│        │                                                        │
│        │  ┌─────────────────────────────────────────────────┐   │
│        │  │         🟢  78  HIGH CONVICTION                  │   │
│        │  │         BTC  LONG  4h                            │   │
│        │  └─────────────────────────────────────────────────┘   │
│        │                                                        │
│        │  TRADE PLAN                    POSITION SIZING          │
│        │  ┌──────────────────────┐     ┌──────────────────────┐ │
│        │  │ Entry    $97,200     │     │ Account   Taxable    │ │
│        │  │ Stop     $94,500     │     │ Balance   $92,000    │ │
│        │  │ Target 1 $104,000    │     │ Risk %    1.0%       │ │
│        │  │ Target 2 —           │     │ Risk $    $920       │ │
│        │  │ R:R      2.4 : 1    │     │ Shares    340        │ │
│        │  │ Vehicle  Shares      │     │ Cost      $33,048    │ │
│        │  └──────────────────────┘     └──────────────────────┘ │
│        │                                                        │
│        │  CHECKLIST BREAKDOWN                                   │
│        │  ┌─────────────────────────────────────────────────┐   │
│        │  │ ✅ Trend W/D          15/15  ████████████████   │   │
│        │  │ ✅ Trend 4h/1h         7/10  ███████████░░░░   │   │
│        │  │ ✅ RSI Status          10/10  ████████████████   │   │
│        │  │ ✅ RSI Divergence      10/10  ████████████████   │   │
│        │  │ ❌ Mean Reversion       0/10  ░░░░░░░░░░░░░░░   │   │
│        │  │ ❌ MR Confirmation      0/5   ░░░░░░░░░░░░░░░   │   │
│        │  │ ✅ Near S/R Level      11/15  ████████████░░░   │   │
│        │  │ ✅ R:R Ratio           15/15  ████████████████   │   │
│        │  │ ✅ TF Alignment        10/10  ████████████████   │   │
│        │  └─────────────────────────────────────────────────┘   │
│        │                                                        │
│        │       [ ✅ CONFIRM TRADE ]     [ ✕ PASS ]              │
│        │                                                        │
└────────┴────────────────────────────────────────────────────────┘
```

**This is the "under 60 seconds" screen.** Everything fits without scrolling. Design priorities:
- Giant traffic light + score at top — instant read
- Trade plan and position sizing side by side
- Factor breakdown as horizontal bars — visual scan for red flags
- Two big action buttons at bottom — Confirm (green, primary) or Pass (neutral)
- Clicking "Pass" opens a small modal: "Reason for passing? (optional)" + text field + Save

---

### 2.5 Assets List

```
┌─────────────────────────────────────────────────────────────────┐
│  [TH]  Trading Helper                        [Accounts: $342K] │
├────────┬────────────────────────────────────────────────────────┤
│        │                                                        │
│  HOME  │  ASSETS                           [ + Add Asset ]      │
│        │                                                        │
│ [NEW   │  Filter: [ All ▼ ] [ Search... ]                       │
│  TRADE]│                                                        │
│        │  ┌─────────────────────────────────────────────────┐   │
│ ASSETS │  │ BTC    Bitcoin         Crypto     4 levels      │   │
│  ●     │  │ SOL    Solana          Crypto     2 levels      │   │
│        │  │ AAPL   Apple Inc       Equity     6 levels      │   │
│ JOURNAL│  │ GLD    SPDR Gold       Commodity  3 levels      │   │
│        │  │ SLV    iShares Silver  Commodity  1 level       │   │
│ ────── │  └─────────────────────────────────────────────────┘   │
│SETTINGS│                                                        │
│        │  Showing 5 active assets                               │
│        │                                                        │
└────────┴────────────────────────────────────────────────────────┘
```

**States:**
- **Empty:** "Add your first asset to start evaluating trades" + Add Asset button
- Click any row → opens Asset Detail

---

### 2.6 Asset Detail (Levels Management)

```
┌─────────────────────────────────────────────────────────────────┐
│  [TH]  Trading Helper                        [Accounts: $342K] │
├────────┬────────────────────────────────────────────────────────┤
│        │                                                        │
│  HOME  │  ← Assets / BTC Bitcoin                  [ Edit | Archive ]
│        │                                                        │
│ [NEW   │  Class: Crypto    Exchange: Multiple                   │
│  TRADE]│                                                        │
│        │  SUPPORT / RESISTANCE LEVELS              [ + Add Level ]
│ ASSETS │  ┌─────────────────────────────────────────────────┐   │
│  ●     │  │ Price       Label        Type        Status     │   │
│        │  │ ─────────── ──────────── ────────── ─────────── │   │
│ JOURNAL│  │ $108,000    Resistance   Manual      ● Active   │   │
│        │  │ $105,000    Fib 23.6%    Fibonacci   ● Active   │   │
│ ────── │  │  $98,500    Fib 38.2%    Fibonacci   ● Active   │   │
│SETTINGS│  │  $95,000    Fib 61.8%    Fibonacci   ● Active   │   │
│        │  │  $91,200    Support      Manual      ● Active   │   │
│        │  │  $88,000    Old support  Manual      ○ Invalid  │   │
│        │  └─────────────────────────────────────────────────┘   │
│        │                                                        │
│        │  FIB CALCULATOR                                        │
│        │  ┌─────────────────────────────────────────────────┐   │
│        │  │ Swing High  [ $112,000 ]                        │   │
│        │  │ Swing Low   [ $85,000  ]                        │   │
│        │  │                                                 │   │
│        │  │ Preview:                                        │   │
│        │  │   23.6%  →  $105,624                            │   │
│        │  │   38.2%  →  $98,686                             │   │
│        │  │   50.0%  →  $98,500                             │   │
│        │  │   61.8%  →  $95,314                             │   │
│        │  │   78.6%  →  $90,798                             │   │
│        │  │                                                 │   │
│        │  │              [ Add Fib Levels ]                  │   │
│        │  └─────────────────────────────────────────────────┘   │
│        │                                                        │
└────────┴────────────────────────────────────────────────────────┘
```

**Key interactions:**
- Levels table is sorted by price descending (highest at top)
- Click any level row to edit price/label inline
- Invalidated levels shown greyed out with strikethrough
- Fib calculator: enter swing high/low → preview levels → one click to add all
- "Add Level" opens inline row at top of table for quick manual entry

---

### 2.7 Journal

```
┌─────────────────────────────────────────────────────────────────┐
│  [TH]  Trading Helper                        [Accounts: $342K] │
├────────┬────────────────────────────────────────────────────────┤
│        │                                                        │
│  HOME  │  TRADE JOURNAL                                         │
│        │                                                        │
│ [NEW   │  Filter: [ All | Open | Closed | Passed ▼ ]           │
│  TRADE]│                                                        │
│        │  ┌─────────────────────────────────────────────────┐   │
│ ASSETS │  │ Date    Asset Dir  TF Score Signal Status  P&L  │   │
│        │  │ ──────  ───── ──── ── ───── ────── ──────  ──── │   │
│ JOURNAL│  │ Mar 9   BTC   L    4h  82   🟢    Open     —   │   │
│  ●     │  │                              [Log Outcome]      │   │
│        │  │ Mar 8   AAPL  S    1h  45   🔴    Passed   —   │   │
│ ────── │  │ Mar 7   GLD   L    D   68   🟡    Passed   —   │   │
│SETTINGS│  │ Mar 5   SOL   L    4h  74   🟡    Closed +$820 │   │
│        │  │ Mar 3   BTC   S    1h  81   🟢    Closed -$450 │   │
│        │  └─────────────────────────────────────────────────┘   │
│        │                                                        │
│        │  Click any row to view full evaluation details         │
│        │                                                        │
└────────┴────────────────────────────────────────────────────────┘
```

**Key interactions:**
- "Open" trades show [Log Outcome] button inline
- Clicking Log Outcome opens a modal:

```
┌──────────────────────────────────────┐
│  LOG OUTCOME — BTC LONG 4h           │
│                                      │
│  Recommended     Actual              │
│  Entry: $97,200  Entry: [$_______]   │
│  Stop:  $94,500                      │
│  Tgt:   $104,000 Exit:  [$_______]   │
│                                      │
│  P&L:  (auto-calculated)             │
│                                      │
│  Notes: [________________________]   │
│         [________________________]   │
│                                      │
│     [ Cancel ]    [ Save Outcome ]   │
└──────────────────────────────────────┘
```

- P&L auto-calculates from actual entry, exit, and position size
- Click any closed trade row to expand and see full evaluation + recommendation + outcome side by side

---

### 2.8 Settings

```
┌─────────────────────────────────────────────────────────────────┐
│  [TH]  Trading Helper                        [Accounts: $342K] │
├────────┬────────────────────────────────────────────────────────┤
│        │                                                        │
│  HOME  │  SETTINGS                                              │
│        │                                                        │
│ [NEW   │  [ Accounts ]  [ Checklist ]                           │
│  TRADE]│  ─────────────────────────────────────                 │
│        │                                                        │
│ ASSETS │  ACCOUNTS                       [ Connect with Plaid ] │
│        │  ┌─────────────────────────────────────────────────┐   │
│ JOURNAL│  │ Taxable                                         │   │
│        │  │ Balance: $92,000  (Plaid ● synced 2m ago)       │   │
│ ────── │  │ Type:    [ Taxable ▼ ]                          │   │
│SETTINGS│  │ Risk %:  [ 1.0 ] %                              │   │
│  ●     │  │ Risk $:  $920 per trade                         │   │
│        │  │ Holdings: 5 positions          [ View | Unlink ] │   │
│        │  ├─────────────────────────────────────────────────┤   │
│        │  │ IRA                                             │   │
│        │  │ Balance: $250,000  (Plaid ● synced 2m ago)      │   │
│        │  │ Type:    [ IRA ▼ ]                              │   │
│        │  │ Risk %:  [ 1.0 ] %                              │   │
│        │  │ Risk $:  $2,500 per trade                       │   │
│        │  │ Holdings: 8 positions          [ View | Unlink ] │   │
│        │  └─────────────────────────────────────────────────┘   │
│        │                                                        │
│        │  Or: [ + Add Account Manually ]                        │
│        │                                                        │
└────────┴────────────────────────────────────────────────────────┘
```

**Checklist tab:**

```
│        │  CHECKLIST CONFIGURATION                               │
│        │                                                        │
│        │  Factors are scored during trade evaluation.            │
│        │  Weights are normalized to 100.                         │
│        │                                                        │
│        │  ┌─────────────────────────────────────────────────┐   │
│        │  │ ≡ Trend Direction (W/D)    Scale    Wt: [15]    │   │
│        │  │ ≡ Trend Direction (4h/1h)  Scale    Wt: [10]    │   │
│        │  │ ≡ RSI (14) Status          Scale    Wt: [10]    │   │
│        │  │ ≡ RSI Divergence           Pass/Fail Wt: [10]   │   │
│        │  │ ≡ Mean Reversion (BB)      Pass/Fail Wt: [10]   │   │
│        │  │ ≡ MR Confirmation          Pass/Fail Wt: [ 5]   │   │
│        │  │ ≡ Near S/R Level           Scale    Wt: [15]    │   │
│        │  │ ≡ Risk/Reward Ratio        Numeric  Wt: [15]    │   │
│        │  │ ≡ Timeframe Alignment      Pass/Fail Wt: [10]   │   │
│        │  └─────────────────────────────────────────────────┘   │
│        │                                                        │
│        │  Total weight: 100     [ + Add Factor ]                │
│        │                                                        │
│        │  ≡ = drag to reorder                                   │
```

**Key interactions:**
- Weight fields are inline-editable, total updates live
- Drag handle (≡) to reorder factors
- Click factor name to expand and edit description, type, and config
- "Add Factor" appends a new row with defaults

---

## 3. Design Tokens

### Colors
```
Primary:        #2563EB  (blue — buttons, links, active states)
Primary hover:  #1D4ED8

Signal Green:   #16A34A  (score ≥75, confirmed trades, positive P&L)
Signal Yellow:  #CA8A04  (score 50-74, caution states)
Signal Red:     #DC2626  (score <50, losses, warnings, IRA restrictions)

Background:     #0F172A  (dark navy — main background)
Surface:        #1E293B  (cards, panels)
Surface hover:  #334155
Border:         #334155

Text primary:   #F8FAFC
Text secondary: #94A3B8
Text muted:     #64748B

Positive P&L:   #16A34A  (green)
Negative P&L:   #DC2626  (red)
```

### Typography
```
Font family:    Inter (sans-serif), system fallback
Font sizes:     12px (caption), 14px (body), 16px (body-lg),
                20px (h3), 24px (h2), 32px (h1), 48px (score display)
Font weights:   400 (normal), 500 (medium), 600 (semibold), 700 (bold)
Line height:    1.5 (body), 1.2 (headings)
Monospace:      JetBrains Mono (prices, numbers, scores)
```

### Spacing
```
Base unit: 4px
Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
Card padding: 24px
Section gap: 32px
```

### Components
```
Border radius:  8px (cards), 6px (buttons, inputs), 4px (badges)
Shadows:        none (flat design, rely on border/background contrast)
Transitions:    150ms ease (hover states, score updates)
```

---

## 4. Key Interaction Details

### Trade Evaluation Flow (Critical Path)

1. User clicks "New Trade" → navigates to Evaluate Trade Step 1
2. Selects asset from dropdown (type-ahead search) → S/R levels load automatically
3. Selects direction (Long/Short toggle) → if IRA + Short, inline warning appears immediately
4. Selects timeframe (radio pills)
5. Enters entry price, stop loss, target(s) → R:R, position size, risk $ calculate live
6. Clicks "Next: Score Checklist →"
7. For each factor: selects value via the factor's input type
   - Each selection immediately updates that factor's score AND the running composite score
   - Composite score bar animates from 0 toward final value as factors are filled
8. All factors filled → composite score shown with traffic light
9. Clicks "View Recommendation →" → Confirmation Dashboard renders
10. Reviews dashboard (target: <60 seconds)
11. Clicks "Confirm Trade" → trade saved as confirmed, returns to Dashboard
    OR clicks "Pass" → optional reason modal → trade saved as passed, returns to Dashboard

### Position Sizing Auto-Calculate

Triggers on any change to: entry price, stop loss, account selection, or risk %.

```
risk_amount = account_balance × risk_percent
stop_distance = abs(entry_price - stop_loss)
position_size = floor(risk_amount / stop_distance)
total_cost = position_size × entry_price
```

Display updates instantly (no server round-trip needed — client-side calc).

If score ≥ 80: show secondary line "High conviction: 2% risk = [X] shares ($[Y])" as an option, not default.

### IRA Restriction Check

Triggers when account type = IRA AND (direction = SHORT or vehicle includes naked options/margin).

Display: inline warning banner (red background, white text) immediately below the account selector. Not a modal — don't block the flow, just inform.
