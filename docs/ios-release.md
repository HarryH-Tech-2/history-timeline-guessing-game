# Releasing Date Guesser on the App Store

The code is iOS-ready as of 2026-09-28: bundle id `com.harryhh.historydateguesser`,
iPhone only, Sign in with Apple, Firebase iOS app registered, Apple-safe store copy,
paywall renewal terms and legal links, EAS Update channels. What is left needs your
Apple account. Builds and submissions run from this Windows PC through EAS; no Mac.

## 1. One-time setup

1. **Apple Developer Program** ($99/yr): https://developer.apple.com/programs/enroll/
   Individual enrolment is fine; the seller name on the store is your legal name.
2. **App Store Connect → My Apps → +** New App: platform iOS, name
   "History Quiz: Guess the Year" (or "Date Guesser"), primary language English (UK),
   bundle id `com.harryhh.historydateguesser`, SKU `date-guesser`. (If the bundle id
   is not in the list, the first `eas build -p ios` registers it; come back after.)
3. Note the **Apple ID** number (App Information page) and put it in two places:
   - `src/config/store.ts` → `APP_STORE_ID` (turns on the App Store link in shares
     and the "Rate us" review page)
   - `eas.json` → `submit.production.ios.ascAppId` (lets `eas submit` find the app)
4. **Privacy policy URL** → `src/config/store.ts` → `PRIVACY_POLICY_URL` (the same
   page as the Play listing's). Apple rejects subscription apps without it.
5. **Firebase → Authentication → Sign-in method → Apple → Enable.** For account
   deletion to revoke Apple tokens (Apple requires it) also fill in the Services ID,
   Team ID, Key ID and private key there: developer.apple.com → Keys → + → "Sign in
   with Apple". Sign-in itself works with just "Enable".
6. **In-app purchases** (App Store Connect → Monetization):
   - Subscriptions → group "Premium" → `premium_monthly` (1 month, $2.99, with a
     1-week free-trial introductory offer) and `premium_yearly` (1 year, $19.99)
   - In-App Purchases → Non-Consumable `premium_lifetime` ($34.99)
   Apple sets every country's price from the US price; adjust any by hand.
   Also sign the **Paid Apps agreement** (Business → Agreements) and add bank + tax
   details, or products never load.
7. **RevenueCat → Project → + App → App Store**: bundle id as above, upload the
   App Store Connect **In-App Purchase key** (Users and Access → Integrations → In-App
   Purchase), attach the three products to the existing `premium` entitlement and
   offering. Then put the app's public API key in EAS:
   `npx eas env:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_xxx --environment production --environment preview --visibility sensitive`

## 2. Build, test, submit

```
npx eas build -p ios --profile production      # asks for your Apple login the first time
npx eas submit -p ios --latest                 # uploads to App Store Connect / TestFlight
```

Test through **TestFlight** (App Store Connect → TestFlight → add a tester by email;
they install the TestFlight app). Without an iPhone: a friend's phone, or build
`--profile preview` with `"ios": {"simulator": true}` and run it on Appetize.io.

## 3. App Store listing

- Screenshots: 6.9" iPhone, 1320×2868 (take them from TestFlight or Appetize).
- App Privacy: Identifiers (Device ID → Analytics, not linked to identity), Usage
  Data (Product Interaction → Analytics), Contact Info (Email, only when signed in →
  App Functionality, linked). No tracking (the app never uses the IDFA).
- Age rating questionnaire: none of the content categories apply.
- App Review Information: no login needed to play; note that Premium can be tested
  with a Sandbox account.

## 4. Both platforms from then on

```
npx eas build -p all --profile production
npx eas submit -p all --latest
```

JS-only fixes (copy, layout, questions, bugs in our code) can skip the stores:
`npx eas update --channel production --message "…"` reaches every build that has
expo-updates (Android from build 16, iOS from its first build). Anything that
changes native code (new package, app.json plugin, the Reanimated patch) still
needs a build; the fingerprint runtime version keeps updates off builds they don't fit.
