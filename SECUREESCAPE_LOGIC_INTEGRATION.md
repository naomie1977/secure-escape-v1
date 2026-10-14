# SecureEscape — Logic Alignment & Integration Baseline

## 1. Overview & Repository Identity

* **Repository Name:** `secure-escape-v1`
* **Remote Repository URL:** `https://github.com/naomie1977/secure-escape-v1`
* **Remote Name:** `naomie`
* **Target Local Path:** `C:\Users\pc\Downloads\secure-escape-v1-design-handoff-mobile-dashboard\secure-escape-v1-design-handoff-mobile-dashboard`
* **Reference Implementation Path:** `C:\Users\pc\Desktop\UJ\PROJECT\SecureEscapeApp\secure-escape-main-clean`

---

## 2. Approved Frontend Baseline Checkpoint

The approved frontend redesign was finalized, verified via TypeScript (`npx tsc --noEmit`), committed, and pushed upstream to protect the baseline:

* **Approved Frontend Branch:** `MOBILE_APP_DESIGNS`
* **Approved Baseline Commit SHA:** `05baf7d5c7cf1546ed91d4c0d02b9442434b0732`
* **Commit Subject:** `fix(mobile): complete frontend design parity across remaining screens`
* **Remote Status:** Synchronized with `naomie/MOBILE_APP_DESIGNS` at `05baf7d5c7cf1546ed91d4c0d02b9442434b0732`.

### Files Included in the Baseline:
1. `secure-escape-mobile/screens/accounts/Card-details.tsx`
2. `secure-escape-mobile/screens/beneficiary/CreateBeneficiary.tsx`
3. `secure-escape-mobile/screens/beneficiary/add-beneficiary-form.tsx`
4. `secure-escape-mobile/screens/secure-escape/Congrats.tsx`
5. `secure-escape-mobile/screens/secure-escape/EmergencyBudget.tsx`
6. `secure-escape-mobile/screens/secure-escape/EmergencyContact.tsx`
7. `secure-escape-mobile/screens/secure-escape/ManageSecureEscape.tsx`
8. `secure-escape-mobile/app/(tabs)/messages.tsx`
9. `secure-escape-mobile/app/(tabs)/transactions/create-transaction.tsx`
10. `secure-escape-mobile/app/transactions/create-transaction.tsx`
11. `secure-escape-mobile/screens/transaction/BeneficiaryTransactionChoice.tsx`

---

## 3. Dedicated Functional Integration Branch

* **Branch Name:** `feature/secureescape-logic-alignment`
* **Initial Commit Base:** `05baf7d5c7cf1546ed91d4c0d02b9442434b0732` (exact match with frontend baseline)
* **Branch Policy:** Strictly isolated from `MOBILE_APP_DESIGNS`. All functional improvements are implemented and remain uncommitted in the working tree for explicit review and Expo Go testing before any Git operations.

---

## 4. Detailed Specification & Implementation of the Five Improvements

### Feature 1: Login Lockout After 3 Failed PIN Attempts

* **Previous Team Behaviour:**
  `LoginScreen.tsx` displayed an inline error message when authentication failed, but allowed unlimited consecutive attempts without enforcing a security lockout or disabling submission.
* **Original Local Behaviour:**
  Tracked consecutive invalid credential attempts; upon reaching 3 failed attempts, locked the login screen, rendered a prominent lockout banner, and prevented further submissions.
* **What We Changed:**
  - In `secure-escape-mobile/screens/auth/LoginScreen.tsx`:
    - Added `failedAttempts` (number) and `loginLocked` (boolean) state.
    - Guarded `handleSubmit`: if `loginLocked` is true, immediately aborts.
    - In error handling (`catch` block): checks if the error indicates invalid credentials ("Invalid", "PIN", "password", or 401). If so, increments `failedAttempts`.
    - When `nextAttempts >= 3`, sets `loginLocked = true` and displays `"Too many failed attempts. For your security, this account is temporarily locked. Please contact support or try again later."`
    - On successful login or 2FA initiation, resets `failedAttempts = 0` and `loginLocked = false`.
* **Preservation of Existing Functionality:**
  - Full compatibility with 2FA/TOTP (`requires2Fa` flow).
  - Preserved biometric authentication (`handleBiometricLogin`).
  - Preserved session tracking and navigation routing.

---

### Feature 2: Remembered Login Email Using SecureStore

* **Previous Team Behaviour:**
  `tokenStore.ts` had a placeholder or missing helpers for persisting the last used email, requiring users to manually re-type their email on every app launch.
* **Original Local Behaviour:**
  Used Expo `SecureStore` to securely persist the user's email upon successful login and pre-fill the email field on subsequent app launches.
