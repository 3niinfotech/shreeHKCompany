import React, { useEffect, useState } from "react";
import { Select, Input, Button, Popconfirm } from "antd";
import { SaveOutlined, DeleteOutlined } from "@ant-design/icons";
import useAuthStore from "../../store/Auth.Store";
import {
  loadFilterPresets,
  saveFilterPreset,
  deleteFilterPreset,
} from "../../utils/inventoryFilterPresets";
import styles from "../../assets/scss/components/inventoryFilterPanel.module.scss";

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
    <div className={styles.filterPresetsRow}>
      <Select
        allowClear
        placeholder="Saved views"
        className={styles.filterPresetSelect}
        value={selectedId}
        options={presets.map((p) => ({ label: p.name, value: p.id }))}
        onChange={(id) => (id ? handleApply(id) : setSelectedId(null))}
      />
      <Input
        placeholder="View name"
        value={presetName}
        onChange={(e) => setPresetName(e.target.value)}
        className={styles.filterPresetInput}
        onPressEnter={() => {
          if (presetName.trim()) handleSave();
        }}
      />
      <Button
        type="primary"
        icon={<SaveOutlined />}
        onClick={handleSave}
        disabled={!presetName.trim()}
        className={styles.filterPresetSaveBtn}
      >
        Save View
      </Button>
      {selectedId ? (
        <Popconfirm title="Delete this saved view?" onConfirm={() => handleDelete(selectedId)}>
          <Button size="middle" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ) : null}
    </div>
  );
};

export default InventoryFilterPresets;
