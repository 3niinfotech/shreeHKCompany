import React, { useEffect, useState } from 'react';
import { Modal, Input, List, Typography, Space, Tag, Button } from 'antd';
import { Sparkles, Command, Search, ShieldAlert, PackageCheck, FileSpreadsheet, DollarSign, History, AlertTriangle, CheckCircle2 } from 'lucide-react';

const { Text } = Typography;

const QUICK_COMMANDS = [
  { icon: Search, title: "Search Available Diamonds", desc: "Find D-F color, VVS clarity round stock", prompt: "Show available 1.5ct+ Round diamonds D-F color VVS clarity", requiresConfirmation: false },
  { icon: ShieldAlert, title: "Show Hold Stones", desc: "List all stones currently placed on hold", prompt: "Show all stones currently on hold", requiresConfirmation: false },
  { icon: DollarSign, title: "Check Party Outstanding Summary", desc: "Aggregate total accounts receivable & payable", prompt: "Show company outstanding summary receivables and payables", requiresConfirmation: false },
  { icon: PackageCheck, title: "View Outward Memo Stock", desc: "List stones currently out on memo", prompt: "Show all stones currently out on memo", requiresConfirmation: false },
  { icon: History, title: "Check Stone Audit History", desc: "View movement timeline for SKU", prompt: "Show stone history for SKU ", requiresConfirmation: false },
  { icon: FileSpreadsheet, title: "Draft Inward Entry Action", desc: "Trigger guided wizard for new stock import", prompt: "Action: Create new stock inward entry wizard", requiresConfirmation: true },
];
    ``
export default function AIAgentCommandBar({ open, onClose, onExecutePrompt }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingCommand, setPendingCommand] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose();
        else onExecutePrompt(null, true);
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
    if (cmd.requiresConfirmation) {
      setPendingCommand(cmd);
    } else {
      onExecutePrompt(cmd.prompt);
      onClose();
      setSearchTerm('');
    }
  };

  const confirmPendingAction = () => {
    if (pendingCommand) {
      onExecutePrompt(pendingCommand.prompt);
      setPendingCommand(null);
      onClose();
      setSearchTerm('');
    }
  };

  const handleCustomSubmit = () => {
    if (searchTerm.trim()) {
      onExecutePrompt(searchTerm.trim());
      onClose();
      setSearchTerm('');
    }
  };

  return (
    <>
      <Modal
        open={open && !pendingCommand}
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
                  {item.requiresConfirmation && <Tag color="orange" className="text-[10px]">Action</Tag>}
                  <Command className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </List.Item>
            )}
          />
        </div>
      </Modal>

      {/* Confirmation Modal for Executing Actions */}
      <Modal
        open={Boolean(pendingCommand)}
        onCancel={() => setPendingCommand(null)}
        footer={null}
        width={420}
        title={
          <Space>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <Text strong>Confirm AI Command Action</Text>
          </Space>
        }
      >
        <div className="py-2 flex flex-col gap-3">
          <Text type="secondary" className="text-sm">
            Are you sure you want to execute the following AI command?
          </Text>
          <div className="p-3 bg-slate-50 border rounded text-xs font-mono">
            {pendingCommand?.prompt}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button onClick={() => setPendingCommand(null)}>Cancel</Button>
            <Button type="primary" icon={<CheckCircle2 className="w-4 h-4 inline" />} onClick={confirmPendingAction} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
              Confirm & Execute
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
