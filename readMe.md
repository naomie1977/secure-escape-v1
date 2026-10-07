# Secure Escape

Secure Escape is a banking safety system designed to help users during situations where they are being forced or threatened to access their bank account.

The system includes a React Native mobile banking application, a fraud management web dashboard, an ASP.NET Core backend API, and a MySQL database. Customers can configure Secure Escape safety features, while authorised fraud analysts and managers can investigate and manage duress cases through the fraud operations dashboard.

## Sprint 9–10 Release

This repository contains the Secure Escape Sprint 9–10 Security Review and System Evaluation release.

**Release tag:** `Sprint-9-Security-Evaluation`

**Release commit:** `e1a11d3c8ca4342a8deb0e5126761d2ddcec7a7f`

**Repository:** `https://github.com/f0f-found/secure-escape-v1`

Sprint 9–10 focused on security hardening, system evaluation, regression testing, dependency review, privacy and ethical review, usability evaluation, and release verification of the Sprint 7–8 MVP baseline.

## Project Structure

The repository contains the following main projects:

- `SecureEscape.Api` – ASP.NET Core backend API
- `SecureEscapeDash` – React and TypeScript fraud management dashboard
- `secure-escape-mobile` – React Native / Expo mobile application
- `SecureEscape.Api.Tests` – automated backend and integration tests
- `docs` – project documentation and supporting evidence where applicable

## Technologies Used

### Backend

- ASP.NET Core
- .NET 8
- Entity Framework Core
- MySQL
- JWT authentication
- BCrypt
- Swagger / OpenAPI

### Web Dashboard

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Leaflet / React Leaflet

### Mobile Application

- React Native
- Expo
- Expo Router
- Expo Secure Store
- Expo Location

### Testing and Evaluation

- xUnit
- Moq
- .NET Code Coverage
- Security and authorisation testing
- Dependency vulnerability auditing
- Configuration and secret review
- User evaluation and SUS scoring

### Version Control

- Git
- GitHub

## Prerequisites

Before running Secure Escape locally, make sure the following are installed:

- Git
- .NET 8 SDK
- Node.js and npm
- Entity Framework Core CLI tools
- MySQL or access to the configured MySQL database
- Expo tooling for mobile development

If the Entity Framework CLI tool is not installed, run:

```powershell
dotnet tool install --global dotnet-ef
```

## Installation

Clone the repository:

```powershell
git clone https://github.com/f0f-found/secure-escape-v1.git
```

Move into the project folder:

```powershell
cd secure-escape-v1
```

The backend, dashboard and mobile application can then be started separately using the instructions below.

## Database Setup

Secure Escape uses MySQL with Entity Framework Core.

The backend reads the database connection from:

```text
ConnectionStrings:default
```

Database configuration is associated with the backend configuration files. Production credentials and secrets must not be committed to source control.

### Database Migrations

Migration files are stored in:

```text
SecureEscape.Api/Migrations
```

Apply the migrations from the repository root with:

```powershell
dotnet ef database update --project .\SecureEscape.Api\SecureEscape.Api.csproj
```

The configured MySQL database must be reachable for this command to complete successfully.

### Seed Data

Development seed data is defined in:

```text
SecureEscape.Api/Data/DbSeeder.cs
```

The development seed data supports local testing of bank integrations, customer accounts and administrative roles.

Seeded/test credentials are intended only for authorised development and assessment use and should not be used as production credentials.

## Running the Backend API

From the repository root:

```powershell
dotnet run --project .\SecureEscape.Api\SecureEscape.Api.csproj
```

The local development API runs on:

```text
http://localhost:5116
```

In the Development environment, Swagger is available at:

```text
http://localhost:5116/swagger
```

As part of Sprint 9–10 security hardening, Swagger/Swagger UI is restricted to the Development environment.

Keep the backend running while using the dashboard or mobile application locally.

## Running the Web Dashboard

Open a separate terminal:

```powershell
cd SecureEscapeDash
npm install
npm run dev
```

The dashboard uses:

```text
VITE_API_BASE_URL
```

to configure the backend API address.

For a production build:

```powershell
npm run build
```

Sprint 9–10 final verification successfully transformed 1,879 modules and produced the production build. Vite reported a bundle-size optimisation warning for a JavaScript chunk larger than 500 kB; this does not prevent the build from completing and remains a future optimisation item.

## Running the Mobile Application

Open a separate terminal:

```powershell
cd secure-escape-mobile
npm install
npx expo start
```

The mobile application uses:

```text
EXPO_PUBLIC_API_BASE_URL
```

to configure its backend API address.

For mobile project health verification:

```powershell
npx expo-doctor
```

Sprint 9–10 final verification produced:

```text
21/21 checks passed. No issues detected!
```

An Android export was also successfully generated during Sprint 9–10 verification.

## Automated Testing

Automated backend tests are located in:

```text
SecureEscape.Api.Tests
```

Run the final regression suite from the repository root:

```powershell
dotnet test .\SecureEscape.Api.Tests\SecureEscape.Api.Tests.csproj
```

The Sprint 9–10 final regression result was:

```text
Total: 15
Succeeded: 15
Failed: 0
Skipped: 0
```

This confirms that the final assessed Sprint 9–10 release passed the automated backend regression suite.

## Code Coverage

Code coverage can be collected using:

```powershell
dotnet test .\SecureEscape.Api.Tests\SecureEscape.Api.Tests.csproj --collect:"XPlat Code Coverage"
```

Coverage results are generated under:

```text
SecureEscape.Api.Tests/TestResults
```

Automated coverage remains limited and is recorded as a known project limitation. Passing regression tests should therefore not be interpreted as complete test coverage of the system.

## Security Review

Sprint 9–10 included a focused security review of the MVP.

The review covered:

- Authentication
- Role-based authorisation
- Protected API access
- Input and transaction validation
- Secret and configuration handling
- NuGet dependency vulnerabilities
- Dashboard npm dependencies
- Mobile npm dependencies
- Error handling
- Security logging
- Data protection
- Privacy and POPIA considerations
- Threat modelling and risk treatment

### Security Hardening Completed

Sprint 9–10 security work included:

- Strengthening role restrictions on administrative endpoints
- Preventing customer JWTs from accessing restricted administrative functionality
- Restricting Swagger to the Development environment
- Adding safer production exception handling
- Removing identified plaintext API client secret seed literals
- Updating vulnerable backend NuGet packages
- Remediating dashboard npm dependency vulnerabilities
- Re-running regression testing after security changes

The final backend NuGet vulnerability audit reported:

```text
The given project `SecureEscape.Api` has no vulnerable packages given the current sources.
```

The dashboard dependency audit was reduced from 12 reported vulnerabilities to 0 after remediation.

The mobile dependency audit initially reported 41 vulnerabilities. Standard non-breaking remediation removed the critical advisory and reduced the remaining result to 30 advisories: 11 moderate and 19 high. Breaking dependency/SDK upgrades were deliberately deferred to a future sprint rather than applying unsafe forced upgrades.

## Role-Based Access Control

Secure Escape uses JWT authentication and role-based authorisation.

Administrative roles include:

- FraudAnalyst
- FraudManager
- SystemAdmin
- SecureEscapeAdmin

Sprint 9–10 runtime testing confirmed that restricted operations reject users without the required role. For example, a FraudAnalyst attempting to access restricted audit-log functionality received HTTP `403 Forbidden`.

A SecureEscapeAdmin-specific runtime test could not be completed because no suitable seeded SecureEscapeAdmin test account was available. Relevant source-level role configuration was reviewed and this limitation is documented in the Sprint 9–10 report.

## Secure Escape Case Workflow

The fraud investigation workflow includes:

```text
Assigned
    ↓
Investigating
    ↓
Report Submitted
    ↓
Manager Review
    ↓
Resolved / False Alarm
```

Fraud analysts can claim and investigate cases, record investigation information and submit reports for review.

Final case outcomes follow the formal review workflow rather than bypassing manager review.

## Main Secure Escape Features

The current system includes:

1. Customer authentication
2. Secure Escape configuration
3. Normal and duress PIN handling
4. Emergency contact and emergency budget configuration
5. Duress session and fraud alert management
6. Fraud case investigation
7. Case claiming and assignment
8. Financial evidence
9. Readable location/address evidence
10. Investigation summaries and case reporting
11. Manager review and case resolution
12. Fraud Operations Center navigation
13. Audit logging and administrative controls
14. Dashboard role-based access control

## API

The ASP.NET Core backend provides REST API endpoints used by the mobile application and fraud management dashboard.

Functions include:

- Customer login and logout
- PIN verification
- Customer profiles
- Bank accounts
- Beneficiaries
- Transactions
- Secure Escape configuration
- Duress PIN configuration
- Emergency contacts
- Administrator authentication
- Duress session retrieval
- Location history
- Case claiming and assignment
- Case status updates
- Analyst report submission
- Manager review
- Account freezing
- Notification workflow
- Audit logging

Protected endpoints use JWT authentication and role-based authorisation where required.

## Sprint 9–10 System Evaluation

The Sprint 9–10 evaluation involved five anonymised representative participants identified as P01–P05.

All participants completed the same five core tasks.

Results included:

- 25/25 task attempts completed successfully
- 100% overall task completion
- Overall mean task time: 117 seconds
- Overall median task time: 120 seconds
- 4/25 task attempts required assistance
- 3/5 participants required assistance at least once
- Mean SUS score: 67.0
- Median SUS score: 75
- Mean usefulness rating: 3.8/5

The pre-set SUS target of at least 68 and usefulness target of at least 4/5 were not met. The results are therefore reported as limitations rather than being presented as successful targets.

Evaluation findings identified opportunities for clearer setup/profile guidance and clearer guidance around parts of the duress journey. These usability improvements are retained as future backlog items.

Full anonymised evaluation data, formulas, metrics and charts are supplied in the Sprint 9–10 evaluation workbook.

## Release Verification

The final Sprint 9–10 release was verified through:

- Backend regression testing: 15/15 succeeded
- Backend NuGet vulnerability audit: no vulnerable packages from current configured sources
- Secret/configuration remediation verification: passed
- Dashboard production build: successful
- Expo Doctor: 21/21 checks passed
- Android export: successful
- Git release tag verification: completed

The assessed release is identified by:

```text
Tag: Sprint-9-Security-Evaluation
Commit: e1a11d3c8ca4342a8deb0e5126761d2ddcec7a7f
```

## Known Limitations

Known limitations at the end of Sprint 9–10 include:

- Mobile dependency audit retains 30 advisories requiring future dependency/SDK work: 11 moderate and 19 high
- SecureEscapeAdmin runtime role testing was not completed because a suitable seeded account was unavailable
- Emergency notification dispatch remains simulated; a production SMS provider is not yet integrated
- Two-factor authentication runtime validation remains incomplete
- Face evidence is not yet implemented
- Screen-recording evidence is not yet implemented
- Automated code coverage remains low
- Dashboard production build reports a JavaScript chunk-size optimisation warning
- Evaluation sample size was limited to five participants
- Mean SUS score of 67 was below the target of 68
- Mean usefulness score of 3.8/5 was below the target of 4/5
- Production data-retention and complete data-subject workflow implementation remain future work

These limitations are documented rather than hidden and form part of the future project backlog.

## Future Backlog

Priority future work includes:

- Addressing remaining mobile dependency advisories through controlled compatible upgrades
- Completing SecureEscapeAdmin runtime role testing
- Integrating and validating a real notification/SMS provider
- Completing two-factor authentication validation
- Implementing face evidence
- Implementing screen-recording evidence
- Increasing automated test coverage
- Optimising the dashboard production bundle
- Improving setup/profile guidance identified during user evaluation
- Improving guidance around the duress journey
- Expanding evaluation with a larger participant sample
- Completing production privacy, retention and data-subject workflows

## Running the Complete System Locally

Run the major components in separate terminals.

### Terminal 1 – Backend

```powershell
dotnet run --project .\SecureEscape.Api\SecureEscape.Api.csproj
```

### Terminal 2 – Web Dashboard

```powershell
cd SecureEscapeDash
npm install
npm run dev
```

### Terminal 3 – Mobile Application

```powershell
cd secure-escape-mobile
npm install
npx expo start
```

Make sure the configured MySQL database is reachable and the dashboard and mobile application use the correct backend API address.

## Release and Deployment

The project repository is:

```text
https://github.com/f0f-found/secure-escape-v1
```

The Sprint 9–10 assessed release is identified by:

```text
Sprint-9-Security-Evaluation
```

The project also retains the deployed API and Android build used for the preceding MVP release. Current deployment/build access information is documented in the Sprint 9–10 submission report and the preceding Sprint 7–8 release documentation.

Do not commit production credentials, tokens, connection strings or other sensitive secrets to the repository.

## Documentation

The Sprint 9–10 submission documentation contains:

- Security review
- Architecture and threat model
- Security test results
- Role/access matrix
- Dependency and configuration review
- Security risk register
- POPIA and ethical review
- User evaluation methodology
- Anonymised evaluation results
- SUS and usefulness results
- Quantitative metrics and charts
- Qualitative themes
- Findings-to-action traceability
- Regression and release verification
- Git and contribution evidence
- Known limitations and future backlog
- Supporting appendices and screenshots

The separate evaluation workbook contains the anonymised raw task results, SUS responses, feedback, calculated metrics and charts.

## Sprint 9–10 Release Status

The Sprint 9–10 Security Review and System Evaluation release is complete for submission.

No unresolved Critical security issue was identified in the reviewed release. Security findings addressed during the sprint were retested before release. Remaining limitations and dependency risks are explicitly documented for future work.

Usability findings identified during the five-participant evaluation are retained in the future backlog and are not falsely represented as implemented.

For assessment and reproduction, use the stable Git tag:

```text
Sprint-9-Security-Evaluation
```