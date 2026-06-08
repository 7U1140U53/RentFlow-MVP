// RENTFLOW UI PRESENTATION RENDER ARCHITECTURE

// --- 1. CALCULATE CORE STATS GLOBAL WRAPPERS ---
window.calculateAndDisplayGlobalMetrics = function (recordsCache) {
    let expectedTotal = 0;
    let pendingArrears = 0;
    let actionOverdues = 0;
    const todayTimestamp = new Date();

    if (recordsCache && recordsCache.length > 0) {
        recordsCache.forEach(item => {
            // 🟢 SAFEGUARD: Force properties to numbers immediately to isolate NaN bugs
            const annualRent = Number(item.annual_rent) || 0;
            const balanceDue = item.finance ? (Number(item.finance.balance_due) || 0) : annualRent;

            expectedTotal += annualRent;
            pendingArrears += balanceDue;

            // Overdue Countdown Check Conditionals
            if (item.lease_end_date && new Date(item.lease_end_date) < todayTimestamp) {
                actionOverdues++;
            }
        });
    }

    // Capture your exact DOM interface layout tags
    const rentTarget = document.getElementById("metricTotalRent");
    const balanceTarget = document.getElementById("metricTotalBalance");
    const overdueTarget = document.getElementById("metricOverdueCount");

    // Print calculated strings cleanly to the dashboard panel layout
    if (rentTarget) rentTarget.textContent = `₦${expectedTotal.toLocaleString()}`;
    if (balanceTarget) balanceTarget.textContent = `₦${pendingArrears.toLocaleString()}`;
    if (overdueTarget) overdueTarget.textContent = actionOverdues;
};

// 2. RENDER MAIN GRID & FIRST-TIME USER EMPTY ONBOARDING BANNER
window.renderTenantGrid = function (recordsCache) {
    const gridTarget = document.getElementById("tenantGridContainer");
    gridTarget.innerHTML = "";

    if (!recordsCache || recordsCache.length === 0) {
        // Modern Dotted Structural Boundary Empty State Design Box
        gridTarget.className = "col-span-full py-12 flex flex-col items-center justify-center text-center";
        gridTarget.innerHTML = `
            <div class="max-w-md w-full bg-slate-900 border-2 border-dashed border-slate-800 p-8 rounded-2xl flex flex-col items-center">
                <div class="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl text-emerald-400 mb-4">🏦</div>
                <h3 class="text-base font-bold text-white uppercase tracking-wide">Welcome to your financial vault</h3>
                <p class="text-xs text-slate-400 mt-2 mb-6 max-w-xs leading-relaxed">Track your first property parameters, split balances, and manage tenant workflows in under 2 minutes.</p>
                <button onclick="document.getElementById('onboardingWizardModal').classList.remove('hidden')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer">
                    + Onboard Your First Tenant
                </button>
            </div>
        `;
        return;
    }

    gridTarget.className = "grid grid-cols-1 lg:grid-cols-2 gap-6";

    recordsCache.forEach(item => {
        const finObj = item.finance;

        // 🟢 FIXED: Force values to numbers to prevent NaN crash screens
        const totalRent = Number(item.annual_rent) || 0;
        const amountPaid = finObj ? (Number(finObj.amount_paid) || 0) : 0;
        const remainingBalance = finObj ? (Number(finObj.balance_due) || 0) : totalRent;

        // Compute Visual Badging Matrix Variables
        let badgeClasses = "bg-rose-950/50 text-rose-400 border-rose-900/50";
        let statusText = "🔴 Unpaid / Arrears";

        if (amountPaid > 0 && remainingBalance > 0) {
            badgeClasses = "bg-amber-950/50 text-amber-400 border-amber-900/40";
            statusText = "🟡 Partially Paid";
        } else if (amountPaid > 0 && remainingBalance <= 0) {
            badgeClasses = "bg-emerald-950/50 text-emerald-400 border-emerald-900/40";
            statusText = "🟢 Fully Paid";
        }

        const cardElement = document.createElement("div");
        cardElement.className = "bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-700/60 flex flex-col justify-between space-y-6";
        cardElement.innerHTML = `
            <div class="flex items-start justify-between">
                <div>
                    <h3 class="text-sm font-bold text-white tracking-wide truncate max-w-[180px]">${item.tenant_name || 'Unnamed Tenant'}</h3>
                    <p class="text-xs text-slate-400 font-medium mt-0.5">${item.property_name || 'Property'} — <span class="text-slate-500">${item.unit_number || 'N/A'}</span></p>
                </div>
                <span class="border text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full ${badgeClasses}">
                    ${statusText}
                </span>
            </div>

            <div class="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60 text-left">
                <div>
                    <span class="text-[9px] font-bold tracking-wider text-slate-500 uppercase">Total Annual Rent</span>
                    <p class="text-sm font-semibold text-white mt-0.5">₦${totalRent.toLocaleString()}</p>
                </div>
                <div>
                    <span class="text-[9px] font-bold tracking-wider text-slate-500 uppercase">Remaining Balance</span>
                    <p class="text-sm font-bold ${remainingBalance > 0 ? 'text-rose-400' : 'text-slate-300'} mt-0.5">₦${remainingBalance.toLocaleString()}</p>
                </div>
            </div>

            <div class="flex items-center gap-3 text-xs pt-2">
                <span class="text-slate-500 font-medium text-[11px]">Expires: <span class="text-slate-300">${item.lease_end_date || 'N/A'}</span></span>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-1">
                <button onclick="window.triggerDirectWhatsAppMessage('${item.id}')" class="bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-900/50 text-slate-300 hover:text-emerald-400 font-bold py-2 px-3 rounded-xl text-[11px] uppercase tracking-wider transition-all cursor-pointer text-center">
                    💬 WhatsApp
                </button>
                <button onclick="openManageModal('${item.id}')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-white font-bold py-2 px-3 rounded-xl text-[11px] uppercase tracking-wider transition-all cursor-pointer text-center">
                    Manage Asset
                </button>
            </div>
        `;
        gridTarget.appendChild(cardElement);
    });
};

