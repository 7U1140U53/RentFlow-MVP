# Product Requirements Document (PRD)

## Project Name: RentFlow MVP (Nigerian Context Localization)
**Document Version:** 1.0  
**Date:** May 2026  
**Author:** Lead Product Manager (You)  
**Status:** Approved for Core Development  

---

## 1. Executive Summary & Market Context

### 1.1 Product Vision
RentFlow is a mobile-first, multi-unit property management system designed specifically for independent Nigerian landlords managing tenement buildings ("face-me-face-you"), blocks of flats, or shared commercial market shops. The goal is to digitize and automate localized rent tracking, multi-year leasing models, and utility bill tracking.

### 1.2 The Problem Statement (Nigerian Market Context)
Nigerian independent real estate management faces systemic inefficiencies that standard global software packages do not solve:
* **The Annual Upfront Payment Model:** Unlike Western models built on recurring automatic monthly credit card charges, Nigerian tenancies rely on bulk payments (1-year or 2-year advance payments), followed by irregular incremental payments for service charges.
* **Bank Transfer Reconciliations:** Over 85% of rent is paid via manual bank transfers (USSD or Mobile Apps). Landlords receive messy SMS alerts without clear tenant names or unit numbers, leading to tedious manual entry errors.
* **Service Charge & Utility Disputes:** Landlords and tenants constantly clash over additional maintenance levies, NEPA/IKEDC/AEDC prepaid meter reloads, security fees, and waste management (LAWMA or PSP) costs which are tracked separately on paper.

### 1.3 Strategic Objectives
* **Portfolio Visibility:** Empower landlords to manage multiple units across different geographic locations (e.g., a block of 4 flats in Yaba and a shop array in Ikeja) from one single view.
* **Financial Accuracy:** Achieve an accurate ledger tracking historical lump sums alongside running cash debts.
* **Zero-Server MVP Blueprint:** Deploy a fully authenticated system utilizing a secure frontend architecture integrated directly with Supabase API hooks.

---

## 2. User Personas & Target Audience

### 2.1 Primary Persona: The Multi-Unit Landlord (Alhaji Segun)
* **Demographics:** Owns a residential building consisting of 6 self-contained apartments and 4 shops. Relies heavily on WhatsApp and bank notification SMS alerts.
* **Behavioral Patterns:** Collects rent annually, but collects electricity and security levies monthly. Manages tenants via face-to-face friction or endless phone calls.
* **Core Pain Points:** Forgets when a tenant’s 1-year upfront rent has expired; loses track of who contributed to the diesel generator purchase versus who is owing.
* **System Goals:** A straightforward dashboard showing an active countdown of days remaining on an annual lease, with quick toggle options to record Naira bank transfers.

---

## 3. Product Architecture & Scope Boundaries

### 3.1 Architectural Ecosystem
RentFlow operates as a responsive Single Page Application (SPA):
* **Frontend UI Framework:** Structured HTML5 semantic markup, dynamically styled using Tailwind CSS CDN variables.
* **Client Interface Script:** Native JavaScript (ES6 modules) utilizing fetch API pipelines to communicate with backend structures.
* **Database & Security Layer:** Supabase Platform (PostgreSQL engine) running strict Row Level Security (RLS) to keep landlord portfolios private from other landlords.

### 3.2 MVP Scope Boundaries

| In-Scope (MVP Phase) | Out-of-Scope (Future Engineering) |
| :--- | :--- |
| Registration of properties, units, and active tenants. | Live automated bank transfer checking (Monnify or Flutterwave integration). |
| Dynamic tracking of **Annual Upfront Rent** with expiry countdown alerts. | Automated legal notice generation (Form E / Quit Notices). |
| Multi-category payment tracking (Rent, NEPA/Electricity, Caution, Security). | Tenant dashboard login portals. |
| Browser-based spreadsheet export mechanisms. | OCR automated SMS receipt scanning algorithms. |

---

## 4. Functional Specifications

### 4.1 Module 1: Secure Session Management (AUTH)
* **AUTH-001:** Provide user registration and session gateway interfaces out of the box.
* **AUTH-002:** Enforce password complexity criteria requiring a minimum of 6 characters with an alphanumeric blend.
* **AUTH-003:** Secure user sessions via Supabase identity tokens; automatically route unauthenticated browser actions back to the authentication viewport.

