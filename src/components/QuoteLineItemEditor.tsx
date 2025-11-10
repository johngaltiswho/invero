'use client';

import React, { useState, useEffect } from 'react';

interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  line_order: number;
  notes?: string;
}

interface QuoteLineItemEditorProps {
  projectId: string;
  contractorId: string;
  onSaveSuccess?: () => void;
  isReadOnly?: boolean;
}

export default function QuoteLineItemEditor({ 
  projectId, 
  contractorId, 
  onSaveSuccess,
  isReadOnly = false 
}: QuoteLineItemEditorProps) {
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit: 'nos',
    rate: 0,
    notes: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch existing line items
  useEffect(() => {
    fetchLineItems();
  }, [projectId]);

  const fetchLineItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/quote-items?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setLineItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching line items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total amount
  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  // Add new line item
  const addLineItem = async () => {
    if (!newItem.description.trim()) return;

    try {
      setSaving(true);
      const response = await fetch('/api/quote-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          ...newItem,
          amount: newItem.quantity * newItem.rate,
          line_order: (lineItems.length + 1) * 10
        })
      });

      if (response.ok) {
        const result = await response.json();
        setLineItems(prev => [...prev, result.item]);
        setNewItem({ description: '', quantity: 1, unit: 'nos', rate: 0, notes: '' });
        setShowAddForm(false);
        onSaveSuccess?.();
      }
    } catch (error) {
      console.error('Error adding line item:', error);
    } finally {
      setSaving(false);
    }
  };

  // Delete line item
  const deleteLineItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this line item?')) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/quote-items?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setLineItems(prev => prev.filter(item => item.id !== id));
        onSaveSuccess?.();
      }
    } catch (error) {
      console.error('Error deleting line item:', error);
    } finally {
      setSaving(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-amber"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-primary">Quote Line Items</h3>
          <p className="text-sm text-secondary">
            Total: {formatCurrency(totalAmount)} • {lineItems.length} items
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-accent-amber text-neutral-dark rounded-lg hover:bg-accent-amber/90 transition-colors text-sm font-medium"
          >
            + Add Line Item
          </button>
        )}
      </div>

      {/* Add New Item Form */}
      {showAddForm && !isReadOnly && (
        <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-4">
          <h4 className="text-md font-medium text-primary mb-4">Add New Line Item</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary mb-2">Description</label>
              <input
                type="text"
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                placeholder="Enter description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">Quantity</label>
              <input
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">Unit</label>
              <select
                value={newItem.unit}
                onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
              >
                <option value="nos">Nos</option>
                <option value="sqm">Sqm</option>
                <option value="cum">Cum</option>
                <option value="kg">Kg</option>
                <option value="mt">MT</option>
                <option value="lm">LM</option>
                <option value="ls">LS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">Rate (₹)</label>
              <input
                type="number"
                value={newItem.rate}
                onChange={(e) => setNewItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary mb-2">Notes (Optional)</label>
              <input
                type="text"
                value={newItem.notes}
                onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                placeholder="Additional notes"
              />
            </div>
            <div className="flex items-end">
              <span className="text-lg font-semibold text-primary">
                {formatCurrency(newItem.quantity * newItem.rate)}
              </span>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={addLineItem}
              disabled={saving || !newItem.description.trim()}
              className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Adding...' : 'Add Item'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-neutral-medium text-primary rounded-lg hover:bg-neutral-medium/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Line Items Table */}
      <div className="bg-neutral-dark border border-neutral-medium rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-medium">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-primary">Description</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-primary">Qty</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-primary">Unit</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-primary">Rate</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-primary">Amount</th>
                {!isReadOnly && <th className="px-4 py-3 text-center text-sm font-medium text-primary">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-medium">
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 5 : 6} className="px-4 py-8 text-center text-secondary">
                    No line items added yet. Click "Add Line Item" to get started.
                  </td>
                </tr>
              ) : (
                lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-medium/20">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-primary font-medium">{item.description}</div>
                        {item.notes && (
                          <div className="text-sm text-secondary mt-1">{item.notes}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-primary">{item.quantity}</td>
                    <td className="px-4 py-3 text-center text-primary">{item.unit}</td>
                    <td className="px-4 py-3 text-right text-primary">{formatCurrency(item.rate)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">{formatCurrency(item.amount)}</td>
                    {!isReadOnly && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => deleteLineItem(item.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {lineItems.length > 0 && (
              <tfoot className="bg-neutral-medium">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-semibold text-primary">
                    Total Amount:
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-lg text-accent-amber">
                    {formatCurrency(totalAmount)}
                  </td>
                  {!isReadOnly && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}