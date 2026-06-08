// RENTFLOW CORE ENGINE ORCHESTRATOR
const SUPABASE_URL = "https://hylzqoaymdwmureerflp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_rjSJEJ3vRFdplomuyOrpuA_ouSv-86K";

const supabaseClient = bootstrapSupabaseInstance();
let activeUserSession = null;
let appLocalCache = [];
let targetActiveLedgerCache = null;

function bootstrapSupabaseInstance() {
    try {
        return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (err) {
        console.error("System pipeline failed initialization components:", err);
        alert("System Architecture Error: Verification Keys Empty.");
    }
}

// --- GLOBAL EXPOSURE LAYER FOR INTER-SCRIPT COMMUNICATION ---
window.openManageModal = async function (assetId) {
    const record = appLocalCache.find(r => r.id === assetId);
    if (!record) return;

    targetActiveLedgerCache = record.finance;

    document.getElementById("editAssetId").value = record.id;
    document.getElementById("editTenantName").value = record.tenant_name;
    document.getElementById("editTenantPhone").value = record.tenant_phone || "";

    // 🟢 FIXED: Explicitly force numeric values to prevent string method formatting crashes
    const totalRentValue = Number(record.annual_rent) || 0;
    const amountPaidValue = Number(targetActiveLedgerCache?.amount_paid) || 0;
    const balanceDueValue = targetActiveLedgerCache ? (Number(targetActiveLedgerCache.balance_due) ?? totalRentValue) : totalRentValue;

    // Populate current financial states formatting safely to local currency standard conventions
    document.getElementById("modalTotalRent").textContent = `₦${totalRentValue.toLocaleString()}`;
    document.getElementById("modalAmountPaid").textContent = `₦${amountPaidValue.toLocaleString()}`;
    document.getElementById("modalBalanceDue").textContent = `₦${balanceDueValue.toLocaleString()}`;

    document.getElementById("logPaymentAmount").value = "";
    document.getElementById("manageAssetModal").classList.remove("hidden");
};

// --- 1. MASTER AUTHENTICATION LISTENER ENGINE ---
supabaseClient.auth.onAuthStateChange((event, session) => {
    const loadingScreen = document.getElementById("appLoadingScreen");
    const authScreen = document.getElementById("authScreen");
    const appShell = document.getElementById("appShell");

    if (session) {
        activeUserSession = session.user;
        document.getElementById("userProfileEmail").textContent = activeUserSession.email;

        // Strip access gates, invoke data collection engine sync
        authScreen.classList.add("hidden");
        appShell.classList.remove("hidden");
        synchronizeSystemDatabaseData().then(() => {
            if (loadingScreen) loadingScreen.classList.add("opacity-0");
            setTimeout(() => loadingScreen?.classList.add("hidden"), 300);
        });
    } else {
        activeUserSession = null;
        appShell.classList.add("hidden");
        authScreen.classList.remove("hidden");
        if (loadingScreen) loadingScreen.classList.add("hidden");
    }
});

// --- 2. TAB CONTROLLER LAYOUT SWITCH ROUTINES ---
document.querySelectorAll(".nav-link").forEach(navButton => {
    navButton.addEventListener("click", () => {
        // Toggle Sidebar Nav Highlights Visually
        document.querySelectorAll(".nav-link").forEach(btn => {
            btn.classList.remove("bg-emerald-600/10", "text-emerald-400", "border", "border-emerald-500/20");
            btn.classList.add("text-slate-400");
        });
        navButton.classList.add("bg-emerald-600/10", "text-emerald-400", "border", "border-emerald-500/20");

        // Toggle Visibility Pane Blocks
        const targetViewId = navButton.getAttribute("data-target");
        document.querySelectorAll(".view-pane").forEach(pane => pane.classList.add("hidden"));

        const activePane = document.getElementById(targetViewId);
        if (activePane) activePane.classList.remove("hidden");
    });
});

// --- 3. ACCESS CONTROLLER SIGN-IN / SIGN-UP SUBSYSTEM ---
document.getElementById("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;
    const submitBtn = document.getElementById("authSubmitBtn");
    const isSignUpMode = submitBtn.textContent.includes("Register");

    submitBtn.disabled = true;
    submitBtn.textContent = "Processing Transaction...";

    try {
        if (isSignUpMode) {
            const { error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;
            alert("Registration successful! Check your inbox for confirmation updates.");
        } else {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
        }
    } catch (err) {
        alert(`Authentication Interrupted: ${err.message}`);
        submitBtn.disabled = false;
        submitBtn.textContent = isSignUpMode ? "Register New Account" : "Access Dashboard";
    }
});

document.getElementById("toggleAuthMode").addEventListener("click", () => {
    const submitBtn = document.getElementById("authSubmitBtn");
    const modeLink = document.getElementById("toggleAuthMode");
    const subTitle = document.getElementById("authSubtitle");

    if (submitBtn.textContent.includes("Access")) {
        submitBtn.textContent = "Register New Account";
        modeLink.textContent = "Already have an account? Sign in instead";
        subTitle.textContent = "Create your secure asset management portal";
    } else {
        submitBtn.textContent = "Access Dashboard";
        modeLink.textContent = "Don't have an account? Sign up here";
        subTitle.textContent = "Rent & Lease Tracking Dashboard";
    }
});

const executeSignOutSequence = async () => {
    if (confirm("Confirm security termination session?")) {
        await supabaseClient.auth.signOut();
        window.location.reload();
    }
};
document.getElementById("signOutBtn").addEventListener("click", executeSignOutSequence);
document.getElementById("settingsSignOutBtn").addEventListener("click", executeSignOutSequence);

// --- 4. DATA SYNCHRONIZER METRIC COMPILATION ROUTINE ---
async function synchronizeSystemDatabaseData() {
    if (!activeUserSession) return;

    try {
        // Collect asset entries protected via Row-Level Security parameters
        const { data: tenancies, error: tenantErr } = await supabaseClient
            .from("tenancies")
            .select("*")
            .eq("user_id", activeUserSession.id);

        if (tenantErr) throw tenantErr;

        const { data: invoices, error: invoiceErr } = await supabaseClient
            .from("invoices")
            .select("*")
            .eq("user_id", activeUserSession.id);

        if (invoiceErr) throw invoiceErr;

        // Perform programmatic sub-ledger cache pairing
        appLocalCache = tenancies.map(t => {
            // Linked using your correct database schema property
            const linkedInvoice = invoices.find(inv => inv.tenancy_id === t.id) || null;
            return { ...t, finance: linkedInvoice };
        });

        // Share cache with the global window context for presentation handlers (ui.js)
        window.appLocalCache = appLocalCache;

        // Safe execution checks to verify handlers are present inside ui.js before dispatching
        if (typeof window.calculateAndDisplayGlobalMetrics === "function") window.calculateAndDisplayGlobalMetrics(appLocalCache);
        if (typeof window.renderTenantGrid === "function") window.renderTenantGrid(appLocalCache);
        if (typeof window.renderPaymentsLedgerView === "function") window.renderPaymentsLedgerView(appLocalCache);
        if (typeof window.renderLeasesTrackerView === "function") window.renderLeasesTrackerView(appLocalCache);

    } catch (err) {
        console.error("Database compilation sync sequence failed:", err);
    }
}

// 🟢 CRITICAL ALIAS BRIDGE: This maps both function names together.
// This ensures your onboarding wizard, edit modal, and delete actions can ALL successfully trigger a dashboard refresh!
window.synchronizeSystemDatabaseData = synchronizeSystemDatabaseData;
window.loadDashboardData = synchronizeSystemDatabaseData;

// --- 5. ONBOARDING TRANSACTION DISPATCHER ---
document.getElementById("wizardForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeUserSession) return;

    const startDateVal = document.getElementById("wStartDate").value;
    if (!startDateVal) {
        alert("Please select a Lease Start Date.");
        return;
    }

    // 🟢 AUTOMATIC CALCULATION: Takes the start date and adds exactly 1 year
    const startDateObj = new Date(startDateVal);
    startDateObj.setFullYear(startDateObj.getFullYear() + 1);
    const calculatedEndDate = startDateObj.toISOString().split('T')[0];

    const newTenancyPayload = {
        user_id: activeUserSession.id,
        tenant_name: document.getElementById("wTenantName").value,
        tenant_phone: document.getElementById("wTenantPhone").value,
        property_name: document.getElementById("wPropertyName").value,
        unit_number: document.getElementById("wUnitNumber").value,
        annual_rent: parseFloat(document.getElementById("wAnnualRent").value) || 0,
        lease_start_date: startDateVal,
        lease_end_date: calculatedEndDate // 🟢 Sent automatically to your Supabase column
    };

    try {
        // Step 1: Insert into the tenancies table
        const { data: tenantRecord, error: tErr } = await supabaseClient
            .from("tenancies")
            .insert([newTenancyPayload])
            .select()
            .single();

        if (tErr) throw tErr;

        // Step 2: Build the invoice record using matching schema keys
        const invoicePayload = {
            user_id: activeUserSession.id,
            tenancy_id: tenantRecord.id,
            total_amount: tenantRecord.annual_rent, // 🟢 Matches your 'total_amount' database column
            amount_paid: 0,
            balance_due: tenantRecord.annual_rent,
            status: "Unpaid"
        };

        const { error: iErr } = await supabaseClient
            .from("invoices")
            .insert([invoicePayload]);

        if (iErr) throw iErr;

        alert("Tenant onboarded and payment ledger initialized successfully!");

        // Form reset and UI closure now execute smoothly without halting
        document.getElementById("wizardForm").reset();
        document.getElementById("onboardingWizardModal").classList.add("hidden");

        if (typeof window.loadDashboardData === "function") {
            window.loadDashboardData();
        }

    } catch (err) {
        alert(`Pipeline Execution Halted: ${err.message}`);
        console.error("Onboarding error detailed log:", err);
    }
});

