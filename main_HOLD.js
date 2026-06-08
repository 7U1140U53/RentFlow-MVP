// RentFlow MVP Main Application
import { getAllTenancies, createNewTenancy, updateTenancy, deleteTenancy, getInvoiceByTenancy, updateInvoicePayment, getAllInvoices, createInvoice } from './db.js';
import { renderTenantGrid, runGlobalMetricsUpdate } from './ui.js';

// Central Functional Local State Store
let currentWizardStep = 1;
let wizardFormData = {
    property_name: '',
    unit_number: '',
    tenant_name: '',
    tenant_phone: '',
    annual_rent: '',
    lease_start_date: ''
};
let ledgerCache = null;

/**
 * Kicks off application execution lifecycle
 */
async function appSetupEngine() {
    console.log("RentFlow Core Orchestrator Assembling Pipeline Components...");
    await refreshDashboardView();
    bindInteractiveControlTriggers();
}

/**
 * Syncs with the cloud module and pushes updates straight to the layout engine
 */
async function refreshDashboardView() {
    const collection = await getAllTenancies();
    const invoices = await getAllInvoices();
    renderTenantGrid('tenantGrid', collection, invoices);
    runGlobalMetricsUpdate(collection, invoices);
}

/**
 * Handles wizard movement and updates the progress indicator layout
 */
function handleStepNavigation(direction) {
    // Save current step input parameters locally before stepping
    captureCurrentStepInputs();

    // Determine target vector
    if (direction === 'NEXT') {
        if (!validateStepRequirements()) return; // Halt navigation if validation checks fail
        if (currentWizardStep === 3) {
            commitWizardPayloadToCloud();
            return;
        }
        currentWizardStep++;
    } else if (direction === 'BACK') {
        if (currentWizardStep === 1) return;
        currentWizardStep--;
    }

    renderWizardStepState();
}

/**
 * Pulls current form inputs into local state storage
 */
function captureCurrentStepInputs() {
    if (currentWizardStep === 1) {
        wizardFormData.property_name = document.getElementById('inputPropertyName').value;
        wizardFormData.unit_number = document.getElementById('inputUnitNumber').value;
    } else if (currentWizardStep === 2) {
        wizardFormData.tenant_name = document.getElementById('inputTenantName').value;
        wizardFormData.tenant_phone = document.getElementById('inputTenantPhone').value;
        wizardFormData.annual_rent = document.getElementById('inputAnnualRent').value;
    } else if (currentWizardStep === 3) {
        wizardFormData.lease_start_date = document.getElementById('inputLeaseStart').value;
    }
}

/**
 * Ensures standard fields are filled before allowing the user to move forward
 */
function validateStepRequirements() {
    if (currentWizardStep === 1) {
        if (!wizardFormData.property_name.trim() || !wizardFormData.unit_number.trim()) {
            alert("Operational Requirement: Complete Property Name and Unit inputs to map data records accurately.");
            return false;
        }
    }
    if (currentWizardStep === 2) {
        if (!wizardFormData.tenant_name.trim() || !wizardFormData.annual_rent.trim()) {
            alert("Operational Requirement: Missing Tenant Name or Contract Rent fields.");
            return false;
        }
    }
    if (currentWizardStep === 3) {
        if (!wizardFormData.lease_start_date) {
            alert("Operational Requirement: Select lease hand-over commencement baseline date configuration.");
            return false;
        }
    }
    return true;
}

/**
 * Updates step visibilities and modifies Tailwind layouts on the fly
 */
function renderWizardStepState() {
    // Manage display visibilities
    document.getElementById('wizardStep1').classList.toggle('hidden', currentWizardStep !== 1);
    document.getElementById('wizardStep2').classList.toggle('hidden', currentWizardStep !== 2);
    document.getElementById('wizardStep3').classList.toggle('hidden', currentWizardStep !== 3);

    // Adjust button interfaces dynamically
    const backBtn = document.getElementById('wizardBackBtn');
    const nextBtn = document.getElementById('wizardNextBtn');

    backBtn.classList.toggle('invisible', currentWizardStep === 1);
    nextBtn.textContent = currentWizardStep === 3 ? 'Execute Handover' : 'Next →';
    if (currentWizardStep === 3) {
        nextBtn.classList.replace('bg-indigo-600', 'bg-emerald-600');
    } else {
        nextBtn.classList.replace('bg-emerald-600', 'bg-indigo-600');
    }

    // High-fidelity active class handling for step badges
    document.getElementById('stepBadge1').classList.toggle('text-indigo-600', currentWizardStep === 1);
    document.getElementById('stepBadge2').classList.toggle('text-indigo-600', currentWizardStep === 2);
    document.getElementById('stepBadge3').classList.toggle('text-indigo-600', currentWizardStep === 3);
}

/**
 * Pushes gathered form inputs to Supabase and resets the layout
 */
