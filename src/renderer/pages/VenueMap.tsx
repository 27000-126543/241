import React, { useEffect, useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Tooltip, Tag, Space, Button, Select } from 'antd';
import { EnvironmentOutlined, TeamOutlined, SafetyOutlined, ReloadOutlined } from '@ant-design/icons';
import { statisticsApi, securityZoneApi, securityPersonnelApi, alarmApi } from '../api';
import type { SecurityZone, SecurityPersonnel, Alarm } from '../types';
import ReactECharts from 'echarts-for-react';

const { Option } = Select;

const VenueMap: React.FC = () => {
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [zones, setZones] = useState<SecurityZone[]>([]);
  const [personnel, setPersonnel] = useState<SecurityPersonnel[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<number>(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [heatData, zonesData, personnelData, alarmsData] = await Promise.all([
      statisticsApi.getVenueHeatmap(),
      securityZoneApi.getAll(),
      securityPersonnelApi.getAll(),
      alarmApi.getAll()
    ]);
    setHeatmapData(heatData);
    setZones(zonesData);
    setPersonnel(personnelData);
    setAlarms(alarmsData.filter((a: any) => a.status === 'active'));
  };

  const filteredZones = zones.filter(z => z.venue_id === selectedVenue);
  const filteredHeatData = heatmapData.filter((d: any) => d.venue_id === selectedVenue);
  const filteredPersonnel = personnel.filter(p => {
    const zone = zones.find(z => z.id === p.current_zone_id);
    return zone && zone.venue_id === selectedVenue;
  });

  const totalPeople = filteredHeatData.reduce((sum: number, d: any) => sum + (d.current_people || 0), 0);
  const totalPersonnel = filteredPersonnel.filter(p => p.status === 'on_duty').length;
  const activeAlarms = alarms.filter(a => filteredZones.some(z => z.id === a.zone_id)).length;

  const heatmapOption = useMemo(() => {
    const heatPoints: any[] = [];
    const personnelPoints: any[] = [];
    const alarmPoints: any[] = [];
    const zoneLabels: any[] = [];

    filteredHeatData.forEach((zone: any) => {
      let coords;
      try {
        coords = JSON.parse(zone.coordinates);
      } catch {
        coords = { x: 0, y: 0, width: 100, height: 100 };
      }

      const utilization = zone.utilization || 0;
      const centerX = coords.x + coords.width / 2;
      const centerY = coords.y + coords.height / 2;

      const steps = 12;
      for (let i = 0; i < steps; i++) {
        for (let j = 0; j < steps; j++) {
          const px = coords.x + (coords.width / steps) * (i + 0.5);
          const py = coords.y + (coords.height / steps) * (j + 0.5);
          const dx = (px - centerX) / (coords.width / 2);
          const dy = (py - centerY) / (coords.height / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const weight = Math.max(0, utilization * (1 - dist * 0.7));
          heatPoints.push([px, py, weight]);
        }
      }

      zoneLabels.push({
        name: zone.name,
        value: [centerX, centerY],
        label: {
          show: true,
          formatter: `{b|${zone.name}}\n{c|${utilization.toFixed(0)}%}`,
          fontSize: 13,
          fontWeight: 'bold',
          color: '#fff',
          textBorderColor: 'rgba(0,0,0,0.5)',
          textBorderWidth: 2,
          lineHeight: 20,
          rich: {
            b: { fontSize: 13, color: '#fff' },
            c: { fontSize: 12, color: '#ffeb3b' }
          }
        },
        symbolSize: 0
      });

      const zoneAlarms = alarms.filter(a => a.zone_id === zone.id && a.status === 'active');
      if (zoneAlarms.length > 0) {
        alarmPoints.push({
          name: '警报',
          value: [coords.x + coords.width - 25, coords.y + 25, zoneAlarms.length],
          symbolSize: 24,
          itemStyle: { color: '#ff4d4f' },
          label: {
            show: true,
            formatter: zoneAlarms.length.toString(),
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 12
          }
        });
      }
    });

    filteredPersonnel.forEach((p, idx) => {
      const zone = zones.find(z => z.id === p.current_zone_id);
      if (zone) {
        let coords;
        try {
          coords = JSON.parse(zone.coordinates);
        } catch {
          coords = { x: 0, y: 0, width: 100, height: 100 };
        }
        personnelPoints.push({
          name: p.name,
          value: [
            coords.x + 40 + (idx % 4) * 30,
            coords.y + coords.height - 40 - Math.floor(idx / 4) * 30
          ],
          symbolSize: 20,
          itemStyle: {
            color: p.status === 'on_duty' ? '#1890ff' : '#8c8c8c',
            borderColor: '#fff',
            borderWidth: 3,
            shadowBlur: 10,
            shadowColor: 'rgba(24, 144, 255, 0.5)'
          }
        });
      }
    });

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#333',
        textStyle: { color: '#fff' },
        formatter: (params: any) => {
          if (params.seriesName === '安保人员') {
            return `<div style="padding:4px"><strong>${params.name}</strong><br/>状态: <span style="color:#52c41a">在岗</span></div>`;
          }
          if (params.seriesName === '警报') {
            return `<div style="padding:4px"><strong style="color:#ff4d4f">⚠ 警报</strong><br/>区域内有 ${params.value[2]} 条警报<br/>请及时处理</div>`;
          }
          if (params.seriesType === 'heatmap') {
            const util = params.value[2]?.toFixed(1) || 0;
            return `<div style="padding:4px"><strong>人流热度</strong><br/>密度指数: ${util}</div>`;
          }
          return '';
        }
      },
      grid: {
        left: 30,
        right: 30,
        top: 30,
        bottom: 30
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: 600,
        show: false
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 400,
        show: false,
        inverse: true
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 10,
        inRange: {
          color: [
            '#313695',
            '#4575b4',
            '#74add1',
            '#abd9e9',
            '#e0f3f8',
            '#ffffbf',
            '#fee090',
            '#fdae61',
            '#f46d43',
            '#d73027',
            '#a50026'
          ]
        },
        text: ['高', '低'],
        textStyle: { color: '#666' }
      },
      series: [
        {
          name: '人流热力',
          type: 'heatmap',
          data: heatPoints,
          pointSize: 28,
          blurSize: 35,
          minOpacity: 0.15,
          maxOpacity: 0.8
        },
        {
          name: '区域标签',
          type: 'scatter',
          data: zoneLabels,
          symbol: 'circle',
          silent: true,
          z: 5
        },
        {
          name: '安保人员',
          type: 'scatter',
          data: personnelPoints,
          symbol: 'circle',
          emphasis: { scale: 1.3 },
          z: 10
        },
        {
          name: '警报',
          type: 'scatter',
          data: alarmPoints,
          symbol: 'diamond',
          emphasis: { scale: 1.3 },
          z: 15
        }
      ]
    };
  }, [filteredHeatData, filteredPersonnel, alarms, zones]);

  const utilizationChart = {
    tooltip: { trigger: 'axis' },
    xAxis: { 
      type: 'category', 
      data: filteredHeatData.map((d: any) => d.name),
      axisLabel: { interval: 0, rotate: 30 }
    },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{
      type: 'bar',
      data: filteredHeatData.map((d: any) => ({
        value: d.utilization?.toFixed(1) || 0,
        itemStyle: {
          color: (d.utilization || 0) >= 90 ? '#ff4d4f' : 
                 (d.utilization || 0) >= 70 ? '#faad14' : '#52c41a'
        }
      })),
      label: { show: true, position: 'top', formatter: '{c}%' }
    }],
    grid: { bottom: 80 }
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <Select 
            value={selectedVenue} 
            onChange={setSelectedVenue}
            style={{ width: 200 }}
          >
            <Option value={1}>主体育场</Option>
            <Option value={2}>游泳馆</Option>
            <Option value={3}>篮球馆</Option>
            <Option value={4}>网球中心</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新数据</Button>
        </Space>

        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card>
              <Statistic
                title="当前总人数"
                value={totalPeople}
                prefix={<EnvironmentOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="在岗安保人员"
                value={totalPersonnel}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="活动警报"
                value={activeAlarms}
                prefix={<SafetyOutlined />}
                valueStyle={{ color: activeAlarms > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="监控区域"
                value={filteredZones.length}
                prefix={<EnvironmentOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col span={14}>
          <Card title="场馆热力地图 - ECharts 标准热力图">
            <ReactECharts option={heatmapOption} style={{ height: 450 }} />

            <div style={{ marginTop: 16, display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
              <Space>
                <div style={{ width: 18, height: 18, background: 'linear-gradient(135deg, #313695 0%, #a50026 100%)', borderRadius: 3 }} />
                <span>人流热力 (低→高)</span>
              </Space>
              <Space>
                <div style={{ width: 18, height: 18, background: '#1890ff', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 8px rgba(24,144,255,0.5)' }} />
                <span>安保人员 (在岗)</span>
              </Space>
              <Space>
                <div style={{ width: 18, height: 18, background: '#ff4d4f', transform: 'rotate(45deg)' }} />
                <span>警报 (需处理)</span>
              </Space>
            </div>
          </Card>
        </Col>

        <Col span={10}>
          <Card title="各区域使用率" style={{ marginBottom: 16 }}>
            <ReactECharts option={utilizationChart} style={{ height: 280 }} />
          </Card>

          <Card title="安保人员分布">
            {filteredPersonnel.map(p => (
              <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                  <Tag style={{ marginLeft: 8 }}>{p.rank}</Tag>
                </div>
                <Tag color={p.status === 'on_duty' ? 'green' : 'default'}>
                  {p.zone_name || '待命'}
                </Tag>
              </div>
            ))}
            {filteredPersonnel.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                该场馆暂无安保人员分配
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default VenueMap;
