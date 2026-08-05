import React, { useEffect, useState } from 'react';
import { Modal, Input, List, Typography, Space, Tag } from 'antd';
import { Sparkles, Command, Search, ShieldAlert, PackageCheck, FileSpreadsheet, DollarSign, History } from 'lucide-react';

const { Text } = Typography;

const QUICK_COMMANDS = [
  { icon: Search, title: "Search Available Diamonds", desc: "Find D-F color, VVS clarity round stock", prompt: "Show available 1.5ct+ Round diamonds D-F color VVS clarity" },
  { icon: ShieldAlert, title: "Show Hold Stones", desc: "List all stones currently placed on hold", prompt: "Show all stones currently on hold" },
  { icon: DollarSign, title: "Check Party Outstanding Summary", desc: "Aggregate total accounts receivable & payable", prompt: "Show company outstanding summary receivables and payables" },
  { icon: PackageCheck, title: "View Outward Memo Stock", desc: "List stones currently out on memo", prompt: "Show all stones currently out on memo" },
  { icon: History, title: "Check Stone Audit History", desc: "View movement timeline for SKU", prompt: "Show stone history for SKU " },
];

export default function AIAgentCommandBar({ open, onClose, onExecutePrompt }) {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose();
        else onExecutePrompt(null, true); // Toggle command modal
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, onExecutePrompt]);

  const filteredCommands = QUICK_COMMANDS.filter(cmd =>
    cmd.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cmd.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCommand = (cmd) => {
    onExecutePrompt(cmd.prompt);
    onClose();
    setSearchTerm('');
  };

  const handleCustomSubmit = () => {
    if (searchTerm.trim()) {
      onExecutePrompt(searchTerm.trim());
      onClose();
      setSearchTerm('');
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={560}
      style={{ top: '15%' }}
      bodyStyle={{ padding: '16px' }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 border-b pb-3">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <Input
            autoFocus
            bordered={false}
            placeholder="Type an AI command or question... (Press Esc to exit)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onPressEnter={handleCustomSubmit}
            style={{ fontSize: '15px' }}
          />
          <Tag color="cyan" className="font-mono text-xs">Cmd + K</Tag>
        </div>

        <List
          size="small"
          dataSource={filteredCommands}
          renderItem={(item) => (
            <List.Item
              className="cursor-pointer hover:bg-emerald-50 rounded px-2 py-2 transition-colors"
              onClick={() => handleSelectCommand(item)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded bg-slate-100 text-slate-600">
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <Text strong className="text-sm block">{item.title}</Text>
                  <Text type="secondary" className="text-xs">{item.desc}</Text>
                </div>
                <Command className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </List.Item>
          )}
        />
      </div>
    </Modal>
  );
}