// --- 6. MANAGEMENT UPDATES & LEDGER TRANSACTION LOGGING ---
document.getElementById("manageAssetForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. Extract values exactly matching your HTML input IDs
    const tenancyId = document.getElementById("editAssetId").value;
    const incomingPayment = parseFloat(document.getElementById("logPaymentAmount").value) || 0;
    const updatedName = document.getElementById("editTenantName").value;
    const updatedPhone = document.getElementById("editTenantPhone").value;

    try {
        // STEP A: Update profile metrics directly inside your 'tenancies' table
        const { error: tenancyTableErr } = await supabaseClient
            .from("tenancies")
            .update({
                tenant_name: updatedName,
                tenant_phone: updatedPhone
            })
            .eq("id", tenancyId);

        if (tenancyTableErr) throw tenancyTableErr;

        // STEP B: Fetch the financial statement balance row from 'invoices' table
        const { data: invoice, error: fetchErr } = await supabaseClient
            .from("invoices")
            .select("*")
            .eq("tenancy_id", tenancyId)
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!invoice) throw new Error("No linked bill tracking statement found for this asset.");

        // STEP C: Run safe calculation modules
        const currentPaid = parseFloat(invoice.amount_paid) || 0;
        const totalRentBill = parseFloat(invoice.total_amount) || 0;

        const updatedPaid = currentPaid + incomingPayment;
        const updatedBalance = Math.max(0, totalRentBill - updatedPaid);

        let updatedStatus = "Unpaid";
        if (updatedPaid > 0 && updatedBalance > 0) {
            updatedStatus = "Partially Paid";
        } else if (updatedPaid > 0 && updatedBalance === 0) {
            updatedStatus = "Fully Paid";
        }

        // STEP D: Update financial transaction logging rows inside 'invoices' table
        const { error: updateErr } = await supabaseClient
            .from("invoices")
            .update({
                amount_paid: updatedPaid,
                balance_due: updatedBalance,
                status: updatedStatus
            })
            .eq("id", invoice.id);

        if (updateErr) throw updateErr;

        // Visual confirmation and UI drawer cleanup
        alert("Tenant profiles and ledger records successfully synchronized!");
        document.getElementById("manageAssetModal").classList.add("hidden");
        document.getElementById("manageAssetForm").reset();

        // Immediately trigger dashboard database synchronizer to reflect changes
        if (typeof synchronizeSystemDatabaseData === "function") {
            await synchronizeSystemDatabaseData();
        }

    } catch (err) {
        alert(`Error modifying record engine files: ${err.message}`);
        console.error("Form transmission crash report details:", err);
    }
});

