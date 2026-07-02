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
    const record = appLocalCache.find(r => String(r.id) === String(assetId));
    if (!record) {
        console.warn("Workspace Alert: Management modal invoked without valid tenant record match.");
        return;
    }

    targetActiveLedgerCache = record.finance;

    document.getElementById("editAssetId").value = record.id;
    document.getElementById("editTenantName").value = record.tenant_name || "";
    document.getElementById("editTenantPhone").value = record.tenant_phone || "";

    const totalRentValue = Number(record.annual_rent) || 0;
    const amountPaidValue = targetActiveLedgerCache ? (Number(targetActiveLedgerCache.amount_paid) || 0) : 0;
    const balanceDueValue = targetActiveLedgerCache ? (Number(targetActiveLedgerCache.balance_due) ?? totalRentValue) : totalRentValue;

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
        document.querySelectorAll(".nav-link").forEach(btn => {
            btn.classList.remove("bg-emerald-600/10", "text-emerald-400", "border", "border-emerald-500/20");
            btn.classList.add("text-slate-400");
        });
        navButton.classList.add("bg-emerald-600/10", "text-emerald-400", "border", "border-emerald-500/20");

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

        appLocalCache = tenancies.map(t => {
            const linkedInvoice = invoices.find(inv => String(inv.tenancy_id) === String(t.id)) || null;
            return { ...t, finance: linkedInvoice };
        });

        window.appLocalCache = appLocalCache;

        if (typeof window.calculateAndDisplayGlobalMetrics === "function") window.calculateAndDisplayGlobalMetrics(appLocalCache);
        if (typeof window.renderTenantGrid === "function") window.renderTenantGrid(appLocalCache);
        if (typeof window.renderPaymentsLedgerView === "function") window.renderPaymentsLedgerView(appLocalCache);
        if (typeof window.renderLeasesTrackerView === "function") window.renderLeasesTrackerView(appLocalCache);

    } catch (err) {
        console.error("Database compilation sync sequence failed:", err);
    }
}

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
        lease_end_date: calculatedEndDate
    };

    try {
        const { data: tenantRecord, error: tErr } = await supabaseClient
            .from("tenancies")
            .insert([newTenancyPayload])
            .select()
            .single();

        if (tErr) throw tErr;

        const invoicePayload = {
            user_id: activeUserSession.id,
            tenancy_id: tenantRecord.id,
            total_amount: tenantRecord.annual_rent,
            amount_paid: 0,
            balance_due: tenantRecord.annual_rent,
            status: "Unpaid"
        };

        const { error: iErr } = await supabaseClient
            .from("invoices")
            .insert([invoicePayload]);

        if (iErr) throw iErr;

        alert("Tenant onboarded and payment ledger initialized successfully!");

        document.getElementById("wizardForm").reset();
        document.getElementById("onboardingWizardModal").classList.add("hidden");

        await loadDashboardData();

    } catch (err) {
        alert(`Pipeline Execution Halted: ${err.message}`);
        console.error("Onboarding error detailed log:", err);
    }
});

// --- 6. MANAGEMENT UPDATES & LEDGER TRANSACTION LOGGING (WITH AUTO-HEAL) ---
document.getElementById("manageAssetForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const tenancyId = document.getElementById("editAssetId").value;
    const incomingPayment = parseFloat(document.getElementById("logPaymentAmount").value) || 0;
    const updatedName = document.getElementById("editTenantName").value;
    const updatedPhone = document.getElementById("editTenantPhone").value;

    try {
        // 1. Update the core tenant profiles
        const { error: tenancyTableErr } = await supabaseClient
            .from("tenancies")
            .update({
                tenant_name: updatedName,
                tenant_phone: updatedPhone
            })
            .eq("id", tenancyId);

        if (tenancyTableErr) throw tenancyTableErr;

        // 2. Look for the associated invoice statement
        const { data: invoice, error: fetchErr } = await supabaseClient
            .from("invoices")
            .select("*")
            .eq("tenancy_id", tenancyId)
            .maybeSingle();

        if (fetchErr) throw fetchErr;

        let currentPaid = 0;
        let totalRentBill = 0;

        // Auto-Heal Trigger: If invoice row is missing entirely, pull rent values from local cache
        if (!invoice) {
            const cachedRecord = appLocalCache.find(r => String(r.id) === String(tenancyId));
            totalRentBill = cachedRecord ? (parseFloat(cachedRecord.annual_rent) || 0) : 0;
            currentPaid = 0;
        } else {
            currentPaid = parseFloat(invoice.amount_paid) || 0;
            totalRentBill = parseFloat(invoice.total_amount) || 0;
        }

        // 3. Compute structural ledger metrics safely
        const updatedPaid = currentPaid + incomingPayment;
        const updatedBalance = Math.max(0, totalRentBill - updatedPaid);

        let updatedStatus = "Unpaid";
        if (updatedPaid > 0 && updatedBalance > 0) {
            updatedStatus = "Partially Paid";
        } else if (updatedPaid > 0 && updatedBalance === 0) {
            updatedStatus = "Fully Paid";
        }

        // 4. Save metrics (Insert if it was a missing ghost invoice, Update if it exists)
        if (!invoice) {
            const { error: insertErr } = await supabaseClient
                .from("invoices")
                .insert([{
                    user_id: activeUserSession.id,
                    tenancy_id: tenancyId,
                    total_amount: totalRentBill,
                    amount_paid: updatedPaid,
                    balance_due: updatedBalance,
                    status: updatedStatus
                }]);

            if (insertErr) throw insertErr;
        } else {
            const { error: updateErr } = await supabaseClient
                .from("invoices")
                .update({
                    amount_paid: updatedPaid,
                    balance_due: updatedBalance,
                    status: updatedStatus
                })
                .eq("id", invoice.id);

            if (updateErr) throw updateErr;
        }

        alert("Tenant profiles and ledger records successfully synchronized!");
        document.getElementById("manageAssetModal").classList.add("hidden");
        document.getElementById("manageAssetForm").reset();

        await synchronizeSystemDatabaseData();

    } catch (err) {
        alert(`Error modifying record engine files: ${err.message}`);
        console.error("Form transmission crash report details:", err);
    }
});