async function commitWizardPayloadToCloud() {
    try {
        const submitButton = document.getElementById('wizardNextBtn');
        submitButton.disabled = true;
        submitButton.textContent = 'Syncing...';

        await createNewTenancy(wizardFormData);

        // Clean up state on success
        toggleModalState(false);
        document.getElementById('wizardForm').reset();
        currentWizardStep = 1;
        wizardFormData = { property_name: '', unit_number: '', tenant_name: '', tenant_phone: '', annual_rent: '', lease_start_date: '' };
        renderWizardStepState();

        // Refresh grid
        await refreshDashboardView();
        alert("Portfolio Database Transaction Log Updated Successfully.");
    } catch (err) {
        alert(`System Fault Intercepted: ${err.message}`);
    } finally {
        document.getElementById('wizardNextBtn').disabled = false;
    }
}

function toggleModalState(show) {
    const modal = document.getElementById('onboardingWizard');
    modal.classList.toggle('hidden', !show);
    if (show) {
        currentWizardStep = 1;
        renderWizardStepState();
    }
}

/**
 * Opens the manage asset modal and populates it with existing data
 */
async function openManageModal(assetId) {
    try {
        const records = await getAllTenancies();
        const asset = records.find(record => record.id === assetId);
        if (asset) {
            // Populate form fields
            document.getElementById('editAssetId').value = asset.id;
            document.getElementById('editTenantName').value = asset.tenant_name;
            document.getElementById('editTenantPhone').value = asset.tenant_phone || '';
            document.getElementById('editAnnualRent').value = asset.annual_rent;
            document.getElementById('editPropertyName').value = asset.property_name || '';
            document.getElementById('editUnitNumber').value = asset.unit_number || '';

            // Clear payment input
            document.getElementById('logPaymentAmount').value = '';

            // Show modal
            document.getElementById('manageAssetModal').classList.remove('hidden');

            // Fetch invoice
            const invoice = await getInvoiceByTenancy(asset.id);
            ledgerCache = invoice;

            if (invoice) {
                document.getElementById('ledgerTotalOwed').textContent = `₦${Number(invoice.total_amount).toLocaleString('en-NG')}`;
                document.getElementById('ledgerTotalPaid').textContent = `₦${Number(invoice.amount_paid).toLocaleString('en-NG')}`;
                document.getElementById('ledgerBalanceDue').textContent = `₦${Number(invoice.balance_due).toLocaleString('en-NG')}`;
                document.getElementById('invoiceStatusBadge').textContent = invoice.status || 'Unpaid';
            } else {
                document.getElementById('ledgerTotalOwed').textContent = '₦0';
                document.getElementById('ledgerTotalPaid').textContent = '₦0';
                document.getElementById('ledgerBalanceDue').textContent = '₦0';
                document.getElementById('invoiceStatusBadge').textContent = 'Unpaid';
            }
        }
    } catch (err) {
        console.error("Error opening manage modal:", err);
    }
}

/**
 * Closes the manage asset modal
 */
function closeManageModal() {
    document.getElementById('manageAssetModal').classList.add('hidden');
    document.getElementById('manageForm').reset();
}

/**
 * Saves asset changes to the database
 */
async function saveAssetChanges() {
    try {
        const assetId = document.getElementById('editAssetId').value;
        const updatePayload = {
            tenant_name: document.getElementById('editTenantName').value,
            tenant_phone: document.getElementById('editTenantPhone').value,
            annual_rent: parseFloat(document.getElementById('editAnnualRent').value) || 0,
            property_name: document.getElementById('editPropertyName').value,
            unit_number: document.getElementById('editUnitNumber').value
        };

        await updateTenancy(assetId, updatePayload);

        // Check if logPaymentAmount has a value greater than 0
        const logPaymentVal = parseFloat(document.getElementById('logPaymentAmount').value);
        if (logPaymentVal > 0) {
            if (!ledgerCache) {
                ledgerCache = await createInvoice(assetId, updatePayload.annual_rent);
            }
            await updateInvoicePayment(
                ledgerCache.id,
                ledgerCache.amount_paid,
                ledgerCache.total_amount,
                logPaymentVal
            );
        }

        await refreshDashboardView();
        closeManageModal();
        alert("Asset profile updated successfully.");
    } catch (err) {
        alert(`System Fault Intercepted: ${err.message}`);
    }
}

/**
 * Deletes an asset from the database
 */
async function deleteAsset() {
    const assetId = document.getElementById('editAssetId').value;

    if (confirm('Are you sure you want to delete this asset profile? This action cannot be undone.')) {
        try {
            await deleteTenancy(assetId);
            closeManageModal();
            await refreshDashboardView();
            alert("Asset profile removed from registry.");
        } catch (err) {
            alert(`System Fault Intercepted: ${err.message}`);
        }
    }
}

/**
 * Registers global user action click events
 */