### 4.2 Module 2: Multi-Unit Portfolio Asset Registration (ASSET)
* **ASSET-001:** Allow landlords to add distinct Properties (e.g., "Yaba Block of 6 Flats") and spawn individual sub-units within them (e.g., "Flat 1", "Flat 2").
* **ASSET-002:** The unit entry form must collect the following validated properties:
  * Property Location Name (Text string)
  * Unit Designation Number or Name (Text string)
  * Current Tenant Full Name (Text string)
  * Active Phone Number (Valid Nigerian phone syntax: +234 or 080...)
  * Fixed Annual Rent Value (Currency integer in Nigerian Naira)
  * Lease Activation Commencing Date (Calendar Picker)

### 4.3 Module 3: Localized Ledger & Expiry Tracker (LEDGER)
* **LEDGER-001:** The dashboard home interface must compute and render an explicit countdown showing **"Days Remaining on Lease"** for every individual unit based on the original payment date.
* **LEDGER-002:** Color-code indicators dynamically using CSS conditional injections:
  * Active lease (greater than 60 days left): **Green badge**
  * Approaching expiry (less than 60 days left): **Yellow alert status**
  * Expired lease (less than or equal to 0 days left): **Red alert flash**
* **LEDGER-003:** Include a Payment Entry Form allowing landlords to select a specific unit from a dropdown and input:
  * Payment Classification Category (Dropdown options: `Rent Upfront`, `Electricity/NEPA`, `Security Fee`, `Water/Waste Levy`).
  * Amount Paid (Naira value).
  * Bank Name used for the transfer (Text helper string to ease transaction statement verification).
* **LEDGER-004:** Implement a clear historical ledger sorting transactions in reverse chronological order, with absolute deletion functionality backed up by a modal warning check.

---

## 5. System Non-Functional Requirements (NFR)

### 5.1 Usability & Mobile Optimization
* **Mobile-First UX Constraints:** Since Nigerian landlords manage operations on the move, navigation elements, forms, and data tables must render cleanly on mobile viewports (minimum width 360px) without horizontal scroll breaking.
* **Data Payload Efficiency:** Page optimization must keep the initial load bundle minimal to guarantee reliable execution over unstable mobile network regions.

---

## 6. Relational Database Schema Architecture

To structure the Supabase backend efficiently, the schema uses two relational database tables linked via a Foreign Key relation:

### Table 1: `properties_units` (The Asset Catalog)
| Column Name | Data Type | Modifiers / Relations | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default: `gen_random_uuid()` | Unique identifier for the asset |
| `landlord_id` | UUID | Foreign Key linking to `auth.users.id` | Connects asset data to logged-in user |
| `property_name`| TEXT | `NOT NULL` | E.g., "Surulere Residential Complex" |
| `unit_number`  | TEXT | `NOT NULL` | E.g., "Flat 3A" |
| `tenant_name`  | TEXT | `NOT NULL` | E.g., "Chidi Okafor" |
| `tenant_phone` | TEXT | `NOT NULL` | Contact number for records |
| `annual_rent`  | NUMERIC | `NOT NULL`, Check value greater than 0 | Baseline yearly lease amount |
| `lease_start`  | DATE | `NOT NULL` | Calendar start point of payment |
| `created_at`   | TIMESTAMPTZ| `DEFAULT now()` | Record logging tracking stamp |

### Table 2: `financial_ledger` (The Transaction Stream)
| Column Name | Data Type | Modifiers / Relations | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Unique transaction record tag |
| `unit_id` | UUID | Foreign Key linking to `properties_units.id` with cascade deletion | Links entry directly to specific room |
| `payment_type` | TEXT | `NOT NULL` | Options: Rent, Electricity, Security, Waste |
| `amount_paid`  | NUMERIC | `NOT NULL`, Check value greater than 0 | Total sum documented |
| `bank_reference`| TEXT | `NULLABLE` | E.g., "GTBank Mobile Transfer" |
| `payment_date` | DATE | `NOT NULL` | Date the alert transaction dropped |
| `created_at`   | TIMESTAMPTZ| `DEFAULT now()` | Audit track timeline marker |