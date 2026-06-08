// RentFlow MVP UI Functions
/**
 * Processes date logic payloads to return explicit compliance metrics and structural CSS values
 */
export function calculateLeaseMetrics(endDateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Equalize time variance checks
    const expiry = new Date(endDateString);

    const timeDelta = expiry.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDelta / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
        return {
            state: 'Expired',
            badgeStyles: 'bg-rose-950/40 text-rose-400 border-rose-800/60 animate-pulse',
            label: 'Lease Expired / Owed'
        };
    } else if (daysRemaining <= 60) {
        return {
            state: 'Expiring',
            badgeStyles: 'bg-amber-950/40 text-amber-400 border-amber-800/60 font-medium',
            label: `Renewal Pending (${daysRemaining} Days)`
        };
    } else {
        return {
            state: 'Active',
            badgeStyles: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60',
            label: 'Active Contract'
        };
    }
}

/**
 * Compiles portfolio analytics to populate the master counters layout element block
 */
export function runGlobalMetricsUpdate(records, invoices = []) {
    let total = records.length;
    let pending = 0;
    let expired = 0;

    records.forEach(item => {
        const check = calculateLeaseMetrics(item.lease_end_date);
        if (check.state === 'Expiring') pending++;

        // Check if matching invoice indicates unpaid / arrears state
        const matchingInvoice = invoices.find(inv => inv.tenancy_id === item.id);
        const hasArrears = matchingInvoice && (
            matchingInvoice.status === 'Unpaid' ||
            matchingInvoice.status === 'Partially Paid' ||
            Number(matchingInvoice.balance_due) > 0
        );

        if (check.state === 'Expired' || hasArrears) expired++;
    });

    document.getElementById('metricTotalAssets').textContent = total;
    document.getElementById('metricPendingRenewals').textContent = pending;
    document.getElementById('metricExpiredLeases').textContent = expired;
}

/**
 * Sweeps the DOM and compiles structural cards mapped with contextual event data
 */
export function renderTenantGrid(containerId, records, invoices = []) {
    const targetGrid = document.getElementById(containerId);
    if (!targetGrid) return;

    targetGrid.innerHTML = '';

    if (records.length === 0) {
        targetGrid.innerHTML = `
            <div class="col-span-full border-2 border-dashed border-slate-800 rounded-2xl py-16 text-center text-slate-500 text-sm font-medium">
                No properties or active tenancies synced. Tap '+ Add New Tenant' to spin up data pipelines.
            </div>`;
        return;
    }

    records.forEach(item => {
        const matchingInvoice = invoices.find(inv => inv.tenancy_id === item.id);
        const status = matchingInvoice ? matchingInvoice.status : 'Unpaid';
        const balanceDue = matchingInvoice ? Number(matchingInvoice.balance_due) : Number(item.annual_rent);

        let badgeStyles = 'bg-rose-950/40 text-rose-400 border-rose-800/60';
        let badgeLabel = 'Unpaid';

        if (status === 'Paid') {
            badgeStyles = 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60';
            badgeLabel = 'Paid';
        } else if (status === 'Partially Paid') {
            badgeStyles = 'bg-amber-950/40 text-amber-400 border-amber-800/60';
            badgeLabel = 'Partially Paid';
        } else if (status === 'Unpaid') {
            badgeStyles = 'bg-rose-950/40 text-rose-400 border-rose-800/60';
            badgeLabel = 'Unpaid';
        }

        const cardTemplate = `
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all duration-200 ease-in-out shadow-sm flex flex-col justify-between group relative">
                <div>
                    <div class="flex justify-between items-start gap-2 mb-4">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${badgeStyles}">
                            ${badgeLabel}
                        </span>
                        <div class="text-right">
                            <span class="text-xs text-slate-400 font-bold block uppercase tracking-wider">TOTAL ANNUAL RENT</span>
                            <span class="text-base font-black text-white">₦${Number(item.annual_rent).toLocaleString()}</span>
                            <div class="mt-1">
                                <span class="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">REMAINING BALANCE</span>
                                <span class="text-xs font-black ${balanceDue > 0 ? 'text-rose-400' : 'text-slate-300'}">₦${Number(balanceDue).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <h3 class="font-black text-white text-lg tracking-tight group-hover:text-indigo-400 transition-colors">${item.tenant_name}</h3>
                    <p class="text-xs font-semibold text-slate-400 mt-0.5">${item.property_name} &bull; <span class="text-slate-300">${item.unit_number}</span></p>
                </div>

                <div class="border-t border-slate-800 pt-4 mt-5 flex items-center justify-between text-xs">
                    <div class="text-slate-400 font-medium">
                        Expires: <span class="text-slate-300 font-bold">${new Date(item.lease_end_date).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <button class="font-bold text-emerald-400 hover:text-emerald-300 transition cursor-pointer whatsapp-reminder-btn" data-phone="${item.tenant_phone || ''}" data-name="${item.tenant_name}" data-property="${item.property_name}" data-unit="${item.unit_number}" data-balance="${balanceDue}">
                            WhatsApp
                        </button>
                        <button class="font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer asset-manage-trigger" data-id="${item.id}">
                            Manage Asset →
                        </button>
                    </div>
                </div>
            </div>`;

        targetGrid.insertAdjacentHTML('beforeend', cardTemplate);
    });
}