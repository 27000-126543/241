import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, InputNumber, Space, message, Card, Alert, List } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  PlusOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { matchStatusApi, matchResultApi, scheduleApi, emergencyApi } from '../api';
import type { MatchStatus, MatchResult, Schedule, EmergencyIncident } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const MatchCenter: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [matchStatuses, setMatchStatuses] = useState<MatchStatus[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyIncident[]>([]);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [statusForm] = Form.useForm();
  const [resultForm] = Form.useForm();
  const [emergencyForm] = Form.useForm();
  const [results, setResults] = useState<MatchResult[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [schedulesData, statusesData, emergenciesData] = await Promise.all([
      scheduleApi.getAll(),
      matchStatusApi.getAll(),
      emergencyApi.getAll()
    ]);
    setSchedules(schedulesData.filter((s: any) => s.status === 'confirmed'));
    setMatchStatuses(statusesData);
    setEmergencies(emergenciesData.filter((e: any) => e.status === 'active'));
  };

  const getMatchStatus = (scheduleId: number) => {
    return matchStatuses.find((ms: any) => ms.schedule_id === scheduleId);
  };

  const handleUpdateStatus = (record: Schedule, status: string) => {
    setSelectedSchedule(record);
    statusForm.setFieldsValue({ status });
    setStatusModalVisible(true);
  };

  const handleSubmitStatus = async (values: any) => {
    const data: any = {
      schedule_id: selectedSchedule!.id,
      status: values.status,
      notes: values.notes
    };

    if (values.status === 'ongoing') {
      data.actual_start = dayjs().format('YYYY-MM-DD HH:mm:ss');
    } else if (values.status === 'completed') {
      data.actual_end = dayjs().format('YYYY-MM-DD HH:mm:ss');
    }

    if (values.status === 'interrupted') {
      data.emergency = {
        type: 'interruption',
        description: values.emergency_desc,
        severity: values.severity
      };
    }

    await matchStatusApi.update(data);
    message.success('状态已更新');
    setStatusModalVisible(false);
    loadData();
  };

  const handleAddResult = (record: Schedule) => {
    setSelectedSchedule(record);
    resultForm.resetFields();
    setResultModalVisible(true);
  };

  const handleSubmitResult = async (values: any) => {
    await matchResultApi.add({
      schedule_id: selectedSchedule!.id,
      ...values
    });
    message.success('成绩已录入');
    setResultModalVisible(false);
    loadResults(selectedSchedule!.id);
  };

  const loadResults = async (scheduleId: number) => {
    const data = await matchResultApi.getBySchedule(scheduleId);
    setResults(data);
  };

  const handleResolveEmergency = async (id: number) => {
    await emergencyApi.resolve(id);
    message.success('事件已解决');
    loadData();
  };

  const statusConfig: Record<string, { color: string; text: string; icon: any }> = {
    preparing: { color: 'blue', text: '准备中', icon: <PlayCircleOutlined /> },
    ongoing: { color: 'green', text: '进行中', icon: <PlayCircleOutlined /> },
    interrupted: { color: 'red', text: '已中断', icon: <PauseCircleOutlined /> },
    completed: { color: 'gray', text: '已结束', icon: <CheckCircleOutlined /> }
  };

  const columns = [
    { title: '赛事项目', dataIndex: 'event_name', key: 'event_name' },
    { title: '比赛场地', dataIndex: 'venue_name', key: 'venue_name' },
    { title: '裁判', dataIndex: 'referee_name', key: 'referee_name' },
    { title: '计划时间', dataIndex: 'start_time', key: 'start_time', render: (t: string) => dayjs(t).format('MM-DD HH:mm') },
    {
      title: '当前状态',
      key: 'status',
      render: (_: any, record: Schedule) => {
        const ms = getMatchStatus(record.id);
        if (ms) {
          const s = statusConfig[ms.status] || { color: 'default', text: ms.status, icon: null };
          return <Tag icon={s.icon} color={s.color}>{s.text}</Tag>;
        }
        return <Tag color="default">未开始</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Schedule) => {
        const ms = getMatchStatus(record.id);
        const currentStatus = ms?.status || 'preparing';

        return (
          <Space>
            {currentStatus === 'preparing' && (
              <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => handleUpdateStatus(record, 'ongoing')}>
                开始比赛
              </Button>
            )}
            {currentStatus === 'ongoing' && (
              <>
                <Button size="small" icon={<PauseCircleOutlined />} onClick={() => handleUpdateStatus(record, 'interrupted')} danger>
                  中断比赛
                </Button>
                <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleUpdateStatus(record, 'completed')}>
                  结束比赛
                </Button>
              </>
            )}
            {currentStatus === 'interrupted' && (
              <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => handleUpdateStatus(record, 'ongoing')}>
                恢复比赛
              </Button>
            )}
            {(currentStatus === 'ongoing' || currentStatus === 'completed') && (
              <Button size="small" icon={<PlusOutlined />} onClick={() => handleAddResult(record)}>
                录入成绩
              </Button>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <div>
      {emergencies.length > 0 && (
        <Alert
          message={`有 ${emergencies.length} 个紧急事件正在处理中`}
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 16 }}
          action={
            <Space>
              {emergencies.map(e => (
                <Button key={e.id} size="small" onClick={() => handleResolveEmergency(e.id)}>
                  标记已解决
                </Button>
              ))}
            </Space>
          }
        />
      )}

      <Card title="比赛状态管理" style={{ marginBottom: 16 }}>
        <Table columns={columns} dataSource={schedules} rowKey="id" />
      </Card>

      <Card title="成绩记录">
        {selectedSchedule ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <strong>{selectedSchedule.event_name}</strong> - {selectedSchedule.venue_name}
            </div>
            <Button icon={<PlusOutlined />} onClick={() => handleAddResult(selectedSchedule)}>
              添加成绩
            </Button>
            <Table
              style={{ marginTop: 16 }}
              dataSource={results}
              rowKey="id"
              columns={[
                { title: '排名', dataIndex: 'rank', key: 'rank', width: 80 },
                { title: '运动员', dataIndex: 'athlete_name', key: 'athlete_name' },
                { title: '成绩/得分', dataIndex: 'score', key: 'score' },
                { title: '犯规次数', dataIndex: 'fouls', key: 'fouls', width: 100 },
                { title: '备注', dataIndex: 'notes', key: 'notes' }
              ]}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
            请选择一个比赛查看成绩记录
          </div>
        )}
      </Card>

      <Modal
        title="更新比赛状态"
        open={statusModalVisible}
        onCancel={() => setStatusModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={statusForm} layout="vertical" onFinish={handleSubmitStatus}>
          <Form.Item name="status" label="比赛状态" rules={[{ required: true }]}>
            <Select>
              <Option value="preparing">准备中</Option>
              <Option value="ongoing">进行中</Option>
              <Option value="interrupted">中断</Option>
              <Option value="completed">已结束</Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
            {({ getFieldValue }) =>
              getFieldValue('status') === 'interrupted' && (
                <>
                  <Form.Item name="emergency_desc" label="异常描述" rules={[{ required: true }]}>
                    <TextArea rows={3} placeholder="请描述异常情况，如：运动员受伤、天气原因等" />
                  </Form.Item>
                  <Form.Item name="severity" label="严重程度" rules={[{ required: true }]}>
                    <Select>
                      <Option value="low">低</Option>
                      <Option value="medium">中</Option>
                      <Option value="high">高</Option>
                    </Select>
                  </Form.Item>
                </>
              )
            }
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <TextArea rows={2} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setStatusModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">确认</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="录入比赛成绩"
        open={resultModalVisible}
        onCancel={() => setResultModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={resultForm} layout="vertical" onFinish={handleSubmitResult}>
          <Form.Item name="athlete_name" label="运动员姓名" rules={[{ required: true }]}>
            <Input placeholder="请输入运动员姓名" />
          </Form.Item>
          <Form.Item name="rank" label="排名" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="score" label="成绩/得分">
            <Input placeholder="请输入成绩或得分" />
          </Form.Item>
          <Form.Item name="fouls" label="犯规次数">
            <InputNumber min={0} style={{ width: '100%' }} defaultValue={0} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setResultModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MatchCenter;
