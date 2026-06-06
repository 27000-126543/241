import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, List, Tag, Alert } from 'antd';
import {
  TrophyOutlined,
  SafetyOutlined,
  ToolOutlined,
  WarningOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { eventApi, scheduleApi, alarmApi, emergencyApi, statisticsApi } from '../api';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [eventsData, schedulesData, alarmsData, emergenciesData] = await Promise.all([
      eventApi.getAll(),
      scheduleApi.getAll(),
      alarmApi.getAll(),
      emergencyApi.getAll()
    ]);
    setEvents(eventsData);
    setSchedules(schedulesData);
    setAlarms(alarmsData.filter((a: any) => a.status === 'active'));
    setEmergencies(emergenciesData.filter((e: any) => e.status === 'active'));

    const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD HH:mm:ss');
    const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD HH:mm:ss');
    const statsData = await statisticsApi.getOverview(startOfMonth, endOfMonth);
    setStats(statsData);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'gold',
      confirmed: 'blue',
      active: 'green',
      completed: 'gray',
      preparing: 'blue',
      ongoing: 'green',
      interrupted: 'red'
    };
    return colors[status] || 'default';
  };

  const statusText: Record<string, string> = {
    pending: '待处理',
    confirmed: '已确认',
    active: '进行中',
    completed: '已完成',
    preparing: '准备中',
    ongoing: '进行中',
    interrupted: '已中断',
    draft: '草稿'
  };

  const eventByVenueChart = stats ? {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: stats.eventsByVenue.map((v: any) => v.venue) },
    yAxis: { type: 'value' },
    series: [{ data: stats.eventsByVenue.map((v: any) => v.count), type: 'bar', color: '#1890ff' }]
  } : {};

  return (
    <div>
      {alarms.length > 0 && (
        <Alert
          message={`当前有 ${alarms.length} 个活动警报需要处理`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {emergencies.length > 0 && (
        <Alert
          message={`当前有 ${emergencies.length} 个紧急事件需要处理`}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="赛事项目总数"
              value={events.length}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日赛程"
              value={schedules.filter((s: any) => dayjs(s.start_time).isSame(dayjs(), 'day')).length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活动警报"
              value={alarms.length}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="紧急事件"
              value={emergencies.length}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="各场馆赛事数量">
            <ReactECharts option={eventByVenueChart} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="今日赛程">
            <List
              dataSource={schedules.filter((s: any) => dayjs(s.start_time).isSame(dayjs(), 'day')).slice(0, 5)}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.event_name}
                    description={`${dayjs(item.start_time).format('HH:mm')} - ${dayjs(item.end_time).format('HH:mm')} | ${item.venue_name}`}
                  />
                  <Tag color={getStatusColor(item.status)}>{statusText[item.status]}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="最新警报">
            <List
              dataSource={alarms.slice(0, 5)}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.zone_name}
                    description={item.message}
                  />
                  <Tag color={item.severity === 'high' ? 'red' : 'orange'}>
                    {item.severity === 'high' ? '高危' : '中危'}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="本月统计概览">
            {stats && (
              <div style={{ padding: '16px 0' }}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic
                      title="参赛总人数"
                      value={stats.totalParticipants}
                      suffix="人"
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="票房总收入"
                      value={stats.totalRevenue}
                      prefix="¥"
                      precision={2}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="设备故障率"
                      value={stats.equipmentFailureRate.toFixed(1)}
                      suffix="%"
                      valueStyle={{ color: stats.equipmentFailureRate > 20 ? '#ff4d4f' : '#52c41a' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="观众满意度"
                      value={stats.avgSatisfaction.toFixed(1)}
                      suffix="/5"
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Col>
                </Row>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