function bindInteractiveControlTriggers() {
    document.getElementById('openWizardBtn')?.addEventListener('click', () => toggleModalState(true));
    document.getElementById('closeWizardBtn')?.addEventListener('click', () => toggleModalState(false));
    document.getElementById('wizardBackBtn')?.addEventListener('click', () => handleStepNavigation('BACK'));
    document.getElementById('wizardNextBtn')?.addEventListener('click', () => handleStepNavigation('NEXT'));

    // --- PASTE THIS EXACT BLOCK TO FIX THE GHOSTING BUTTON ---
    document.getElementById('tenantGrid')?.addEventListener('click', async (e) => {
        if (e.target.classList.contains('asset-manage-trigger')) {
            const assetId = e.target.getAttribute('data-id');
            const collection = await getAllTenancies();
            const targetAsset = collection.find(item => item.id == assetId);

            if (targetAsset) {
                document.getElementById('editAssetId').value = targetAsset.id;
                document.getElementById('editTenantName').value = targetAsset.tenant_name;
                document.getElementById('editTenantPhone').value = targetAsset.tenant_phone || '';
                document.getElementById('editAnnualRent').value = targetAsset.annual_rent;
                document.getElementById('editPropertyName').value = targetAsset.property_name || '';
                document.getElementById('editUnitNumber').value = targetAsset.unit_number || '';
                document.getElementById('logPaymentAmount').value = '';
                document.getElementById('manageAssetModal').classList.remove('hidden');

                try {
                    const invoice = await getInvoiceByTenancy(targetAsset.id);
                    ledgerCache = invoice;

                    if (invoice) {
                        document.getElementById('ledgerTotalOwed').textContent = `₦${Number(invoice.total_amount).toLocaleString('en-NG')}`;
                        document.getElementById('ledgerTotalPaid').textContent = `₦${Number(invoice.amount_paid).toLocaleString('en-NG')}`;
                        document.getElementById('ledgerBalanceDue').textContent = `₦${Number(invoice.balance_due).toLocaleString('en-NG')}`;
                        document.getElementById('invoiceStatusBadge').textContent = invoice.status || 'Unpaid';
                    } else {
                        document.getElementById('ledgerTotalOwed').textContent = '₦0';
                        document.getElementById('ledgerTotalPaid').textContent = '₦0';
                        document.getElementById('ledgerBalanceDue').textContent = '₦0';
                        document.getElementById('invoiceStatusBadge').textContent = 'Unpaid';
                    }
                } catch (invoiceErr) {
                    console.error("Error fetching invoice ledger:", invoiceErr);
                    document.getElementById('ledgerTotalOwed').textContent = '₦0';
                    document.getElementById('ledgerTotalPaid').textContent = '₦0';
                    document.getElementById('ledgerBalanceDue').textContent = '₦0';
                    document.getElementById('invoiceStatusBadge').textContent = 'Error';
                }
            }
        }
    });
    // ---------------------------------------------------------

    document.getElementById('closeManageBtn')?.addEventListener('click', () => {
        document.getElementById('manageAssetModal').classList.add('hidden');
    });

    document.getElementById('onboardingWizard')?.addEventListener('click', (e) => {
        if (e.target.id === 'onboardingWizard') toggleModalState(false);
    });
}

// Trap closing event if backdrop wrapper clicked directly
document.getElementById('onboardingWizard')?.addEventListener('click', (e) => {
    if (e.target.id === 'onboardingWizard') toggleModalState(false);
});

// Manage Asset Modal Controls
document.getElementById('closeManageBtn')?.addEventListener('click', closeManageModal);
document.getElementById('saveAssetChangesBtn')?.addEventListener('click', saveAssetChanges);
document.getElementById('deleteAssetBtn')?.addEventListener('click', deleteAsset);

// Trap closing event if backdrop wrapper clicked directly
document.getElementById('manageAssetModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'manageAssetModal') closeManageModal();
});

// Event delegation for manage asset triggers
document.getElementById('tenantGrid')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('asset-manage-trigger')) {
        const assetId = e.target.getAttribute('data-id');
        openManageModal(assetId);
    }
});

// Event delegation for WhatsApp reminders
document.getElementById('tenantGrid')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('whatsapp-reminder-btn')) {
        e.preventDefault();
        const phone = e.target.getAttribute('data-phone') || '';
        const name = e.target.getAttribute('data-name') || '';
        const property = e.target.getAttribute('data-property') || '';
        const unit = e.target.getAttribute('data-unit') || '';
        const balance = e.target.getAttribute('data-balance') || '0';

        if (!phone) {
            alert("No phone number registered for this tenant.");
            return;
        }

        // strip any spaces or leading zeros
        let cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = cleanPhone.substring(1);
        }
        // prepend country code (e.g. 234) if missing
        if (!cleanPhone.startsWith('234')) {
            cleanPhone = '234' + cleanPhone;
        }

        const message = `Hello ${name}, this is a rent update for ${property}, Unit ${unit}. Your remaining balance is ₦${Number(balance).toLocaleString()}.`;
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }
});


// Fire application launch sequence
document.addEventListener('DOMContentLoaded', appSetupEngine);