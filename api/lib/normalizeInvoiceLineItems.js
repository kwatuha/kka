/**
 * Keep invoice line unit price aligned with line total (fixes stale unitPrice after charge updates).
 * @param {object} item - Raw invoice_items row (may include joined fields)
 * @returns {object}
 */
function normalizeInvoiceLineItem(item) {
    if (!item || typeof item !== 'object') return item;

    const qty = Math.max(parseFloat(item.quantity) || 1, 1);
    const totalPrice = parseFloat(item.totalPrice);
    let unitPrice = parseFloat(item.unitPrice);

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
        return { ...item, quantity: qty };
    }

    if (!Number.isFinite(unitPrice)) {
        unitPrice = totalPrice / qty;
    } else {
        const lineFromUnit = unitPrice * qty;
        if (Math.abs(lineFromUnit - totalPrice) > 0.02) {
            unitPrice = Math.round((totalPrice / qty) * 100) / 100;
        }
    }

    return {
        ...item,
        quantity: qty,
        unitPrice,
        totalPrice,
    };
}

/**
 * @param {object[]} items
 * @returns {object[]}
 */
function normalizeInvoiceLineItems(items) {
    if (!Array.isArray(items)) return [];
    return items.map(normalizeInvoiceLineItem);
}

module.exports = {
    normalizeInvoiceLineItem,
    normalizeInvoiceLineItems,
};