// --- 7. AUTOMATED WHATSAPP OUTREACH DISPATCH SYSTEM ---
document.getElementById("whatsappReminderBtn").addEventListener("click", () => {
    const tenantName = document.getElementById("editTenantName").value;
    let rawPhone = document.getElementById("editTenantPhone").value;
    const totalRentStr = document.getElementById("modalTotalRent").textContent;
    const balanceStr = document.getElementById("modalBalanceDue").textContent;
    const balanceNum = parseFloat(balanceStr.replace(/[₦,]/g, '')) || 0;

    if (!rawPhone) {
        alert("Action Cancelled: No registered communication path details string found.");
        return;
    }

    // Standardize regional formatting patterns (Defaulting to Nigeria international +234 structures)
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '234' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('234') && cleanPhone.length === 10) {
        cleanPhone = '234' + cleanPhone;
    }

    let baselineMessageText = "";
    if (balanceNum > 0) {
        baselineMessageText = `Hello ${tenantName}, this is a friendly update from management regarding your lease ledger tracking metrics. Our sub-ledger currently reflects an outstanding remaining balance due of ${balanceStr} against your total annual rent of ${totalRentStr}. Kindly check with management workflows to clear tracking states. Thank you!`;
    } else {
        baselineMessageText = `Hello ${tenantName}, this is a quick acknowledgement confirmation line from management tracking. Your annual rent registry of ${totalRentStr} is fully paid and settled in our ledger database fields. Thank you for your promptness!`;
    }

    const compiledDeepLinkUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(baselineMessageText)}`;
    window.open(compiledDeepLinkUrl, '_blank');
});

// --- 8. DISMISSAL CLICK MAPPINGS ---
document.querySelectorAll(".closeModalBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.getElementById("onboardingWizardModal").classList.add("hidden");
        document.getElementById("manageAssetModal").classList.add("hidden");
    });
});

document.getElementById("openWizardBtn").addEventListener("click", () => {
    document.getElementById("onboardingWizardModal").classList.remove("hidden");
});

// Toggle password visibility on the login/signup screen
document.getElementById("togglePasswordVisibility").addEventListener("click", function () {
    const passwordInput = document.getElementById("authPassword");
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        this.textContent = "Hide";
    } else {
        passwordInput.type = "password";
        this.textContent = "Show";
    }
});

// Expose the Asset Manager Modal opener to the global scope
window.openManageModal = async function (tenantId) {
    console.log("Targeting Asset Management for ID:", tenantId);

    const modal = document.getElementById("manageAssetModal");
    if (!modal) {
        alert("System Error: HTML element 'manageAssetModal' could not be located.");
        return;
    }

    // 1. Reveal the asset manager overlay screen
    modal.classList.remove("hidden");

    // 2. Lock the target ID into the hidden tracking form input
    document.getElementById("editAssetId").value = tenantId;

    try {
        // 3. Query Supabase directly to get fresh, real-time data for this single tenant
        const { data: tenant, error } = await supabaseClient
            .from("tenancies")
            .select(`
                *,
                invoices(*)
            `)
            .eq("id", tenantId)
            .single();

        if (error) throw error;

        // 4. Populate profile input text boxes with current cloud records
        document.getElementById("editTenantName").value = tenant.tenant_name || "";
        document.getElementById("editTenantPhone").value = tenant.tenant_phone || "";

        // 5. Safely pull invoice records if they exist, or default to zero balance
        const activeInvoice = tenant.invoices && tenant.invoices.length > 0 ? tenant.invoices[0] : null;

        if (activeInvoice) {
            document.getElementById("modalTotalRent").innerText = `₦${parseFloat(activeInvoice.total_rent).toLocaleString()}`;
            document.getElementById("modalAmountPaid").innerText = `₦${parseFloat(activeInvoice.amount_paid).toLocaleString()}`;
            document.getElementById("modalBalanceDue").innerText = `₦${parseFloat(activeInvoice.balance_due).toLocaleString()}`;
        } else {
            // Fallback default state if an invoice ledger hasn't generated yet
            document.getElementById("modalTotalRent").innerText = `₦${parseFloat(tenant.annual_rent || 0).toLocaleString()}`;
            document.getElementById("modalAmountPaid").innerText = "₦0";
            document.getElementById("modalBalanceDue").innerText = `₦${parseFloat(tenant.annual_rent || 0).toLocaleString()}`;
        }

    } catch (err) {
        console.warn("Real-time data lookup failed, falling back to empty fields:", err.message);
    }
};

// Attach event listeners to close buttons inside the Manage Asset Modal
document.querySelectorAll("#manageAssetModal .closeModalBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        const modal = document.getElementById("manageAssetModal");
        if (modal) {
            modal.classList.add("hidden");
            document.getElementById("manageAssetForm").reset(); // Clear input strings safely
        }
    });
});

// --- GLOBAL WHATSAPP DISPATCH SAFEGUARD ENGINE ---
window.triggerDirectWhatsAppMessage = function (tenantId) {
    // 🟢 FIXED: Removed 'window.' prefix to match your local cache scope perfectly
    const tenant = typeof appLocalCache !== "undefined" ? appLocalCache.find(t => t.id === tenantId) : null;

    if (!tenant) {
        alert("Action Aborted: Tenant profile files are currently unavailable. Please refresh your workspace page.");
        return;
    }

    const phoneNumber = tenant.tenant_phone;
    const clientName = tenant.tenant_name || "Tenant";

    // Calculate remaining balance dynamically for the text notification
    const totalRent = Number(tenant.annual_rent) || 0;
    const remainingBalance = tenant.finance ? (Number(tenant.finance.balance_due) || 0) : totalRent;

    // 2. CRITICAL SAFEGUARD: Catch explicit NULL strings, blank inputs, or undefined fields safely
    if (!phoneNumber || phoneNumber === "NULL" || phoneNumber === "undefined" || phoneNumber.trim() === "") {
        alert(`Action Paused: ${clientName} does not have a contact phone number registered in the file directory. Select 'Manage Asset' to input their number first!`);
        return;
    }

    // 3. Clear out stray symbols or spaces, keeping international phone digits intact
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

    // 🟢 UPGRADED: The message now includes their actual custom balance metric
    const chatTemplate = encodeURIComponent(`Hello ${clientName}, this is a quick update from management regarding your account statement. The remaining outstanding balance is ₦${remainingBalance.toLocaleString()}. Please let us know if payments have been processed!`);

    // 4. Open the message room window frame cleanly
    window.open(`https://wa.me/${cleanPhone}?text=${chatTemplate}`, '_blank');
};

