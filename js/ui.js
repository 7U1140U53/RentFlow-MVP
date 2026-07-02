// RENTFLOW UI PRESENTATION RENDER ARCHITECTURE

// --- 1. TREMOR PORTFOLIO CATEGORY BAR CARD ENGINE ---
window.calculateAndDisplayGlobalMetrics = function (recordsCache) {
    let expectedTotal = 0;
    let totalCollected = 0;
    let totalArrears = 0;
    let actionOverdues = 0;
    const todayTimestamp = new Date();

    let fullyPaidVol = 0;
    let partiallyPaidVol = 0;

    if (recordsCache && recordsCache.length > 0) {
        recordsCache.forEach(item => {
            const annualRent = Number(item.annual_rent) || 0;
            const finObj = item.finance;
            const amountPaid = finObj ? (Number(finObj.amount_paid) || 0) : 0;
            const balanceDue = finObj ? (Number(finObj.balance_due) || 0) : annualRent;

            expectedTotal += annualRent;
            totalCollected += amountPaid;
            totalArrears += balanceDue;

            if (amountPaid > 0 && balanceDue <= 0) {
                fullyPaidVol += annualRent;
            } else if (amountPaid > 0 && balanceDue > 0) {
                partiallyPaidVol += amountPaid;
            }

            if (item.lease_end_date && new Date(item.lease_end_date) < todayTimestamp) {
                actionOverdues++;
            }
        });
    }

    const fullyPaidPct = expectedTotal > 0 ? Math.round((fullyPaidVol / expectedTotal) * 100) : 0;
    const partialPaidPct = expectedTotal > 0 ? Math.round((partiallyPaidVol / expectedTotal) * 100) : 0;
    const arrearsPct = expectedTotal > 0 ? Math.round((totalArrears / expectedTotal) * 100) : 0;

    const metricsWrapper = document.getElementById("tremorMetricsContainer");
    if (!metricsWrapper) return;

    metricsWrapper.innerHTML = `
        <div class="col-span-1 lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm backdrop-blur-xs flex flex-col justify-between">
            <div>
                <div class="flex items-center gap-2">
                    <h3 class="font-bold text-xs tracking-wider text-slate-400 uppercase">Total expected</h3>
                    <span class="bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        ₦${totalCollected.toLocaleString()} collected
                    </span>
                </div>
                <p class="mt-2 flex items-baseline gap-2">
                    <span class="text-3xl font-bold tracking-tight text-white font-mono">₦${expectedTotal.toLocaleString()}</span>
                    <span class="text-xs text-slate-500 font-medium">total expected rent portfolio</span>
                </p>
                
                <div class="mt-6">
                    <div class="mt-2.5 h-2.5 w-full bg-slate-950 rounded-full flex overflow-hidden p-[2px] border border-slate-800/40">
                        <div class="bg-emerald-500 rounded-full transition-all duration-500" style="width: ${fullyPaidPct}%" title="Fully paid"></div>
                        <div class="bg-amber-500 rounded-full transition-all duration-500 mx-[1px]" style="width: ${partialPaidPct}%" title="Partially paid"></div>
                        <div class="bg-rose-500 rounded-full transition-all duration-500" style="width: ${arrearsPct}%" title="Overdue balance"></div>
                    </div>
                </div>

                <ul role="list" class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800/40">
                    <li class="flex items-center gap-2 text-xs">
                        <span class="size-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span class="text-slate-400 truncate">Fully paid:</span>
                        <span class="text-white font-semibold font-mono text-[11px]">(${fullyPaidPct}%)</span>
                    </li>
                    <li class="flex items-center gap-2 text-xs">
                        <span class="size-2 rounded-full bg-amber-500 shrink-0"></span>
                        <span class="text-slate-400 truncate">Partially paid:</span>
                        <span class="text-white font-semibold font-mono text-[11px]">(${partialPaidPct}%)</span>
                    </li>
                    <li class="flex items-center gap-2 text-xs">
                        <span class="size-2 rounded-full bg-rose-500 shrink-0"></span>
                        <span class="text-slate-400 truncate">Overdue balance:</span>
                        <span class="text-rose-400 font-bold font-mono text-[11px]">₦${totalArrears.toLocaleString()} (${arrearsPct}%)</span>
                    </li>
                </ul>
            </div>
        </div>

        <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm backdrop-blur-xs flex flex-col justify-between">
            <div>
                <dt class="font-bold text-xs tracking-wider text-slate-400 uppercase">Attention required</dt>
                <dd class="text-5xl font-black ${actionOverdues > 0 ? 'text-rose-500' : 'text-slate-500'} font-mono mt-4">${actionOverdues}</dd>
            </div>
            <div class="pt-4 border-t border-slate-800/40 text-left">
                <p class="text-[11px] font-medium text-slate-400 leading-relaxed">
                    ${actionOverdues > 0 ? '⚠️ Take action. Some leases have ended or have unpaid balances.' : '✅ All clear. No immediate lease or payment issues detected.'}
                </p>
            </div>
        </div>
    `;
};