// --- 7. AUTOMATED WHATSAPP OUTREACH DISPATCH SYSTEMS ---
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

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(baselineMessageText)}`, '_blank');
});

window.triggerDirectWhatsAppMessage = function (tenantId) {
    const tenant = appLocalCache ? appLocalCache.find(t => String(t.id) === String(tenantId)) : null;

    if (!tenant) {
        alert("Action Aborted: Tenant profile files are currently unavailable. Please refresh your workspace page.");
        return;
    }

    const phoneNumber = tenant.tenant_phone;
    const clientName = tenant.tenant_name || "Tenant";

    const totalRent = Number(tenant.annual_rent) || 0;
    const remainingBalance = tenant.finance ? (Number(tenant.finance.balance_due) || 0) : totalRent;

    if (!phoneNumber || String(phoneNumber).toUpperCase() === "NULL" || String(phoneNumber).toLowerCase() === "undefined" || String(phoneNumber).trim() === "") {
        alert(`Action Paused: ${clientName} does not have a contact phone number registered in the file directory. Select 'Manage Asset' to input their number first!`);
        return;
    }

    let cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith("0")) {
        cleanPhone = "234" + cleanPhone.slice(1);
    }

    const chatTemplate = encodeURIComponent(`Hello ${clientName}, this is a quick update from management regarding your account statement. The remaining outstanding balance is ₦${remainingBalance.toLocaleString()}. Please let us know if payments have been processed!`);

    window.open(`https://wa.me/${cleanPhone}?text=${chatTemplate}`, '_blank');
};

// --- 8. CRITICAL PROFILE DELETION ENGINE ---
document.getElementById("deleteTenantRecordBtn").addEventListener("click", async () => {
    const currentTenantId = document.getElementById("editAssetId").value;

    if (!currentTenantId) {
        alert("Action Paused: Could not resolve a valid tenant tracking reference code.");
        return;
    }

    const doubleCheckConfirmation = confirm("🚨 WARNING: Are you sure you want to permanently erase this tenant profile and all associated payment ledger tracking history? This action cannot be undone.");
    if (!doubleCheckConfirmation) return;

    try {
        const { error: invoiceWipeErr } = await supabaseClient
            .from("invoices")
            .delete()
            .eq("tenancy_id", currentTenantId);

        if (invoiceWipeErr) throw invoiceWipeErr;

        const { error: tenantWipeErr } = await supabaseClient
            .from("tenancies")
            .delete()
            .eq("id", currentTenantId);

        if (tenantWipeErr) throw tenantWipeErr;

        alert("Profile records and associated balance statement sheets permanently purged.");
        document.getElementById("manageAssetModal").classList.add("hidden");

        await synchronizeSystemDatabaseData();

    } catch (err) {
        alert(`Deletion Protocol Interrupted: ${err.message}`);
        console.error("Full destruction traceback log:", err);
    }
});

// --- 9. DISMISSAL CLICK MAPPINGS ---
document.querySelectorAll(".closeModalBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.getElementById("onboardingWizardModal").classList.add("hidden");
        document.getElementById("manageAssetModal").classList.add("hidden");
    });
});

document.getElementById("openWizardBtn").addEventListener("click", () => {
    document.getElementById("onboardingWizardModal").classList.remove("hidden");
});

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

// --- 10. LIVE INPUT TEXT SANITIZER ---
const setupPhoneValidation = () => {
    const phoneInputs = ["editTenantPhone", "wTenantPhone"];
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

document.addEventListener("DOMContentLoaded", setupPhoneValidation);
setTimeout(setupPhoneValidation, 1000);