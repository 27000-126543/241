import React, { useEffect, useState } from 'react';
import { Table, Button, DatePicker, Space, Tag, message, Card } from 'antd';
import { ReloadOutlined, CheckCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { scheduleApi } from '../api';
import type { Schedule } from '../types';
import dayjs, { Dayjs } from 'dayjs';

const ScheduleManagement: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    const data = await scheduleApi.getAll();
    setSchedules(data);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await scheduleApi.generate(selectedDate.format('YYYY-MM-DD'));
      message.success('赛程生成成功');
      loadSchedules();
    } catch (error) {
      message.error('生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirm = async (id: number) => {
    setConfirming(id);
    try {
      await scheduleApi.confirm(id);
      message.success('赛程已确认，任务已推送');
      loadSchedules();
    } catch (error) {
      message.error('确认失败');
    } finally {
      setConfirming(null);
    }
  };

  const statusConfig: Record<string, { color: string; text: string }> = {
    draft: { color: 'default', text: '草稿' },
    confirmed: { color: 'blue', text: '已确认' },
    completed: { color: 'green', text: '已完成' },
    cancelled: { color: 'red', text: '已取消' }
  };

  const columns = [
    { title: '赛事项目', dataIndex: 'event_name', key: 'event_name' },
    { title: '比赛场地', dataIndex: 'venue_name', key: 'venue_name' },
    { title: '裁判', dataIndex: 'referee_name', key: 'referee_name' },
    { 
      title: '开始时间', 
      dataIndex: 'start_time', 
      key: 'start_time',
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')
    },
    { 
      title: '结束时间', 
      dataIndex: 'end_time', 
      key: 'end_time',
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const s = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Schedule) => (
        <Space>
          {record.status === 'draft' && (
            <Button 
              type="primary" 
              size="small" 
              icon={<CheckCircleOutlined />}
              onClick={() => handleConfirm(record.id)}
              loading={confirming === record.id}
            >
              确认排期
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <DatePicker 
            value={selectedDate} 
            onChange={(date) => date && setSelectedDate(date)}
            style={{ width: 200 }}
          />
          <Button 
            type="primary" 
            icon={<CalendarOutlined />}
            onClick={handleGenerate}
            loading={generating}
          >
            生成当日赛程
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadSchedules}>
            刷新
          </Button>
        </Space>
        <div style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
          <p><strong>自动排期规则说明：</strong></p>
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
            <li>考虑场馆安保等级匹配</li>
            <li>考虑裁判专业资质匹配</li>
            <li>场地切换间隔至少30分钟（含观众席清理）</li>
            <li>工作时间：08:00 - 22:00</li>
          </ul>
        </div>
      </Card>

      <Table
        columns={columns}
        dataSource={schedules}
        rowKey="id"
      />
    </div>
  );
};

export default ScheduleManagement;
