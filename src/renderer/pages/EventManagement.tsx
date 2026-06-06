import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { eventApi, venueApi } from '../api';
import type { Event, Venue } from '../types';

const { Option } = Select;
const { TextArea } = Input;

const EventManagement: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [visible, setVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [eventsData, venuesData] = await Promise.all([
      eventApi.getAll(),
      venueApi.getAll()
    ]);
    setEvents(eventsData);
    setVenues(venuesData);
  };

  const handleAdd = () => {
    setEditingEvent(null);
    form.resetFields();
    setVisible(true);
  };

  const handleEdit = (record: Event) => {
    setEditingEvent(record);
    form.setFieldsValue(record);
    setVisible(true);
  };

  const handleDelete = async (id: number) => {
    await eventApi.delete(id);
    message.success('删除成功');
    loadData();
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (editingEvent) {
        await eventApi.update({ ...values, id: editingEvent.id });
        message.success('更新成功');
      } else {
        await eventApi.create(values);
        message.success('创建成功');
      }
      setVisible(false);
      loadData();
    } catch (error) {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '项目名称', dataIndex: 'name', key: 'name' },
    { title: '比赛场地', dataIndex: 'venue_name', key: 'venue_name' },
    { title: '参赛人数', dataIndex: 'participant_count', key: 'participant_count' },
    { title: '预计时长(分钟)', dataIndex: 'estimated_duration', key: 'estimated_duration' },
    { 
      title: '安保等级', 
      dataIndex: 'security_level', 
      key: 'security_level',
      render: (level: number) => `Level ${level}`
    },
    { title: '所需设备', dataIndex: 'required_equipment', key: 'required_equipment', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'gold', text: '待排期' },
          scheduled: { color: 'blue', text: '已排期' },
          completed: { color: 'green', text: '已完成' }
        };
        const s = statusMap[status] || { color: 'default', text: status };
        return <span style={{ color: s.color, fontWeight: 500 }}>{s.text}</span>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Event) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增赛事项目
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={events}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title={editingEvent ? '编辑赛事项目' : '新增赛事项目'}
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="请输入项目名称" />
          </Form.Item>

          <Form.Item name="venue_id" label="比赛场地" rules={[{ required: true, message: '请选择比赛场地' }]}>
            <Select placeholder="请选择比赛场地">
              {venues.map(v => (
                <Option key={v.id} value={v.id}>{v.name} (容量: {v.capacity})</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="participant_count" label="参赛人数" rules={[{ required: true, message: '请输入参赛人数' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入参赛人数" />
          </Form.Item>

          <Form.Item name="estimated_duration" label="预计时长(分钟)" rules={[{ required: true, message: '请输入预计时长' }]}>
            <InputNumber min={10} step={5} style={{ width: '100%' }} placeholder="请输入预计时长" />
          </Form.Item>

          <Form.Item name="security_level" label="安保等级" rules={[{ required: true, message: '请选择安保等级' }]}>
            <Select placeholder="请选择安保等级">
              <Option value={1}>Level 1 - 基础</Option>
              <Option value={2}>Level 2 - 中级</Option>
              <Option value={3}>Level 3 - 高级</Option>
            </Select>
          </Form.Item>

          <Form.Item name="required_equipment" label="所需设备">
            <TextArea rows={3} placeholder="请输入所需设备，多个用逗号分隔" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={loading}>确定</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EventManagement;
