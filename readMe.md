# Secure Escape

Secure Escape is a banking safety system designed to help users during situations where they are being forced or threatened to access their bank account.

The project includes a mobile banking application, a fraud management web dashboard, a backend API and a MySQL database. The system allows customers to configure Secure Escape features, while fraud analysts and managers can investigate and manage duress cases through the dashboard.

## Project Structure

The repository contains the following main projects:

- `SecureEscape.Api` – ASP.NET Core backend API
- `SecureEscapeDash` – React and TypeScript fraud management dashboard
- `secure-escape-mobile` – React Native mobile application
- `SecureEscape.Api.Tests` – automated backend tests
- `docs` – project documentation and testing evidence

## Technologies Used

### Backend

- ASP.NET Core
- .NET 8
- Entity Framework Core
- MySQL
- JWT Authentication
- BCrypt
- Swagger

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

### Testing

- xUnit
- Moq
- .NET Code Coverage

### Version Control

- Git
- GitHub

## Prerequisites

Before running Secure Escape, make sure the following are installed:

- Git
- .NET 8 SDK
- Node.js and npm
- Entity Framework Core CLI tools
- MySQL or access to the configured MySQL database
- Expo Go if the mobile application will be tested on a physical device

If the Entity Framework CLI tool is not installed, run:

```powershell
dotnet tool install --global dotnet-ef
```

````

## Installation

Clone the repository:

```powershell
git clone https://github.com/f0f-found/secure-escape-v1.git
````

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

The database configuration is located in:

```text
SecureEscape.Api/appsettings.json
```

The configured MySQL database must be available before running database migrations or starting the backend.

### Database Migrations

The database schema is managed using Entity Framework Core migrations.

Migration files are stored in:

```text
SecureEscape.Api/Migrations
```

The migration history contains the initial database schema and later changes required by the system, including emergency contacts, Secure Escape configuration, notifications, user sessions, case assignments, case reporting and manager reviews.

To apply the migrations, run this command from the root of the repository:

```powershell
dotnet ef database update --project .\SecureEscape.Api\SecureEscape.Api.csproj
```

The configured MySQL database must be reachable for this command to complete successfully.

### Seed Data

The project includes seed data in:

```text
SecureEscape.Api/Data/DbSeeder.cs
```

The seed data provides sample:

- Bank integrations
- API clients
- Customer users
- Authentication credentials
- Bank accounts
- Beneficiaries
- Fraud analysts and managers

Seed data is automatically checked and added when the backend starts.

If the database already contains bank integration records, the seeder does not add the sample data again.

No separate seed command is required.

## Running the Backend API

From the root of the repository, run:

```powershell
dotnet run --project .\SecureEscape.Api\SecureEscape.Api.csproj
```

The API runs locally on:

```text
http://localhost:5116
```

Swagger is available at:

```text
http://localhost:5116/swagger
```

Swagger can be used to view and test the available API endpoints.

Keep the backend running while using the dashboard or mobile application.

## Running the Web Dashboard

Open a separate terminal and move into the dashboard folder:

```powershell
cd SecureEscapeDash
```

Install the required packages:

```powershell
npm install
```

The dashboard uses the following environment variable for the backend API address:

```text
VITE_API_BASE_URL
```

For local testing, it can be configured to point to:

```text
http://localhost:5116
```

Start the dashboard:

```powershell
npm run dev
```

Vite will display the local dashboard address in the terminal.

To create a production build, run:

```powershell
npm run build
```

## Running the Mobile Application

Open a separate terminal and move into the mobile application folder:

```powershell
cd secure-escape-mobile
```

Install the required packages:

```powershell
npm install
```

The mobile application uses the following environment variable for its backend API address:

```text
EXPO_PUBLIC_API_BASE_URL
```

When using Expo Go on a physical phone, the API address must be reachable from that device.

Start the Expo development server:

```powershell
npm start
```

Alternatively:

```powershell
npx expo start
```

A QR code will be displayed. Scan the QR code using Expo Go to open the application on a physical device.

Other available commands include:

```powershell
npm run android
npm run ios
npm run web
```

## Automated Testing

Automated backend tests are located in:

```text
SecureEscape.Api.Tests
```

The test suite uses xUnit and Moq.

The Sprint 7–6 automated test suite contains 10 backend tests covering important Secure Escape and fraud investigation behaviour.

Run the automated tests from the root of the repository:

```powershell
dotnet test .\SecureEscape.Api.Tests\SecureEscape.Api.Tests.csproj
```

The completed Sprint 7–6 test run produced:

```text
Total tests: 10
Passed: 10
Failed: 0
Skipped: 0
```

## Code Coverage

Run the automated tests with code coverage using:

```powershell
dotnet test .\SecureEscape.Api.Tests\SecureEscape.Api.Tests.csproj --collect:"XPlat Code Coverage"
```

Coverage results are generated inside:

```text
SecureEscape.Api.Tests/TestResults
```

Testing evidence is also included in the project documentation.

## Secure Escape Case Workflow

The fraud case workflow used by Secure Escape is:

```text
Assigned
    ↓
Investigating
    ↓
Report Submitted
    ↓
Manager Review
    ↓
Resolved
```

The fraud analyst investigates the assigned case and submits a report for review.

If the fraud manager approves the report, the case is resolved.

If the fraud manager rejects the report, the case returns to the investigation stage with feedback.

## Main MVP Features

The Sprint 7–6 MVP includes:

1. Customer authentication
2. Secure Escape configuration
3. Duress PIN functionality
4. Emergency contact and emergency budget configuration
5. Duress session and fraud alert management
6. Fraud case investigation and analyst reporting
7. Fraud manager review and case resolution

## API

The ASP.NET Core backend provides REST API endpoints used by the mobile application and fraud management dashboard.

The API supports functions including:

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
- Case claiming and assignment
- Case status updates
- Analyst report submission
- Manager review
- Account freezing
- Notification dispatch

Protected endpoints use JWT authentication and role-based authorisation where required.

## Testing Evidence

Sprint 7–6 testing evidence is stored in the project documentation.

The evidence includes:

- Automated test execution
- Final passing test results
- Code coverage results
- Bug-fix commit evidence
- GitHub pull request evidence
- API controller evidence

## Running the Complete System Locally

The backend, dashboard and mobile application should be run in separate terminals.

### Terminal 1 – Backend

From the repository root:

```powershell
dotnet run --project .\SecureEscape.Api\SecureEscape.Api.csproj
```

### Terminal 2 – Web Dashboard

From the repository root:

```powershell
cd SecureEscapeDash
npm install
npm run dev
```

### Terminal 3 – Mobile Application

From the repository root:

```powershell
cd secure-escape-mobile
npm install
npm start
```

Make sure the MySQL database is reachable and that the dashboard and mobile application are configured to use the correct backend API address.

## Sprint 7–6 MVP

This repository contains the Secure Escape Sprint 7–6 MVP submission.

The submission includes the working application source code, backend API, database integration, Entity Framework Core migrations, seed data, automated tests, test results, code coverage evidence, bug-fixing evidence, regression testing and GitHub version-control evidence.