// 3. AUXILIARY PAYMENT HISTORICAL DATA AUDIT TABLE RENDERER
window.renderPaymentsLedgerView = function (recordsCache) {
    const tableBody = document.getElementById("paymentsTableBody");
    tableBody.innerHTML = "";

    if (recordsCache.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500 text-xs tracking-wide uppercase">No system transactions synced to database modules.</td></tr>`;
        return;
    }

    recordsCache.forEach(item => {
        const fin = item.finance;
        const total = item.annual_rent;
        const paid = fin ? fin.amount_paid : 0;
        const bal = fin ? fin.balance_due : total;
        const stat = fin ? fin.status : "Unpaid";

        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-800/20 transition-colors";
        tr.innerHTML = `
            <td class="p-4">
                <p class="font-bold text-white text-xs">${item.tenant_name}</p>
                <p class="text-[11px] text-slate-500 mt-0.5">${item.property_name} • ${item.unit_number}</p>
            </td>
            <td class="p-4 font-medium text-slate-300">₦${total.toLocaleString()}</td>
            <td class="p-4 text-emerald-400 font-medium">₦${paid.toLocaleString()}</td>
            <td class="p-4 font-bold text-slate-100">₦${bal.toLocaleString()}</td>
            <td class="p-4">
                <span class="text-[10px] font-bold ${bal === 0 ? 'text-emerald-400' : paid > 0 ? 'text-amber-400' : 'text-rose-400'}">
                    ● ${stat}
                </span>
            </td>
        `;
        tableBody.appendChild(tr);
    });
};

// 4. AUXILIARY LEASE COUNTDOWN RENDER ENGINE 
window.renderLeasesTrackerView = function (recordsCache) {
    const targetBlock = document.getElementById("leasesListContainer");
    targetBlock.innerHTML = "";

    if (recordsCache.length === 0) {
        targetBlock.innerHTML = `<p class="col-span-full text-slate-500 text-xs tracking-wide uppercase text-center py-6">No tracking dates active.</p>`;
        return;
    }

    recordsCache.forEach(item => {
        let textDiffAlert = "Lease Active";
        let colorClass = "text-emerald-400 bg-emerald-950/20 border-emerald-900/40";

        if (item.lease_end_date) {
            const exp = new Date(item.lease_end_date);
            const now = new Date();
            const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

            if (daysLeft < 0) {
                textDiffAlert = "⚠️ Contract Expired / Arrears State";
                colorClass = "text-rose-400 bg-rose-950/40 border-rose-900/40";
            } else if (daysLeft <= 60) {
                textDiffAlert = `⚠️ Critical Action: Lease End within ${daysLeft} days`;
                colorClass = "text-amber-400 bg-amber-950/30 border-amber-900/40";
            } else {
                textDiffAlert = `Contract Secure: ${daysLeft} days remaining`;
            }
        }

        const div = document.createElement("div");
        div.className = "bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-sm";
        div.innerHTML = `
            <div>
                <p class="text-xs font-bold text-white tracking-wide">${item.tenant_name}</p>
                <p class="text-[11px] text-slate-400 font-medium mt-0.5">${item.property_name} — Unit ${item.unit_number}</p>
            </div>
            <div class="border px-3 py-2 rounded-xl text-[11px] font-bold tracking-wide text-center ${colorClass}">
                ${textDiffAlert}
            </div>
        `;
        targetBlock.appendChild(div);
    });
};

// 5. EXTERNAL DIRECT QUICK HOOK FROM GRID CARD FACES
window.triggerDirectWhatsAppMessage = function (assetId) {
    // Reads directly from the globally exposed window cache to cross the script boundary seamlessly
    const cache = window.appLocalCache || [];
    const record = cache.find(r => r.id === assetId);

    if (!record || !record.tenant_phone) {
        alert("Action Aborted: Phone path detail entry string is empty.");
        return;
    }

    let cleanPhone = record.tenant_phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '234' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('234') && cleanPhone.length === 10) {
        cleanPhone = '234' + cleanPhone;
    }

    // Repaired typo: record.fsinance converted back to core structural record.finance reference
    const bal = record.finance ? record.finance.balance_due : record.annual_rent;
    let message = `Hello ${record.tenant_name}, this is an automated statement review verification check from management regarding your active lease contract folder at ${record.property_name}. Ledger reflects outstanding balance due: ₦${bal.toLocaleString()}. Thank you!`;

    if (bal <= 0) {
        message = `Hello ${record.tenant_name}, this is a confirmation response text string from management tracking to certify your annual lease contract at ${record.property_name} is fully settled. Thank you!`;
    }

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
};