"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Edit2, Plus, Save, X, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Material {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  current_price: number;
}

interface MaterialMapping {
  id: string;
  project_id: string;
  boq_item_description: string;
  material_id: string;
  suggested_quantity: number;
  actual_quantity?: number;
  unit_cost: number;
  total_cost: number;
  status: 'ai_suggested' | 'user_modified' | 'approved' | 'rejected';
  confidence_score?: number;
  ai_reasoning?: string;
  modification_reason?: string;
  materials?: Material;
}

interface MaterialMappingsManagerProps {
  projectId: string;
}

export default function MaterialMappingsManager({ projectId }: MaterialMappingsManagerProps) {
  const [mappings, setMappings] = useState<MaterialMapping[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMapping, setEditingMapping] = useState<MaterialMapping | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMapping, setNewMapping] = useState({
    boq_item_description: '',
    material_id: '',
    suggested_quantity: 0,
    actual_quantity: 0,
    unit_cost: 0
  });

  // Fetch material mappings
  const fetchMappings = async () => {
    try {
      const response = await fetch(`/api/material-mappings?project_id=${projectId}`);
      const result = await response.json();
      
      if (result.success) {
        setMappings(result.data);
      } else {
        toast.error('Failed to fetch material mappings');
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
      toast.error('Error loading material mappings');
    }
  };

  // Fetch available materials
  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/materials');
      const result = await response.json();
      
      if (result.success) {
        setMaterials(result.data);
      } else {
        toast.error('Failed to fetch materials');
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Error loading materials');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMappings(), fetchMaterials()]);
      setLoading(false);
    };
    loadData();
  }, [projectId]);

  // Update mapping
  const updateMapping = async (mapping: MaterialMapping, updates: Partial<MaterialMapping>) => {
    try {
      const response = await fetch('/api/material-mappings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: mapping.id,
          ...updates
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Material mapping updated successfully');
        fetchMappings(); // Refresh data
        setEditingMapping(null);
      } else {
        toast.error('Failed to update material mapping');
      }
    } catch (error) {
      console.error('Error updating mapping:', error);
      toast.error('Error updating material mapping');
    }
  };

  // Add new mapping
  const addMapping = async () => {
    try {
      const response = await fetch('/api/material-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          ...newMapping
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Material mapping added successfully');
        fetchMappings(); // Refresh data
        setShowAddDialog(false);
        setNewMapping({
          boq_item_description: '',
          material_id: '',
          suggested_quantity: 0,
          actual_quantity: 0,
          unit_cost: 0
        });
      } else {
        toast.error('Failed to add material mapping');
      }
    } catch (error) {
      console.error('Error adding mapping:', error);
      toast.error('Error adding material mapping');
    }
  };

  // Delete mapping
  const deleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this material mapping?')) return;

    try {
      const response = await fetch(`/api/material-mappings?id=${mappingId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Material mapping deleted successfully');
        fetchMappings(); // Refresh data
      } else {
        toast.error('Failed to delete material mapping');
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast.error('Error deleting material mapping');
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ai_suggested': return 'secondary';
      case 'user_modified': return 'default';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  // Get confidence color
  const getConfidenceColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading material mappings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Material Mappings</CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Material Mapping</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="boq-description">BOQ Item Description</Label>
                  <Textarea
                    id="boq-description"
                    value={newMapping.boq_item_description}
                    onChange={(e) => setNewMapping(prev => ({ ...prev, boq_item_description: e.target.value }))}
                    placeholder="Enter BOQ item description"
                  />
                </div>
                <div>
                  <Label htmlFor="material">Material</Label>
                  <Select
                    value={newMapping.material_id}
                    onValueChange={(value) => {
                      const material = materials.find(m => m.id === value);
                      setNewMapping(prev => ({ 
                        ...prev, 
                        material_id: value,
                        unit_cost: material?.current_price || 0
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name} - ₹{material.current_price}/{material.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={newMapping.suggested_quantity}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, suggested_quantity: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit-cost">Unit Cost (₹)</Label>
                    <Input
                      id="unit-cost"
                      type="number"
                      value={newMapping.unit_cost}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addMapping}>
                    Add Mapping
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No material mappings found. Click "Add Material" to create one.
            </div>
          ) : (
            <div className="space-y-4">
              {mappings.map((mapping) => (
                <Card key={mapping.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* BOQ Item Info */}
                      <div>
                        <h4 className="font-medium text-sm text-gray-600 mb-1">BOQ Item</h4>
                        <p className="text-sm">{mapping.boq_item_description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={getStatusVariant(mapping.status)}>
                            {mapping.status.replace('_', ' ')}
                          </Badge>
                          {mapping.confidence_score && (
                            <span className={`text-xs ${getConfidenceColor(mapping.confidence_score)}`}>
                              {Math.round(mapping.confidence_score * 100)}% confidence
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Material Info */}
                      <div>
                        <h4 className="font-medium text-sm text-gray-600 mb-1">Material</h4>
                        <p className="text-sm font-medium">{mapping.materials?.name || 'Unknown Material'}</p>
                        <p className="text-xs text-gray-500">{mapping.materials?.category}</p>
                        <p className="text-xs text-gray-500">₹{mapping.unit_cost}/{mapping.materials?.unit}</p>
                      </div>

                      {/* Quantity & Cost */}
                      <div>
                        <h4 className="font-medium text-sm text-gray-600 mb-1">Quantity & Cost</h4>
                        {editingMapping?.id === mapping.id ? (
                          <div className="space-y-2">
                            <Input
                              type="number"
                              placeholder="Actual Quantity"
                              value={editingMapping.actual_quantity || editingMapping.suggested_quantity}
                              onChange={(e) => setEditingMapping(prev => prev ? { 
                                ...prev, 
                                actual_quantity: parseFloat(e.target.value) || 0 
                              } : null)}
                              className="h-8"
                            />
                            <Input
                              type="number"
                              placeholder="Unit Cost"
                              value={editingMapping.unit_cost}
                              onChange={(e) => setEditingMapping(prev => prev ? { 
                                ...prev, 
                                unit_cost: parseFloat(e.target.value) || 0 
                              } : null)}
                              className="h-8"
                            />
                            <Textarea
                              placeholder="Reason for modification (optional)"
                              value={editingMapping.modification_reason || ''}
                              onChange={(e) => setEditingMapping(prev => prev ? { 
                                ...prev, 
                                modification_reason: e.target.value 
                              } : null)}
                              className="h-16 text-xs"
                            />
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                onClick={() => updateMapping(mapping, {
                                  actual_quantity: editingMapping.actual_quantity,
                                  unit_cost: editingMapping.unit_cost,
                                  modification_reason: editingMapping.modification_reason,
                                  status: 'user_modified'
                                })}
                                className="h-7"
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setEditingMapping(null)}
                                className="h-7"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-sm">
                              <span className="text-gray-500">Suggested: </span>
                              {mapping.suggested_quantity} {mapping.materials?.unit}
                            </div>
                            {mapping.actual_quantity && (
                              <div className="text-sm font-medium">
                                <span className="text-gray-500">Actual: </span>
                                {mapping.actual_quantity} {mapping.materials?.unit}
                              </div>
                            )}
                            <div className="text-sm font-bold">
                              Total: ₹{mapping.total_cost?.toLocaleString()}
                            </div>
                            <div className="flex gap-1 mt-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setEditingMapping(mapping)}
                                className="h-7"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateMapping(mapping, { status: 'approved' })}
                                className="h-7"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => deleteMapping(mapping.id)}
                                className="h-7"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Reasoning */}
                    {mapping.ai_reasoning && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                        <span className="font-medium">AI Reasoning: </span>
                        {mapping.ai_reasoning}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{mappings.length}</div>
              <div className="text-sm text-gray-500">Total Mappings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {mappings.filter(m => m.status === 'ai_suggested').length}
              </div>
              <div className="text-sm text-gray-500">AI Suggested</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {mappings.filter(m => m.status === 'user_modified').length}
              </div>
              <div className="text-sm text-gray-500">User Modified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {mappings.filter(m => m.status === 'approved').length}
              </div>
              <div className="text-sm text-gray-500">Approved</div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded">
            <div className="text-lg font-bold">
              Total Estimated Cost: ₹{mappings.reduce((sum, m) => sum + (m.total_cost || 0), 0).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}