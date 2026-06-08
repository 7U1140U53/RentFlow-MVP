// RentFlow MVP Database Functions
import { supabase } from './config.js';

/**
 * Extracts the complete portfolio inventory sorted by property names
 */
export async function getAllTenancies() {
    const { data, error } = await supabase
        .from('tenancies')
        .order('property_name', { ascending: true });

    if (error) {
        console.error("Database query exception on getAllTenancies execution:", error.message);
        return [];
    }
    return data || [];
}

/**
 * Creates a brand-new asset configuration profile.
 * Automatically handles the exact 365-day Nigerian year-to-year contract end timeline assignment.
 */
export async function createNewTenancy(payload) {
    const startDate = new Date(payload.lease_start_date);

    // Calculate the precise 1-year operational wrapping threshold natively
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 365);

    const fullyFormedPayload = {
        user_id: payload.user_id,
        property_name: payload.property_name,
        unit_number: payload.unit_number,
        tenant_name: payload.tenant_name || 'Vacant Unit',
        tenant_phone: payload.tenant_phone || '',
        annual_rent: parseFloat(payload.annual_rent) || 0,
        lease_start_date: payload.lease_start_date,
        lease_end_date: endDate.toISOString().split('T')[0] // Matches wExpiryDate / ui.js countdowns
    };

    const { data, error } = await supabase
        .from('tenancies')
        .insert([fullyFormedPayload])
        .select();

    if (error) {
        throw new Error(`Data write exception committed by cloud pipeline: ${error.message}`);
    }
    return data[0];
}

/**
 * Commits partial updates directly to an existing asset row
 */
export async function updateTenancy(id, updatePayload) {
    const { data, error } = await supabase
        .from('tenancies')
        .update(updatePayload)
        .eq('id', id)
        .select();

    if (error) {
        throw new Error(`Failed to update asset registry record: ${error.message}`);
    }
    return data[0];
}

/**
 * Executes a hard delete operation against an asset profile row
 */
export async function deleteTenancy(id) {
    const { error } = await supabase
        .from('tenancies')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Data erasure protocol rejected by database constraints: ${error.message}`);
    }
    return true;
}

/**
 * Automatically creates a base invoice ledger row for a newly onboarded tenancy
 */
export async function createInvoice(tenancyId, totalAmount, userId) {
    const { data, error } = await supabase
        .from('invoices')
        .insert([
            {
                user_id: userId,
                asset_id: tenancyId,      // Matches main.js mapping requirement
                total_rent: totalAmount,  // FIXED: Changed from total_amount to match main.js columns
                amount_paid: 0,
                balance_due: totalAmount,
                status: 'Unpaid'
            }
        ])
        .select();

    if (error) {
        throw new Error(`Failed to initialize financial ledger row: ${error.message}`);
    }
    return data[0];
}

/**
 * Retrieves the financial invoice record linked to a specific tenancy ID
 */
export async function getInvoiceByTenancy(tenancyId) {
    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('asset_id', tenancyId)
        .maybeSingle();

    if (error) {
        throw new Error(`Error fetching financial records: ${error.message}`);
    }
    return data;
}

/**
 * Processes incoming rental payments, updates balances, and computes active billing state
 */
export async function updateInvoicePayment(invoiceId, currentAmountPaid, currentTotalAmount, newPaymentField) {
    const totalPaid = Number(currentAmountPaid) + Number(newPaymentField);
    const balanceDue = Number(currentTotalAmount) - totalPaid;

    let dynamicStatus = 'Unpaid';
    if (balanceDue <= 0) {
        dynamicStatus = 'Paid';
    } else if (totalPaid > 0) {
        dynamicStatus = 'Partially Paid';
    }

    const { data, error } = await supabase
        .from('invoices')
        .update({
            amount_paid: totalPaid,
            balance_due: balanceDue < 0 ? 0 : balanceDue,
            status: dynamicStatus
        })
        .eq('id', invoiceId)
        .select();

    if (error) {
        throw new Error(`Payment processing execution failed: ${error.message}`);
    }
    return data[0];
}

/**
 * Retrieves all invoices in the database
 */
export async function getAllInvoices() {
    const { data, error } = await supabase
        .from('invoices')
        .select('*');

    if (error) {
        console.error("Database query exception on getAllInvoices execution:", error.message);
        return [];
    }
    return data || [];
}