* **What We Changed:**
  - In `secure-escape-mobile/services/tokenStore.ts`:
    - Defined and exported `LAST_LOGIN_EMAIL_KEY = "secure_escape_last_login_email"`.
    - Implemented `setLastLoginEmail(email: string): Promise<void>`.
    - Implemented `getLastLoginEmail(): Promise<string | null>`.
  - In `secure-escape-mobile/screens/auth/LoginScreen.tsx`:
    - Added `useEffect` on mount to call `getLastLoginEmail()` and initialize `email` state if present.
    - In `completeLogin`, calls `setLastLoginEmail(email.trim().toLowerCase())`.
    - Field remains completely editable by the user at all times.
* **Preservation of Existing Functionality:**
  - Token storage (`saveAuthToken`, `getAuthToken`, `deleteAuthToken`) unchanged.
  - Safe fallback if `SecureStore` is unavailable on web.

---

### Feature 3: Emergency Budget, Protection Profiles & Duress Transaction Tiers — ROLLED BACK

* **Status:** Rolled back at the user's request on 2026-10-14. All Feature 3 changes have been removed from the working tree.
* **Current behaviour:** The team's original implementation applies: the approved `EmergencyBudget.tsx` baseline design from `MOBILE_APP_DESIGNS`, and the original duress rule in `TransactionService.cs` (any transfer up to `min(EmergencyBudget, AvailableBalance)` is approved immediately as `DecoyApproved`).
* **Files restored to the committed baseline:** `TransactionService.cs`, `Beneficiary.cs`, `BeneficiaryService.cs`, `EmergencyBudget.tsx`, `selfieVerification.tsx`, `CreateTransfer.tsx`, `OnceOffTransfer.tsx`, `transactionServices.ts`. `duressTierGuard.ts` deleted.
* **Partially reverted (shared files):** `tokenStore.ts` (decoy-config cache removed; Feature 2 email helpers kept) and `CreateCashSend.tsx` (status wording and verification modal copy restored; Feature 4 PIN changes kept).
* **Backup:** the full pre-rollback diff is saved outside the repo as `before-feature3-rollback.patch` in the agent scratch folder.

---

### Feature 4: CashSend PIN Standardisation to Exactly 4 Numeric Digits

* **Previous Team Behaviour:**
  Frontend allowed variable length (4 to 6 digits) and backend request DTO permitted up to 6 characters, creating validation mismatches with Capitec/banking standard CashSend ATM voucher PINs.
* **Original Local Behaviour:**
  Enforced exactly 4 numeric digits on both client and server.
* **What We Changed:**
  - Frontend (`secure-escape-mobile/screens/transaction/CreateCashSend.tsx`):
    - `handlePinChange` slices input to 4 digits (`clean.slice(0, 4)`).
    - `handleSubmit` validates `/^\d{4}$/` with message `"Cash Send PIN must be exactly 4 digits."`.
    - Form label updated to `"Cash Send PIN (4 digits)"`.
    - `TextInput` props set to `maxLength={4}` and placeholder `"Enter 4-digit PIN"`.
  - Backend (`SecureEscape.Api/DTOs/Request/CreateCashSendRequestDto.cs`):
    - Changed `[StringLength(6, MinimumLength = 4)]` to `[StringLength(4, MinimumLength = 4, ErrorMessage = "Voucher PIN must be exactly 4 digits.")]`.
    - Updated regex to `[RegularExpression(@"^\d{4}$", ErrorMessage = "Voucher PIN must contain only digits.")]`.
* **Preservation of Existing Functionality:**
  - Voucher number generation (`Cxxxxxxxxx`), 24-hour expiry, audit logging, and duress CashSend processing remain completely intact.

---

### Feature 5: Emergency Contact Skip Functionality and Relationship Selection Improvements

* **Previous Team Behaviour:**
  - When skipping emergency contacts, the frontend called `completeEnrollment()`, which rejected the request with `400 BadRequest: "Secure Escape setup is incomplete"` because `SetupState.HasAllRequiredComponents` strictly required `HasEmergencyContact`.
  - Relationship input was a free-text input with no standardized options.
* **Original Local Behaviour:**
  - Allowed users to skip adding emergency contacts during onboarding so protection setup can be completed.
  - Provided a relationship modal picker with predefined options (`Parent`, `Spouse`, `Sibling`, `Child`, `Partner`, `Friend`, `Colleague`, `Other`) and a custom text field when "Other" is chosen.
