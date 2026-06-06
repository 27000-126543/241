import React, { useEffect, useState } from 'react';
import { 
  Table, Button, Tabs, Card, Tag, Space, 
  Modal, Form, Select, Input, message, Progress 
} from 'antd';
import { 
  ToolOutlined, 
  ReloadOutlined, 
  CheckCircleOutlined,
  InboxOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { equipmentApi, maintenanceApi, sparePartApi } from '../api';
import type { Equipment, MaintenanceWorkOrder, SparePart } from '../types';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const EquipmentManagement: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceWorkOrder | null>(null);
  const [assignForm] = Form.useForm();
  const [completeForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [equipData, ordersData, partsData] = await Promise.all([
      equipmentApi.getAll(),
      maintenanceApi.getWorkOrders(),
      sparePartApi.getAll()
    ]);
    setEquipment(equipData);
    setWorkOrders(ordersData);
    setSpareParts(partsData);
  };

  const handleGenerateWorkOrders = async () => {
    const result = await maintenanceApi.generateWorkOrders();
    if (result.length > 0) {
      message.success(`已生成 ${result.length} 个维保工单`);
    } else {
      message.info('暂无需要维保的设备');
    }
    loadData();
  };

  const handleAssign = (record: MaintenanceWorkOrder) => {
    setSelectedOrder(record);
    assignForm.resetFields();
    setAssignModalVisible(true);
  };

  const handleSubmitAssign = async (values: any) => {
    await maintenanceApi.assignTeam({ id: selectedOrder!.id, team: values.team });
    message.success('班组已分配');
    setAssignModalVisible(false);
    loadData();
  };

  const handleComplete = (record: MaintenanceWorkOrder) => {
    setSelectedOrder(record);
    completeForm.resetFields();
    setCompleteModalVisible(true);
  };

  const handleSubmitComplete = async (values: any) => {
    const partsUsed = values.parts_used ? JSON.parse(values.parts_used) : [];
    await maintenanceApi.complete({ 
      id: selectedOrder!.id, 
      parts_used: JSON.stringify(partsUsed) 
    });
    message.success('维保工单已完成');
    setCompleteModalVisible(false);
    loadData();
  };

  const equipmentStatusConfig: Record<string, { color: string; text: string }> = {
    normal: { color: 'green', text: '正常' },
    needs_maintenance: { color: 'orange', text: '需维保' },
    maintenance: { color: 'blue', text: '维保中' },
    faulty: { color: 'red', text: '故障' }
  };

  const priorityColor: Record<string, string> = {
    high: 'red',
    medium: 'orange',
    low: 'blue'
  };

  const equipmentColumns = [
    { title: '设备名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type' },
    { title: '所属场馆', dataIndex: 'venue_name', key: 'venue_name' },
    {
      title: '使用时长',
      dataIndex: 'usage_hours',
      key: 'usage_hours',
      render: (hours: number) => (
        <div>
          <span>{hours} 小时</span>
          <Progress 
            percent={Math.min((hours / 1000) * 100, 100)} 
            size="small" 
            status={hours >= 500 ? 'exception' : hours >= 300 ? 'active' : undefined}
            style={{ marginTop: 4 }}
          />
        </div>
      )
    },
    { title: '上次维保', dataIndex: 'last_maintenance', key: 'last_maintenance', render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const s = equipmentStatusConfig[status] || { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      }
    }
  ];

  const workOrderColumns = [
    { title: '设备名称', dataIndex: 'equipment_name', key: 'equipment_name' },
    { title: '所属场馆', dataIndex: 'venue_name', key: 'venue_name' },
    { title: '问题描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (p: string) => <Tag color={priorityColor[p]}>{p === 'high' ? '高' : p === 'medium' ? '中' : '低'}</Tag>
    },
    { title: '分配班组', dataIndex: 'assigned_team', key: 'assigned_team', render: (t: string) => t || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          pending: { color: 'gold', text: '待分配' },
          assigned: { color: 'blue', text: '已分配' },
          completed: { color: 'green', text: '已完成' }
        };
        const s = config[status] || { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      }
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (t: string) => dayjs(t).format('MM-DD HH:mm') },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: MaintenanceWorkOrder) => (
        <Space>
          {record.status === 'pending' && (
            <Button type="primary" size="small" onClick={() => handleAssign(record)}>
              分配班组
            </Button>
          )}
          {record.status === 'assigned' && (
            <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleComplete(record)}>
              完成维保
            </Button>
          )}
        </Space>
      )
    }
  ];

  const partsColumns = [
    { title: '备件名称', dataIndex: 'name', key: 'name' },
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    {
      title: '库存数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (q: number, record: SparePart) => (
        <span style={{ color: q < record.min_stock ? '#ff4d4f' : '#52c41a', fontWeight: 500 }}>
          {q}
        </span>
      )
    },
    { title: '最低库存', dataIndex: 'min_stock', key: 'min_stock' },
    {
      title: '库存状态',
      key: 'stock_status',
      render: (_: any, record: SparePart) => record.quantity < record.min_stock ?
        <Tag color="red" icon={<WarningOutlined />}>库存不足</Tag> :
        <Tag color="green">正常</Tag>
    }
  ];

  const needsMaintenanceCount = equipment.filter(e => e.status === 'needs_maintenance').length;

  return (
    <div>
      {needsMaintenanceCount > 0 && (
        <Card style={{ marginBottom: 16, borderColor: '#faad14' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <WarningOutlined style={{ color: '#faad14', fontSize: 20, marginRight: 8 }} />
              <span style={{ fontSize: 16, fontWeight: 500 }}>
                有 {needsMaintenanceCount} 台设备需要维保
              </span>
            </div>
            <Button type="primary" onClick={handleGenerateWorkOrders}>
              生成维保工单
            </Button>
          </div>
        </Card>
      )}

      <Tabs defaultActiveKey="equipment">
        <TabPane tab="设备列表" key="equipment">
          {needsMaintenanceCount === 0 && (
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
              <Button icon={<ReloadOutlined />} onClick={handleGenerateWorkOrders}>
                检查并生成维保工单
              </Button>
            </div>
          )}
          <Table columns={equipmentColumns} dataSource={equipment} rowKey="id" />
        </TabPane>

        <TabPane tab="维保工单" key="workorders">
          <Table columns={workOrderColumns} dataSource={workOrders} rowKey="id" />
        </TabPane>

        <TabPane tab="备件库存" key="parts">
          <Table columns={partsColumns} dataSource={spareParts} rowKey="id" />
        </TabPane>
      </Tabs>

      <Modal
        title="分配维修班组"
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={null}
        width={400}
      >
        <Form form={assignForm} layout="vertical" onFinish={handleSubmitAssign}>
          <Form.Item name="team" label="维修班组" rules={[{ required: true, message: '请选择班组' }]}>
            <Select placeholder="请选择维修班组">
              <Option value="team_a">维修一组</Option>
              <Option value="team_b">维修二组</Option>
              <Option value="team_c">维修三组</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAssignModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">确认分配</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="完成维保"
        open={completeModalVisible}
        onCancel={() => setCompleteModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={completeForm} layout="vertical" onFinish={handleSubmitComplete}>
          <Form.Item name="parts_used" label="使用备件（JSON格式）">
            <TextArea 
              rows={4} 
              placeholder='[{"id": 1, "quantity": 2}, {"id": 2, "quantity": 1}]' 
            />
          </Form.Item>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
            可用备件: {spareParts.map(p => `${p.name}(ID:${p.id})`).join(', ')}
          </div>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCompleteModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">确认完成</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EquipmentManagement;
