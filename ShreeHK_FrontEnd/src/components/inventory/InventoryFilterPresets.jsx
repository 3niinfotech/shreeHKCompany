import React, { useEffect, useState } from "react";
import { Space, Select, Input, Button, Popconfirm } from "antd";
import { SaveOutlined, DeleteOutlined } from "@ant-design/icons";
import useAuthStore from "../../store/Auth.Store";
import {
  loadFilterPresets,
  saveFilterPreset,
  deleteFilterPreset,
} from "../../utils/inventoryFilterPresets";

/**
 * Save / load advanced filter presets (localStorage per user + page).
 */
const InventoryFilterPresets = ({ pageKey, compactForm, advancedForm, onApply }) => {
  const userId = useAuthStore((s) => s.user?.user_id);
  const [presets, setPresets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    setPresets(loadFilterPresets(pageKey, userId));
  }, [pageKey, userId]);

  const handleSave = () => {
    const values = {
      compact: compactForm?.getFieldsValue?.() || {},
      advanced: advancedForm?.getFieldsValue?.() || {},
    };
    const next = saveFilterPreset(pageKey, userId, presetName, values);
    setPresets(next);
    setPresetName("");
  };

  const handleApply = (presetId) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedId(presetId);
    compactForm?.setFieldsValue?.(preset.values?.compact || {});
    advancedForm?.setFieldsValue?.(preset.values?.advanced || {});
    onApply?.(preset.values);
  };

  const handleDelete = (presetId) => {
    const next = deleteFilterPreset(pageKey, userId, presetId);
    setPresets(next);
    if (selectedId === presetId) setSelectedId(null);
  };

  return (
    <Space wrap size={8} style={{ marginBottom: 8 }}>
      <Select
        allowClear
        placeholder="Saved views"
        style={{ minWidth: 160 }}
        value={selectedId}
        options={presets.map((p) => ({ label: p.name, value: p.id }))}
        onChange={(id) => (id ? handleApply(id) : setSelectedId(null))}
      />
      <Input
        placeholder="View name"
        value={presetName}
        onChange={(e) => setPresetName(e.target.value)}
        style={{ width: 140 }}
      />
      <Button size="small" icon={<SaveOutlined />} onClick={handleSave} disabled={!presetName.trim()}>
        Save View
      </Button>
      {selectedId ? (
        <Popconfirm title="Delete this saved view?" onConfirm={() => handleDelete(selectedId)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ) : null}
    </Space>
  );
};

export default InventoryFilterPresets;