// --- 6. CRITICAL PROFILE DELETION ENGINE ---
document.getElementById("deleteTenantRecordBtn").addEventListener("click", async () => {
    // 1. Extract the active tenant unique ID currently loaded into your edit form
    const currentTenantId = document.getElementById("editAssetId").value;

    if (!currentTenantId) {
        alert("Action Paused: Could not resolve a valid tenant tracking reference code.");
        return;
    }

    // 2. Add a verification barrier so users don't accidentally wipe data
    const doubleCheckConfirmation = confirm("🚨 WARNING: Are you sure you want to permanently erase this tenant profile and all associated payment ledger tracking history? This action cannot be undone.");
    if (!doubleCheckConfirmation) return;

    try {
        // 🟢 Step A FIXED: Removed .select("*") so it deletes parent relation child rows seamlessly
        const { error: invoiceWipeErr } = await supabaseClient
            .from("invoices")
            .delete()
            .eq("tenancy_id", currentTenantId);

        if (invoiceWipeErr) throw invoiceWipeErr;

        // Step B: Now safely delete the parent record out of the tenancies table
        const { error: tenantWipeErr } = await supabaseClient
            .from("tenancies")
            .delete()
            .eq("id", currentTenantId);

        if (tenantWipeErr) throw tenantWipeErr;

        alert("Profile records and associated balance statement sheets permanently purged.");

        // 3. Close the active drawer window UI
        document.getElementById("manageAssetModal").classList.add("hidden");

        // 4. Force a clean system cache re-sync to instantly update your dashboard layouts
        if (typeof synchronizeSystemDatabaseData === "function") {
            await synchronizeSystemDatabaseData();
        }

    } catch (err) {
        alert(`Deletion Protocol Interrupted: ${err.message}`);
        console.error("Full destruction traceback log:", err);
    }
});

