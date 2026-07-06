Markdown
# RentFlow 🏢

A premium, minimalist property management platform designed for streamlined tenancy tracking, digital landlord-tenant interactions, and automated billing workflows. Built with a sleek, clean "SaaS-style" aesthetic inspired by design standards like Stripe and Notion, the application focuses on high-fidelity user experiences and professional interface layouts.

---

## 📖 Product Overview

RentFlow simplifies the operational friction of managing property records, tenancy timelines, and balances through modern cloud infrastructure. It replaces fragmented tracking tracking tools with a unified dashboard asset command hub.

### Core Capabilities
* **Tenancy & Billing Automation:** Streamlines ongoing record-keeping, tenancy records, and automated billing tracking within a centralized dashboard interface.
* **Premium UX/UI Layout:** Features a highly polished, minimalist frontend interface tailored for professional workspace management and clean aesthetics.
* **WhatsApp Telemetry Bridge:** Includes a built-in communication bridge optimized for mobile viewports to dispatch direct workspace updates and coordinate seamlessly with tenants.

---

## 🛠️ Technical Architecture

The platform runs on a modern, decoupled client-to-cloud serverless data pattern designed for performance, rapid deployment, and absolute data privacy.

* **Frontend Engine:** Semantic HTML5 compiled with responsive Tailwind CSS variables.
* **Client Runtime:** Native asynchronous JavaScript (ES6+ Modules) utilizing client-side fetch processing.
* **Backend BaaS:** Powered by a Supabase PostgreSQL instance managing relational mapping pipelines and database architecture.
* **Hosting Platform:** Configured for seamless serverless hosting and deployment on Vercel.

### Security & Schema Isolation
To guarantee complete isolation between different landlord accounts, RentFlow utilizes a dual-layer security perimeter:
1. **Schema Isolation:** The architecture shifts core operational data from the public schema into private database structures using PostgreSQL schema isolation to maintain absolute structural privacy.
2. **Row-Level Security (RLS):** Implements robust Supabase RLS configurations to ensure authenticated users can only interact with their own assigned records.

---

## 📂 Project Structure

```text
rentflow/
├── public/
│   └── index.html          # Main single-page application layout & UI shells
├── js/
│   ├── main.js             # Application state coordinator & event router
│   ├── ui.js               # UI engine & DOM template rendering
│   ├── db.js               # Abstracted Supabase database client interface
│   └── config.example.js   # Template for local environment credentials
├── README.md               # Project documentation blueprint
└── .gitignore              # Safeguards environment files and system dependencies
🗄️ Relational Database Schema
The backend relational topology relies on specific core parameters within the isolated schema to safely map assets, lease lifecycles, and tenant entities.

Core Relational Properties
landlord_id: A secure unique identifier binding property records strictly to the authenticated owner account.

tenant_name: The verified full legal identity string of the current resident occupying a specific unit.

tenant_phone: The direct contact mobile string used to format and route WhatsApp telemetry updates.

🚀 Getting Started & Local Deployment
Follow these steps to initialize the application and configure your local development environment.

Prerequisites
A modern web browser with native ES6 module parsing support.

A live Supabase Cloud Instance with an initialized PostgreSQL database.

1. Database Initialization
Execute the following script inside your Supabase SQL Editor to establish your isolated schema structures and apply security boundaries:

SQL
-- 1. Create the core properties table
CREATE TABLE private.properties_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    property_name TEXT NOT NULL,
    unit_number TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    tenant_phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row-Level Security (RLS)
ALTER TABLE private.properties_units ENABLE ROW LEVEL SECURITY;

-- 3. Enforce data isolation boundaries
CREATE POLICY "Users can only access their own property records" 
    ON private.properties_units 
    FOR ALL 
    USING (auth.uid() = landlord_id);
2. Environment Configuration
Navigate to the js/ directory.

Duplicate the environment template:

Bash
cp js/config.example.js js/config.js
Populate js/config.js with your active Supabase project credentials:

JavaScript
export const SUPABASE_CONFIG = {
    url: "[https://your-project-id.supabase.co](https://your-project-id.supabase.co)",
    anonKey: "your-public-anon-key"
};
(Note: js/config.js is automatically excluded by the .gitignore rules to prevent credential exposure.)

3. Launching the Local Server
Because this project utilizes native JavaScript ES6 modules, opening the files directly from your hard drive (file:///) will trigger browser CORS security blocks. Launch a local development server instead:

Bash
# Using Python
python -m http.server 8080

# Using Node.js (npx)
npx serve .
Once initialized, navigate to http://localhost:8080 in your browser to view the workspace.