// --- 2. MAIN APPLICATION RENTAL RECORDS GRID SYSTEM ---
window.renderTenantGrid = function (recordsCache) {
    const gridTarget = document.getElementById("tenantGridContainer");
    if (!gridTarget) return;
    gridTarget.innerHTML = "";

    if (!recordsCache || recordsCache.length === 0) {
        gridTarget.className = "col-span-full py-12 flex flex-col items-center justify-center text-center";
        gridTarget.innerHTML = `
            <div class="max-w-md w-full bg-slate-900 border-2 border-dashed border-slate-800 p-8 rounded-2xl flex flex-col items-center">
                <div class="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl text-emerald-400 mb-4">🏦</div>
                <h3 class="text-base font-bold text-white uppercase tracking-wide">Your portfolio is empty</h3>
                <p class="text-xs text-slate-400 mt-2 mb-6 max-w-xs leading-relaxed">Track your properties, split balances, and manage lease renewals easily.</p>
                <button onclick="document.getElementById('onboardingWizardModal').classList.remove('hidden')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer">
                    + New tenant
                </button>
            </div>
        `;
        return;
    }

    gridTarget.className = "grid grid-cols-1 lg:grid-cols-2 gap-6";

    recordsCache.forEach(item => {
        const finObj = item.finance;
        const totalRent = Number(item.annual_rent) || 0;
        const amountPaid = finObj ? (Number(finObj.amount_paid) || 0) : 0;
        const remainingBalance = finObj ? (Number(finObj.balance_due) || 0) : totalRent;

        let badgeClasses = "bg-rose-950/50 text-rose-400 border-rose-900/50";
        let statusText = "Overdue";

        if (amountPaid > 0 && remainingBalance > 0) {
            badgeClasses = "bg-amber-950/50 text-amber-400 border-amber-900/40";
            statusText = "Partial";
        } else if (amountPaid > 0 && remainingBalance <= 0) {
            badgeClasses = "bg-emerald-950/50 text-emerald-400 border-emerald-900/40";
            statusText = "Paid";
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
                    <span class="text-[9px] font-bold tracking-wider text-slate-500 uppercase">Yearly rent</span>
                    <p class="text-sm font-semibold text-white mt-0.5 font-mono">₦${totalRent.toLocaleString()}</p>
                </div>
                <div>
                    <span class="text-[9px] font-bold tracking-wider text-slate-500 uppercase">Overdue balance</span>
                    <p class="text-sm font-bold ${remainingBalance > 0 ? 'text-rose-400' : 'text-slate-300'} mt-0.5 font-mono">₦${remainingBalance.toLocaleString()}</p>
                </div>
            </div>

            <div class="flex items-center gap-3 text-xs pt-2">
                <span class="text-slate-500 font-medium text-[11px]">Expires: <span class="text-slate-300">${item.lease_end_date || 'N/A'}</span></span>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-1">
                <button onclick="window.triggerDirectWhatsAppMessage('${item.id}')" class="bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-900/50 text-slate-300 hover:text-emerald-400 font-bold py-2 px-3 rounded-xl text-[11px] uppercase tracking-wider transition-all cursor-pointer text-center">
                    💬 WhatsApp
                </button>
                <button onclick="window.openManageModal('${item.id}')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-white font-bold py-2 px-3 rounded-xl text-[11px] uppercase tracking-wider transition-all cursor-pointer text-center">
                    Manage
                </button>
            </div>
        `;
        gridTarget.appendChild(cardElement);
    });
};

// --- 3. AUDIT TRANSACTION PAYMENT HISTORY VIEW ENGINE ---
window.renderPaymentsLedgerView = function (recordsCache) {
    const tableBody = document.getElementById("paymentsTableBody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (!recordsCache || recordsCache.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500 text-xs tracking-wide uppercase">No logged transactions found.</td></tr>`;
        return;
    }

    recordsCache.forEach(item => {
        const fin = item.finance;
        const total = item.annual_rent || 0;
        const paid = fin ? (Number(fin.amount_paid) || 0) : 0;
        const bal = fin ? (Number(fin.balance_due) || 0) : total;

        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-800/20 transition-colors";
        tr.innerHTML = `
            <td class="p-4">
                <p class="font-bold text-white text-xs">${item.tenant_name || 'Unnamed Tenant'}</p>
                <p class="text-[11px] text-slate-500 mt-0.5">${item.property_name || 'N/A'} • ${item.unit_number || 'N/A'}</p>
            </td>
            <td class="p-4 font-medium text-slate-300 font-mono">₦${total.toLocaleString()}</td>
            <td class="p-4 text-emerald-400 font-medium font-mono">₦${paid.toLocaleString()}</td>
            <td class="p-4 font-bold text-slate-100 font-mono">₦${bal.toLocaleString()}</td>
            <td class="p-4">
                <span class="text-[10px] font-bold ${bal === 0 ? 'text-emerald-400' : paid > 0 ? 'text-amber-400' : 'text-rose-400'}">
                    ● ${bal === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Overdue'}
                </span>
            </td>
        `;
        tableBody.appendChild(tr);
    });
};

// --- 4. LEASE AGREEMENT CALENDAR DATE COUNTDOWN ENGINE ---
window.renderLeasesTrackerView = function (recordsCache) {
    const targetBlock = document.getElementById("leasesListContainer");
    if (!targetBlock) return;
    targetBlock.innerHTML = "";

    if (!recordsCache || recordsCache.length === 0) {
        targetBlock.innerHTML = `<p class="col-span-full text-slate-500 text-xs tracking-wide uppercase text-center py-6">No tracking dates active.</p>`;
        return;
    }

    recordsCache.forEach(item => {
        let textDiffAlert = "Active";
        let colorClass = "text-emerald-400 bg-emerald-950/20 border-emerald-900/40";

        if (item.lease_end_date) {
            const exp = new Date(item.lease_end_date);
            const now = new Date();
            const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

            if (daysLeft < 0) {
                textDiffAlert = "⚠️ Expired";
                colorClass = "text-rose-400 bg-rose-950/40 border-rose-900/40";
            } else if (daysLeft <= 60) {
                textDiffAlert = `⚠️ Expires in ${daysLeft} days`;
                colorClass = "text-amber-400 bg-amber-950/30 border-amber-900/40";
            } else {
                textDiffAlert = `Expires in ${daysLeft} days`;
            }
        }

        const div = document.createElement("div");
        div.className = "bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-sm";
        div.innerHTML = `
            <div>
                <p class="text-xs font-bold text-white tracking-wide">${item.tenant_name || 'Unnamed Tenant'}</p>
                <p class="text-[11px] text-slate-400 font-medium mt-0.5">${item.property_name || 'N/A'} — Unit ${item.unit_number || 'N/A'}</p>
            </div>
            <div class="border px-3 py-2 rounded-xl text-[11px] font-bold tracking-wide text-center ${colorClass}">
                ${textDiffAlert}
            </div>
        `;
        targetBlock.appendChild(div);
    });
};

// --- 5. SIDEBAR NAVIGATION ENGINE ---
const initializeSidebarNavigationEngine = () => {
    const openSidebarBtn = document.getElementById("openSidebarBtn");
    const closeSidebarBtn = document.getElementById("closeSidebarBtn");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const appSidebar = document.getElementById("appSidebar");
    const navigationLinks = document.querySelectorAll(".nav-link");

    const triggerOpenState = () => {
        if (appSidebar) appSidebar.classList.remove("-translate-x-full"), appSidebar.classList.add("translate-x-0");
        if (sidebarOverlay) sidebarOverlay.classList.remove("opacity-0", "pointer-events-none"), sidebarOverlay.classList.add("opacity-100", "pointer-events-auto");
    };

    const triggerCloseState = () => {
        if (appSidebar) appSidebar.classList.remove("translate-x-0"), appSidebar.classList.add("-translate-x-full");
        if (sidebarOverlay) sidebarOverlay.classList.remove("opacity-100", "pointer-events-auto"), sidebarOverlay.classList.add("opacity-0", "pointer-events-none");
    };

    if (openSidebarBtn) openSidebarBtn.addEventListener("click", triggerOpenState);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", triggerCloseState);
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", triggerCloseState);

    navigationLinks.forEach(link => {
        link.addEventListener("click", () => {
            navigationLinks.forEach(l => {
                l.classList.remove("bg-emerald-600/10", "text-emerald-400", "border-emerald-500/20");
                l.classList.add("text-slate-400");
            });
            link.classList.remove("text-slate-400");
            link.classList.add("bg-emerald-600/10", "text-emerald-400", "border-emerald-500/20");
            triggerCloseState();
        });
    });
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSidebarNavigationEngine);
} else {
    initializeSidebarNavigationEngine();
}