import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Tabs, Modal, Form, Input, Select, Space, message, Popconfirm } from 'antd';
import { CheckOutlined, EditOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { taskApi, taskAdjustmentApi } from '../api';
import type { Task, TaskAdjustment } from '../types';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

const TaskManagement: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [adjustments, setAdjustments] = useState<TaskAdjustment[]>([]);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedAdjustment, setSelectedAdjustment] = useState<TaskAdjustment | null>(null);
  const [adjustForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [tasksData, adjustmentsData] = await Promise.all([
      taskApi.getAll(),
      taskAdjustmentApi.getAll()
    ]);
    setTasks(tasksData);
    setAdjustments(adjustmentsData);
  };

  const handleConfirmTask = async (id: number) => {
    await taskApi.confirm(id);
    message.success('任务已确认');
    loadData();
  };

  const handleRequestAdjustment = (record: Task) => {
    setSelectedTask(record);
    adjustForm.resetFields();
    setAdjustModalVisible(true);
  };

  const handleSubmitAdjustment = async (values: any) => {
    await taskApi.requestAdjustment({
      task_id: selectedTask!.id,
      applicant_id: 1,
      reason: values.reason,
      proposed_changes: values.proposed_changes
    });
    message.success('调整申请已提交');
    setAdjustModalVisible(false);
    loadData();
  };

  const handleReview = (record: TaskAdjustment) => {
    setSelectedAdjustment(record);
    reviewForm.resetFields();
    setReviewModalVisible(true);
  };

  const handleSubmitReview = async (values: any) => {
    await taskAdjustmentApi.review({
      id: selectedAdjustment!.id,
      status: values.status,
      reviewed_by: 1,
      review_note: values.review_note
    });
    message.success('审核完成');
    setReviewModalVisible(false);
    loadData();
  };

  const taskTypeText: Record<string, string> = {
    officiate: '裁判执裁',
    venue_prep: '场馆准备',
    security_duty: '安保任务'
  };

  const assigneeTypeText: Record<string, string> = {
    referee: '裁判',
    venue_manager: '场馆管理员',
    security: '安保人员'
  };

  const taskColumns = [
    { title: '任务类型', dataIndex: 'task_type', key: 'task_type', render: (t: string) => taskTypeText[t] || t },
    { title: '执行人类型', dataIndex: 'assignee_type', key: 'assignee_type', render: (t: string) => assigneeTypeText[t] || t },
    { title: '执行人', dataIndex: 'assignee_name', key: 'assignee_name' },
    { title: '相关赛事', dataIndex: 'event_name', key: 'event_name' },
    { title: '场地', dataIndex: 'venue_name', key: 'venue_name' },
    { title: '时间', dataIndex: 'start_time', key: 'start_time', render: (t: string) => dayjs(t).format('MM-DD HH:mm') },
    { title: '任务描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          pending: { color: 'gold', text: '待确认' },
          confirmed: { color: 'blue', text: '已确认' },
          completed: { color: 'green', text: '已完成' }
        };
        const s = config[status] || { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Task) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => handleConfirmTask(record.id)}>
                确认
              </Button>
              <Button size="small" icon={<EditOutlined />} onClick={() => handleRequestAdjustment(record)}>
                申请调整
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  const adjustmentColumns = [
    { title: '申请人', dataIndex: 'assignee_name', key: 'assignee_name' },
    { title: '原任务', dataIndex: 'task_description', key: 'task_description', ellipsis: true },
    { title: '调整原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: '调整建议', dataIndex: 'proposed_changes', key: 'proposed_changes', ellipsis: true },
    { title: '申请时间', dataIndex: 'created_at', key: 'created_at', render: (t: string) => dayjs(t).format('MM-DD HH:mm') },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          pending: { color: 'gold', text: '待审批' },
          approved: { color: 'green', text: '已批准' },
          rejected: { color: 'red', text: '已拒绝' }
        };
        const s = config[status] || { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: TaskAdjustment) => (
        record.status === 'pending' && (
          <Button type="primary" size="small" onClick={() => handleReview(record)}>
            审核
          </Button>
        )
      )
    }
  ];

  return (
    <div>
      <Tabs defaultActiveKey="tasks">
        <TabPane tab="任务列表" key="tasks">
          <Table columns={taskColumns} dataSource={tasks} rowKey="id" />
        </TabPane>
        <TabPane tab="调整审批" key="adjustments">
          <Table columns={adjustmentColumns} dataSource={adjustments} rowKey="id" />
        </TabPane>
      </Tabs>

      <Modal
        title="申请任务调整"
        open={adjustModalVisible}
        onCancel={() => setAdjustModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={adjustForm} layout="vertical" onFinish={handleSubmitAdjustment}>
          <Form.Item name="reason" label="调整原因" rules={[{ required: true, message: '请输入调整原因' }]}>
            <TextArea rows={3} placeholder="请输入调整原因" />
          </Form.Item>
          <Form.Item name="proposed_changes" label="调整建议" rules={[{ required: true, message: '请输入调整建议' }]}>
            <TextArea rows={3} placeholder="请输入具体的调整建议" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAdjustModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">提交申请</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="审核调整申请"
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={reviewForm} layout="vertical" onFinish={handleSubmitReview}>
          <Form.Item name="status" label="审核结果" rules={[{ required: true, message: '请选择审核结果' }]}>
            <Select placeholder="请选择">
              <Option value="approved">批准</Option>
              <Option value="rejected">拒绝</Option>
            </Select>
          </Form.Item>
          <Form.Item name="review_note" label="审核意见">
            <TextArea rows={3} placeholder="请输入审核意见" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setReviewModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">提交审核</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskManagement;
