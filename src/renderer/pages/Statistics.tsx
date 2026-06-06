import React, { useEffect, useState } from 'react';
import { 
  Card, Row, Col, Statistic, DatePicker, Button, Space, 
  Table, Tabs, message 
} from 'antd';
import { 
  BarChartOutlined, 
  FilePdfOutlined, 
  ReloadOutlined,
  TrophyOutlined,
  DollarOutlined,
  ToolOutlined,
  SmileOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { statisticsApi, scheduleApi, equipmentApi } from '../api';
import dayjs, { Dayjs } from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const Statistics: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0].startOf('day').format('YYYY-MM-DD HH:mm:ss');
      const endDate = dateRange[1].endOf('day').format('YYYY-MM-DD HH:mm:ss');
      
      const [statsData, schedulesData, equipmentData] = await Promise.all([
        statisticsApi.getOverview(startDate, endDate),
        scheduleApi.getAll(),
        equipmentApi.getAll()
      ]);
      setStats(statsData);
      setSchedules(schedulesData);
      setEquipment(equipmentData);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    doc.setFillColor(24, 144, 255);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Sports Event Management System', centerX, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Monthly Operation Report', centerX, 30, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    let yPos = 45;
    doc.setFontSize(10);
    doc.text(`Report Generated: ${dayjs().format('YYYY-MM-DD HH:mm')}`, 14, yPos);
    doc.text(`Period: ${dateRange[0].format('YYYY-MM-DD')} - ${dateRange[1].format('YYYY-MM-DD')}`, pageWidth - 14, yPos, { align: 'right' });

    yPos += 20;
    doc.setFillColor(240, 248, 255);
    doc.rect(14, yPos - 8, pageWidth - 28, 10, 'F');
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('1. Executive Summary', 14, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 15;

    const overviewData = [
      ['Total Participants', (stats?.totalParticipants || 0).toString()],
      ['Total Revenue', `¥${(stats?.totalRevenue || 0).toFixed(2)}`],
      ['Scheduled Events', schedules.length.toString()],
      ['Equipment Failure Rate', `${(stats?.equipmentFailureRate || 0).toFixed(1)}%`],
      ['Average Satisfaction', `${(stats?.avgSatisfaction || 0).toFixed(1)} / 5.0`],
      ['Active Venues', equipment.filter((e: any) => e.status === 'normal').length.toString()]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Key Performance Indicator', 'Value']],
      body: overviewData,
      theme: 'striped',
      headStyles: { fillColor: [24, 144, 255], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 250, 255] },
      margin: { left: 14, right: 14 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(240, 248, 255);
    doc.rect(14, yPos - 8, pageWidth - 28, 10, 'F');
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('2. Events Distribution by Venue', 14, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 15;

    const venueData = stats?.eventsByVenue?.length > 0 
      ? stats?.eventsByVenue?.map((v: any) => [v.venue || 'Unknown', v.count.toString()]) 
      : [['No data', '-']];
    autoTable(doc, {
      startY: yPos,
      head: [['Venue Name', 'Number of Events', 'Percentage']],
      body: venueData.map((row: any, idx: number) => {
        const total = stats?.eventsByVenue?.reduce((s: number, v: any) => s + v.count, 0) || 1;
        const pct = ((parseInt(row[1]) / total) * 100).toFixed(1) + '%';
        return [...row, pct];
      }),
      theme: 'striped',
      headStyles: { fillColor: [82, 196, 26], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 250, 245] },
      margin: { left: 14, right: 14 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(240, 248, 255);
    doc.rect(14, yPos - 8, pageWidth - 28, 10, 'F');
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('3. Schedule Details', 14, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 15;

    const scheduleData = schedules.slice(0, 15).map(s => [
      s.event_name || '-',
      s.venue_name || '-',
      s.referee_name || '-',
      s.start_time ? dayjs(s.start_time).format('MM-DD HH:mm') : '-',
      s.status || '-'
    ]);
    if (scheduleData.length === 0) scheduleData.push(['No schedules', '-', '-', '-', '-']);

    autoTable(doc, {
      startY: yPos,
      head: [['Event', 'Venue', 'Referee', 'Time', 'Status']],
      body: scheduleData,
      theme: 'striped',
      headStyles: { fillColor: [114, 46, 209], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 245, 252] },
      margin: { left: 14, right: 14 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(240, 248, 255);
    doc.rect(14, yPos - 8, pageWidth - 28, 10, 'F');
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('4. Equipment Status Summary', 14, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 15;

    const equipData = equipment.map(e => [
      e.name || '-',
      e.venue_name || '-',
      `${e.usage_hours || 0}h`,
      e.status || '-',
      (e.usage_hours || 0) >= 500 ? 'Needs Maintenance' : 'Normal'
    ]);
    if (equipData.length === 0) equipData.push(['No equipment', '-', '-', '-', '-']);

    autoTable(doc, {
      startY: yPos,
      head: [['Equipment', 'Location', 'Usage', 'Status', 'Health Check']],
      body: equipData,
      theme: 'striped',
      headStyles: { fillColor: [250, 173, 20], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [255, 252, 240] },
      margin: { left: 14, right: 14 }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, centerX, 290, { align: 'center' });
      doc.text('Sports Event Management System © 2024', 14, 290);
      doc.text(`Generated: ${dayjs().format('YYYY-MM-DD')}`, pageWidth - 14, 290, { align: 'right' });
    }

    const pdfBase64 = doc.output('datauristring').split(',')[1];
    const result = await statisticsApi.savePdf(pdfBase64);
    
    if (result && result.success) {
      message.success(`PDF 报告已保存到: ${result.filePath}`);
      console.log('PDF SAVE CONFIRMED:', result);
    } else if (result && !result.canceled) {
      message.error('PDF 保存失败');
    }
  };

  const venueChart = stats ? {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: stats.eventsByVenue?.map((v: any) => v.venue) || [] },
    yAxis: { type: 'value' },
    series: [{ 
      data: stats.eventsByVenue?.map((v: any) => v.count) || [], 
      type: 'bar', 
      color: '#1890ff',
      label: { show: true, position: 'top' }
    }]
  } : {};

  const eventTypeChart = stats ? {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: stats.eventsByType?.map((e: any) => ({ 
        value: e.count, 
        name: e.event_name 
      })) || []
    }]
  } : {};

  const equipChart = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: equipment.map(e => e.name) },
    yAxis: { type: 'value', name: 'Hours' },
    series: [{
      data: equipment.map(e => e.usage_hours),
      type: 'bar',
      color: '#722ed1',
      label: { show: true, position: 'top' }
    }]
  };

  const scheduleColumns = [
    { title: 'Event', dataIndex: 'event_name', key: 'event_name' },
    { title: 'Venue', dataIndex: 'venue_name', key: 'venue_name' },
    { title: 'Referee', dataIndex: 'referee_name', key: 'referee_name' },
    { title: 'Start Time', dataIndex: 'start_time', key: 'start_time', render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm') },
    { title: 'Status', dataIndex: 'status', key: 'status' }
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          />
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            Refresh
          </Button>
          <Button 
            type="primary" 
            icon={<FilePdfOutlined />} 
            onClick={exportPDF}
          >
            Export PDF Report
          </Button>
        </Space>

        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Participants"
                value={stats?.totalParticipants || 0}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Revenue"
                value={stats?.totalRevenue || 0}
                prefix={<DollarOutlined />}
                precision={2}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Equipment Failure Rate"
                value={stats?.equipmentFailureRate?.toFixed(1) || 0}
                suffix="%"
                prefix={<ToolOutlined />}
                valueStyle={{ color: (stats?.equipmentFailureRate || 0) > 20 ? '#ff4d4f' : '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Audience Satisfaction"
                value={stats?.avgSatisfaction?.toFixed(1) || 0}
                suffix="/5"
                prefix={<SmileOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="charts">
        <TabPane tab="Charts Analysis" key="charts">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card title="Events by Venue">
                <ReactECharts option={venueChart} style={{ height: 350 }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Events by Type Distribution">
                <ReactECharts option={eventTypeChart} style={{ height: 350 }} />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title="Equipment Usage Hours">
                <ReactECharts option={equipChart} style={{ height: 300 }} />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Schedule Details" key="schedules">
          <Table
            columns={scheduleColumns}
            dataSource={schedules}
            rowKey="id"
            loading={loading}
          />
        </TabPane>

        <TabPane tab="Equipment Statistics" key="equipment">
          <Table
            columns={[
              { title: 'Equipment Name', dataIndex: 'name', key: 'name' },
              { title: 'Type', dataIndex: 'type', key: 'type' },
              { title: 'Venue', dataIndex: 'venue_name', key: 'venue_name' },
              { 
                title: 'Usage Hours', 
                dataIndex: 'usage_hours', 
                key: 'usage_hours',
                render: (h: number) => `${h}h`
              },
              { title: 'Status', dataIndex: 'status', key: 'status' }
            ]}
            dataSource={equipment}
            rowKey="id"
          />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Statistics;
