import React, { useEffect, useState } from 'react';
import { 
  Table, Button, DatePicker, Tabs, Card, Tag, Space, 
  Modal, Form, Input, Select, InputNumber, message, Alert, Badge 
} from 'antd';
import { 
  SafetyOutlined, 
  CalendarOutlined, 
  PlusOutlined, 
  CheckCircleOutlined,
  BellOutlined,
  TeamOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { 
  patrolApi, 
  securityZoneApi, 
  securityPersonnelApi, 
  crowdApi, 
  alarmApi 
} from '../api';
import type { 
  PatrolSchedule, 
  SecurityZone, 
  SecurityPersonnel, 
  CrowdData, 
  Alarm 
} from '../types';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Option } = Select;

const SecurityCenter: React.FC = () => {
  const [patrolSchedules, setPatrolSchedules] = useState<PatrolSchedule[]>([]);
  const [zones, setZones] = useState<SecurityZone[]>([]);
  const [personnel, setPersonnel] = useState<SecurityPersonnel[]>([]);
  const [crowdData, setCrowdData] = useState<CrowdData[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [crowdModalVisible, setCrowdModalVisible] = useState(false);
  const [crowdForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [patrolData, zonesData, personnelData, crowdDataList, alarmsData] = await Promise.all([
      patrolApi.getAll(),
      securityZoneApi.getAll(),
      securityPersonnelApi.getAll(),
      crowdApi.getLatest(),
      alarmApi.getAll()
    ]);
    setPatrolSchedules(patrolData);
    setZones(zonesData);
    setPersonnel(personnelData);
    setCrowdData(crowdDataList);
    setAlarms(alarmsData);
  };

  const handleGeneratePatrol = async () => {
    await patrolApi.generate(selectedDate.format('YYYY-MM-DD'));
    message.success('巡逻排班已生成');
    loadData();
  };

  const handleAddCrowdData = () => {
    crowdForm.resetFields();
    setCrowdModalVisible(true);
  };

  const handleSubmitCrowdData = async (values: any) => {
    const result = await crowdApi.add(values);
    if (result.anomaly) {
      message.warning('人流数据已录入，系统检测到异常并触发警报！');
    } else {
      message.success('人流数据已录入');
    }
    setCrowdModalVisible(false);
    loadData();
  };

  const handleAcknowledgeAlarm = async (id: number) => {
    await alarmApi.acknowledge(id);
    message.success('警报已确认');
    loadData();
  };

  const severityColor: Record<string, string> = {
    high: 'red',
    medium: 'orange',
    low: 'blue'
  };

  const alarmTypeText: Record<string, string> = {
    crowd_density: '人流密度过高',
    anomaly: '异常行为检测',
    evacuation: '疏散警报'
  };

  const patrolColumns = [
    { title: '巡逻区域', dataIndex: 'zone_name', key: 'zone_name' },
    { title: '安保人员', dataIndex: 'personnel_name', key: 'personnel_name' },
    { title: '开始时间', dataIndex: 'start_time', key: 'start_time', render: (t: string) => dayjs(t).format('MM-DD HH:mm') },
    { title: '结束时间', dataIndex: 'end_time', key: 'end_time', render: (t: string) => dayjs(t).format('MM-DD HH:mm') },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          scheduled: { color: 'blue', text: '已排期' },
          ongoing: { color: 'green', text: '进行中' },
          completed: { color: 'gray', text: '已完成' }
        };
        const s = config[status] || { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      }
    }
  ];

  const crowdColumns = [
    { title: '区域', dataIndex: 'zone_name', key: 'zone_name' },
    { title: '当前人数', dataIndex: 'people_count', key: 'people_count' },
    { title: '容量阈值', dataIndex: 'capacity_threshold', key: 'capacity_threshold' },
    { title: '使用率', key: 'utilization', render: (_: any, record: any) => {
      const pct = ((record.people_count / record.capacity_threshold) * 100).toFixed(1);
      return (
        <span style={{ color: Number(pct) > 90 ? '#ff4d4f' : Number(pct) > 70 ? '#faad14' : '#52c41a', fontWeight: 500 }}>
          {pct}%
        </span>
      );
    }},
    {
      title: '异常状态',
      dataIndex: 'anomaly_detected',
      key: 'anomaly_detected',
      render: (anomaly: boolean) => anomaly ? 
        <Tag color="red" icon={<ExclamationCircleOutlined />}>异常</Tag> : 
        <Tag color="green">正常</Tag>
    },
    { title: '更新时间', dataIndex: 'timestamp', key: 'timestamp', render: (t: string) => dayjs(t).format('MM-DD HH:mm:ss') }
  ];

  const alarmColumns = [
    { title: '区域', dataIndex: 'zone_name', key: 'zone_name' },
    { title: '警报类型', dataIndex: 'alarm_type', key: 'alarm_type', render: (t: string) => alarmTypeText[t] || t },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (s: string) => <Tag color={severityColor[s]}>{s === 'high' ? '高危' : s === 'medium' ? '中危' : '低危'}</Tag>
    },
    { title: '警报内容', dataIndex: 'message', key: 'message', ellipsis: true },
    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (t: string) => dayjs(t).format('MM-DD HH:mm') },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => status === 'active' ? 
        <Badge status="processing" text="活动中" /> : 
        <Badge status="default" text="已确认" />
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Alarm) => record.status === 'active' && (
        <Button type="primary" size="small" onClick={() => handleAcknowledgeAlarm(record.id)}>
          确认
        </Button>
      )
    }
  ];

  const personnelColumns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '职级', dataIndex: 'rank', key: 'rank' },
    { title: '联系电话', dataIndex: 'phone', key: 'phone' },
    { title: '当前区域', dataIndex: 'zone_name', key: 'zone_name' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          available: { color: 'green', text: '在岗' },
          on_patrol: { color: 'blue', text: '巡逻中' },
          off_duty: { color: 'gray', text: '休息' }
        };
        const s = config[status] || { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      }
    }
  ];

  const activeAlarms = alarms.filter(a => a.status === 'active');

  return (
    <div>
      {activeAlarms.length > 0 && (
        <Alert
          message={`当前有 ${activeAlarms.length} 个活动警报`}
          type="error"
          showIcon
          icon={<BellOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs defaultActiveKey="patrol">
        <TabPane tab="巡逻排班" key="patrol">
          <Card style={{ marginBottom: 16 }}>
            <Space>
              <DatePicker value={selectedDate} onChange={(d) => d && setSelectedDate(d)} />
              <Button type="primary" icon={<CalendarOutlined />} onClick={handleGeneratePatrol}>
                生成当日巡逻排班
              </Button>
            </Space>
          </Card>
          <Table columns={patrolColumns} dataSource={patrolSchedules} rowKey="id" />
        </TabPane>

        <TabPane tab="人流监控" key="crowd">
          <Card style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCrowdData}>
              录入人流数据
            </Button>
          </Card>
          <Table columns={crowdColumns} dataSource={crowdData} rowKey="id" />
        </TabPane>

        <TabPane tab="警报中心" key="alarms">
          <Table columns={alarmColumns} dataSource={alarms} rowKey="id" />
        </TabPane>

        <TabPane tab="安保人员" key="personnel">
          <Table columns={personnelColumns} dataSource={personnel} rowKey="id" />
        </TabPane>
      </Tabs>

      <Modal
        title="录入人流数据"
        open={crowdModalVisible}
        onCancel={() => setCrowdModalVisible(false)}
        footer={null}
        width={400}
      >
        <Form form={crowdForm} layout="vertical" onFinish={handleSubmitCrowdData}>
          <Form.Item name="zone_id" label="监控区域" rules={[{ required: true, message: '请选择区域' }]}>
            <Select placeholder="请选择区域">
              {zones.map(z => (
                <Option key={z.id} value={z.id}>{z.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="people_count" label="当前人数" rules={[{ required: true, message: '请输入人数' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCrowdModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">提交</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SecurityCenter;