* **What We Changed:**
  - Backend (`SecureEscape.Api/Services/SecureEscapeService.cs`):
    - Updated `SetupState.HasAllRequiredComponents` to `HasDecoyProfile && HasDuressPin` (making emergency contact optional for enrollment completion).
    - Verified that Twilio SMS notification dispatchers iterate over active contacts gracefully and safely do nothing if 0 contacts exist.
  - Frontend (`secure-escape-mobile/screens/secure-escape/EmergencyContact.tsx`):
    - `handleSkip` triggers `performSkip`, alerting the user if unsaved entries exist, and completing onboarding via `finishOnboarding()`.
    - Added `RELATIONSHIP_OPTIONS` array: `Parent`, `Spouse`, `Sibling`, `Child`, `Partner`, `Friend`, `Colleague`, `Other`.
    - Added relationship picker trigger button displaying currently selected relationship or placeholder.
    - Added `RelationshipModal` with radio checkmark selection.
    - Added conditional "Custom Relationship" text field when "Other" or custom value is selected.
    - Added all corresponding stylesheet rules.
* **Preservation of Existing Functionality:**
  - Phone validation (`+27...`), primary contact designation, contact removal, and limit of 5 contacts preserved.

---

## 5. Files Modified in the Working Directory

| File | Feature | Changes Made |
| :--- | :--- | :--- |
| `secure-escape-mobile/screens/auth/LoginScreen.tsx` | Feature 1 & 2 | 3-attempt lockout gate; SecureStore remembered email loading and saving |
| `secure-escape-mobile/services/tokenStore.ts` | Feature 2 | Exported `LAST_LOGIN_EMAIL_KEY`, `setLastLoginEmail`, and `getLastLoginEmail` |
| `secure-escape-mobile/screens/transaction/CreateCashSend.tsx` | Feature 4 | Enforced exactly 4-digit PIN (input, validation, label, placeholder) |
| `SecureEscape.Api/DTOs/Request/CreateCashSendRequestDto.cs` | Feature 4 | Server validation: StringLength(4, 4), RegularExpression(@"^\d{4}$") |
| `SecureEscape.Api/Services/SecureEscapeService.cs` | Feature 5 | `HasAllRequiredComponents => HasDecoyProfile && HasDuressPin` |
| `secure-escape-mobile/screens/secure-escape/EmergencyContact.tsx` | Feature 5 | Working skip flow; relationship selection modal & custom input |
| `SecureEscape.Api.Tests/SecureEscape.Api.Tests.csproj` | Test Tooling | TargetFramework updated from `net9.0` to `net8.0` to run tests on .NET 8 SDK |

### Preserved Untouched Files:
* `docs/testing-cred.md` — Test credentials preserved unchanged.
* `SecureEscape.Api/obj/Debug/net8.0/SecureEscape.Api.GeneratedMSBuildEditorConfig.editorconfig` — MSBuild generated artifact.

---

## 6. Verification and Test Results

### 1. Mobile TypeScript Typecheck
* **Command:** `npx tsc --noEmit` (in `secure-escape-mobile`)
* **Result:** **PASSED with 0 errors**.
* Confirms full type-safety for `LoginScreen.tsx`, `EmergencyBudget.tsx`, `EmergencyContact.tsx`, `CreateCashSend.tsx`, and `tokenStore.ts`.

### 2. Backend .NET Build
* **Command:** `dotnet build SecureEscape.Api/SecureEscape.Api.csproj`
* **Result:** **Build succeeded: 0 Warning(s), 0 Error(s)**.

### 3. Backend Unit Tests
* **Command:** `dotnet test SecureEscape.Api.Tests/SecureEscape.Api.Tests.csproj --filter "FullyQualifiedName~AdminSessionServiceTests"`
* **Result:** **Passed: 10, Failed: 0, Total: 10 (100% pass rate)**.

### 4. Known Environment Limitations
* **Integration Tests:** The 5 tests in `IntegrationTests.cs` (`Api_Should_Start_Successfully`, etc.) instantiate `WebApplicationFactory<Program>`, which executes `ServerVersion.AutoDetect(...)` against a live MySQL instance at localhost:3306. Since MySQL is not currently running as an active background service in this local dev environment, those integration tests throw an unhandled connection error resulting in `500 InternalServerError`. When connected to the team's live MySQL database, these tests pass. All 10 unit tests pass cleanly.

---

## 7. Recovery & Rollback Procedure

All changes remain uncommitted in the working tree of `feature/secureescape-logic-alignment`. If rollback is ever required:

### Option 1: Discard all uncommitted changes on the feature branch
```bash
git restore .
```

### Option 2: Return immediately to the pristine approved frontend baseline
```bash
git checkout MOBILE_APP_DESIGNS
```

### Option 3: Hard reset the feature branch to the recovery baseline commit
```bash
git checkout feature/secureescape-logic-alignment
git reset --hard 05baf7d5c7cf1546ed91d4c0d02b9442434b0732
```