// --- 7. ULTIMATE WHATSAPP ENGINE SAFEGUARD ---
window.triggerDirectWhatsAppMessage = function (tenantId) {
    const tenant = window.appLocalCache ? window.appLocalCache.find(t => t.id === tenantId) : null;

    if (!tenant) {
        alert("Action Aborted: Tenant profile files are currently unavailable. Please refresh your workspace page.");
        return;
    }

    let phoneNumber = tenant.tenant_phone;
    const clientName = tenant.tenant_name || "Tenant";

    // 🟢 SAFEGUARD: Converts true nulls, undefined, and text "NULL" safely without breaking .trim()
    if (!phoneNumber || String(phoneNumber).toUpperCase() === "NULL" || String(phoneNumber).toLowerCase() === "undefined" || String(phoneNumber).trim() === "") {
        alert(`Action Paused: ${clientName} does not have a contact phone number registered in the file directory. Select 'Manage Asset' to input their number first!`);
        return;
    }

    // Clean out spaces or stray symbols, leaving only numbers
    let cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');

    // Nigerian Context Formatting: Convert local 0803 to international 234803
    if (cleanPhone.startsWith("0")) {
        cleanPhone = "234" + cleanPhone.slice(1);
    }

    const chatTemplate = encodeURIComponent(`Hello ${clientName}, this is a friendly update tracking your outstanding lease statement ledger balance.`);
    window.open(`https://wa.me/${cleanPhone}?text=${chatTemplate}`, '_blank');
};

// --- 8. LIVE INPUT TEXT SANITIZER ---
// 🟢 Keeps inputs editable, but instantly filters out accidental letter keypresses
const setupPhoneValidation = () => {
    const phoneInputs = ["editTenantPhone", "onboardTenantPhone"]; // Add your onboarding input ID here if named differently
    phoneInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.removeAttribute("readonly");
            element.removeAttribute("disabled");
            element.addEventListener("input", (e) => {
                e.target.value = e.target.value.replace(/[^0-9+]/g, "");
            });
        }
    });
};

// Initialize filter when page script frames load up
document.addEventListener("DOMContentLoaded", setupPhoneValidation);
// Run a secondary trigger call in case elements loaded dynamically
setTimeout(setupPhoneValidation, 1000);