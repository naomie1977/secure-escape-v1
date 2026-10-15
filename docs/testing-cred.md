# Secure Escape Testing Credentials

This document contains the default testing credentials for the Secure Escape mobile application and fraud dashboard.

---

# Mobile Banking Users

**Default Password:** `Password@123`

| Customer       | Bank               | Email    | Password | Normal PIN | Duress PIN |
|----------------|--------------------|-------   |----------|------------|------------|
| Thabo Nkosi    | Zenith Bank Africa | thabo.nkosi@email.co.za    | Password@123 | 1234 | 9999 |
| Amara Dlamini  | Zenith Bank Africa | amara.dlamini@email.co.za  | Password@123 | 2222 | 8888 |
| Lerato Mokoena | Zenith Bank Africa | lerato.mokoena@email.co.za | Password@123 | 3333 | 7777 |
| Sipho Zulu     | Savanna Bank       | sipho.zulu@email.co.za     | Password@123 | 4444 | 6666 |
| Naledi Khumalo | Savanna Bank       | naledi.khumalo@email.co.za | Password@123 | 5555 | 0000 |

---

# New Test Users (Standard, Student, and High-Net-Worth)

### Standard Accounts (Decent Balances)
| Name | Email | Password |
|------|-------|----------|
| Tebogo Moremi | tebogo.moremi@email.co.za | 1001 |
| Khanyisile Sithole | khanyisile.sithole@email.co.za | 1002 |
| Jabulani Dlamini | jabulani.dlamini@email.co.za | 1003 |
| Lerato Khanyile | lerato.khanyile@email.co.za | 1004 |
| Simphiwe Buthelezi | simphiwe.buthelezi@email.co.za | 1005 |
| Boitumelo Phiri | boitumelo.phiri@email.co.za | 1006 |
| Nhlanhla Mabena | nhlanhla.mabena@email.co.za | 1007 |
| Dineo Motsepe | dineo.motsepe@email.co.za | 1008 |
| Katlego Chauke | katlego.chauke@email.co.za | 1009 |
| Sinenhlanhla Zulu | sinenhlanhla.zulu@email.co.za | 1010 |

### Student Accounts (R2k - R4k Balances)
| Name | Email | Password |
|------|-------|----------|
| Thato Moloi | thato.moloi@email.co.za | 1011 |
| Lesego Tau | lesego.tau@email.co.za | 1012 |
| Ntando Gumede | ntando.gumede@email.co.za | 1013 |
| Kagiso Matlala | kagiso.matlala@email.co.za | 1014 |
| Anele Mtshali | anele.mtshali@email.co.za | 1015 |

### Extremely Rich Accounts (R5,000,000+ for Realistic Decoy)
| Name | Email | Password |
|------|-------|----------|
| Patrice Radebe | patrice.radebe@email.co.za | 2001 |
| Khulubuse Mthembu | khulubuse.mthembu@email.co.za | 2002 |
| Bridgette Mabandla | bridgette.mabandla@email.co.za | 2003 |
| Johann Van Der Merwe | johann.vandermerwe@email.co.za | 2004 |
| Nonkululeko Nyembezi | nonkululeko.nyembezi@email.co.za | 2005 |
| Tokyo Sexwale | tokyo.sexwale@email.co.za | 2006 |
| Phuthuma Nhleko | phuthuma.nhleko@email.co.za | 2007 |
| Wendy Luhabe | wendy.luhabe@email.co.za | 2008 |
| Sipho Pityana | sipho.pityana@email.co.za | 2009 |
| Irene Charnley | irene.charnley@email.co.za | 2010 |

---

# Fraud Dashboard Administrators

**Default Password:** `Admin@123`

| Name | Organisation | Role | Email | Password |
|------|--------------|------|-------|----------|
| Naledi Vilakazi | Secure Escape | Secure Escape Administrator | admin@secureescape.co.za | Admin@123 |
| Sipho Mahlangu | Zenith Bank Africa | Fraud Analyst | sipho.mahlangu@zenithbank.co.za | Admin@123 |
| Lindiwe Khoza | Zenith Bank Africa | System Administrator | lindiwe.khoza@zenithbank.co.za | Admin@123 |
| Kagiso Moyo | Zenith Bank Africa | Fraud Manager | kagiso.moyo@zenithbank.co.za | Admin@123 |
| Mpho Sithole | Savanna Bank | Fraud Manager | mpho.sithole@savannabank.co.za | Admin@123 |
| Zanele Dube | Savanna Bank | Fraud Analyst | zanele.dube@savannabank.co.za | Admin@123 |

---

# Test Scenarios

## Standard Login

**User**

- Email: `thabo.nkosi@email.co.za`
- Password: `Password@123`
- PIN: `1234`

**Expected Result**

- User logs in successfully.
- Banking dashboard loads normally.
- No fraud alert is created.

---

## Duress Login

**User**

- Email: `thabo.nkosi@email.co.za`
- Password: `Password@123`
- PIN: `9999`

**Expected Result**

- User is authenticated successfully.
- Duress mode is activated.
- A high-priority fraud alert is generated.
- Transactions performed during the session are monitored.
- The alert appears in the Fraud Dashboard.

---

## Bank Administrator Access

**Login**

- Email: `sipho.mahlangu@zenithbank.co.za`
- Password: `Admin@123`

**Expected Result**

- Access is restricted to Zenith Bank Africa.
- Only Zenith Bank customers, alerts, sessions, and transactions are visible.
- No data from Savanna Bank is accessible.

---

## Secure Escape Administrator Access

**Login**

- Email: `admin@secureescape.co.za`
- Password: `Admin@123`

**Expected Result**

- Access to all participating banks.
- View all fraud alerts.
- View all customers.
- View all audit logs.
- Manage bank integrations and platform administration.

EvidencePanel.tsx
CaseManagement.tsx
Timeline.tsx
Finally, the new SessionDetail.tsx